import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import OpenAI from 'openai';
import { LlmConfig } from '../../config/types';

// Define ChatRole locally to avoid Prisma client dependency
type ChatRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
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
}
