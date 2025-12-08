import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import OpenAI from 'openai';
import { LlmConfig } from '../../config/types';
import {
  ExtractionService,
  ExtractionResult,
  FormSchema,
  ExtractedField,
} from '../extraction/extraction.service';

// Define ChatRole locally to avoid Prisma client dependency
type ChatRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface SessionWithExtraction {
  id: string;
  app: {
    configs: Array<{ llmConfig: unknown }>;
    promptProfiles: Array<{ kind: string; isDefault: boolean; content: string }>;
  };
  metadata?: {
    formSchema?: FormSchema;
    formType?: string;
    extractedFields?: ExtractedField[];
  };
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private extractionService: ExtractionService,
  ) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set - LLM features will not work');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Save a chat message to database
   */
  async saveMessage(sessionId: string, role: ChatRole, content: string) {
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
      },
    });
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Generate streaming LLM response
   */
  async generateStreamingResponse(
    session: any,
    userMessage: string,
    onToken: (token: string) => Promise<void>,
    onComplete: (fullContent: string) => Promise<void>,
  ): Promise<void> {
    try {
      // Get app config
      const config = session.app.configs[0];
      const llmConfig = config.llmConfig as any as LlmConfig;

      // Get system prompt
      const systemPrompt = this.getSystemPrompt(session);

      // Get chat history
      const history = await this.getChatHistory(session.id);

      // Build messages for OpenAI
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...history.slice(-10).map((msg) => ({
          role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        {
          role: 'user',
          content: userMessage,
        },
      ];

      // Call OpenAI with streaming
      const stream = await this.openai.chat.completions.create({
        model: llmConfig.model || 'gpt-4-turbo',
        messages,
        temperature: llmConfig.temperature || 0.7,
        max_tokens: llmConfig.maxTokens || 2000,
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          await onToken(delta);
        }
      }

      // Call completion callback
      await onComplete(fullContent);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`LLM generation failed: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Get system prompt for session
   */
  private getSystemPrompt(session: any): string {
    // Get default system prompt from app's prompt profiles
    const systemPromptProfile = session.app.promptProfiles.find(
      (p: any) => p.kind === 'SYSTEM' && p.isDefault,
    );

    if (systemPromptProfile) {
      return systemPromptProfile.content;
    }

    // Fallback to generic system prompt
    return `You are a helpful AI assistant. Be concise, friendly, and accurate in your responses.`;
  }

  /**
   * Extract medical fields from the conversation
   * This is called after each message to incrementally extract data
   */
  async extractMedicalFields(
    session: SessionWithExtraction,
    userMessage: string,
  ): Promise<ExtractionResult | null> {
    // Check if session has extraction configuration
    const metadata = session.metadata;
    if (!metadata?.formSchema || !metadata?.formType) {
      this.logger.debug('No extraction config in session metadata');
      return null;
    }

    try {
      // Get chat history for context
      const history = await this.getChatHistory(session.id);

      // Build messages for extraction
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = history
        .slice(-10)
        .map((msg) => ({
          role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
          content: msg.content,
        }));

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage,
      });

      // Get LLM config
      const config = session.app.configs[0];
      const llmConfig = config?.llmConfig as LlmConfig | undefined;

      // Run extraction
      const result = await this.extractionService.extractFields(
        messages,
        metadata.formSchema,
        metadata.formType,
        llmConfig ? { model: llmConfig.model, temperature: 0.1 } : undefined,
      );

      this.logger.log(
        `Extracted ${result.fields.length} fields for ${metadata.formType}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Field extraction failed:', error);
      return null;
    }
  }

  /**
   * Check if session has extraction enabled
   * Uses 'any' type to handle both Prisma-returned sessions and typed sessions
   */
  hasExtractionEnabled(session: { metadata?: any }): boolean {
    const metadata = session.metadata as SessionWithExtraction['metadata'];
    return !!(metadata?.formSchema && metadata?.formType);
  }
}
