/**
 * ExtractionService - Medical Field Extraction using OpenAI Function Calling
 *
 * This service converts form schemas (JSON Schema) into OpenAI function tools
 * and extracts structured medical data from conversation messages.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';

export interface FormSchema {
  type: string;
  title?: string;
  description?: string;
  properties: Record<string, FieldSchema>;
  required?: string[];
}

export interface FieldSchema {
  type: string;
  title?: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  medicalTerms?: string[];
  fieldId?: string;
}

export interface ExtractionResult {
  extractionId: string;
  fields: ExtractedField[];
  status: 'partial' | 'complete';
  confidence: number;
  rawToolCall?: unknown;
}

export interface ExtractedField {
  fieldName: string;
  value: unknown;
  confidence: number;
  source?: string;
}

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - extraction disabled');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Convert a JSON Schema form definition to OpenAI function tool format
   */
  schemaToFunctionTool(
    formSchema: FormSchema,
    formType: string,
  ): ChatCompletionTool {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [fieldName, fieldDef] of Object.entries(
      formSchema.properties || {},
    )) {
      let prop: Record<string, unknown>;

      // Handle array types by unwrapping items (for STS-style schemas)
      if (fieldDef.type === 'array' && (fieldDef as any).items) {
        const items = (fieldDef as any).items;
        prop = {
          type: items.type === 'string' ? 'string' : this.mapJsonSchemaType(items.type || 'string'),
        };
        // For arrays with enum items, use the enum from items
        if (items.enum && Array.isArray(items.enum)) {
          prop.enum = items.enum;
        }
      } else {
        // Regular non-array field
        prop = {
          type: this.mapJsonSchemaType(fieldDef.type),
        };
        // Add enum values for non-array fields
        if (fieldDef.enum) {
          prop.enum = fieldDef.enum;
        }
      }

      // Add description with medical terms for better extraction
      const descriptions: string[] = [];
      if (fieldDef.title) descriptions.push(fieldDef.title);
      if (fieldDef.description) descriptions.push(fieldDef.description);
      if (fieldDef.medicalTerms?.length) {
        descriptions.push(`Also known as: ${fieldDef.medicalTerms.join(', ')}`);
      }
      if (descriptions.length > 0) {
        prop.description = descriptions.join('. ');
      }



      // Add numeric constraints
      if (fieldDef.minimum !== undefined) {
        prop.minimum = fieldDef.minimum;
      }
      if (fieldDef.maximum !== undefined) {
        prop.maximum = fieldDef.maximum;
      }

      properties[fieldName] = prop;
    }

    // Add required fields
    if (formSchema.required) {
      required.push(...formSchema.required);
    }

    return {
      type: 'function',
      function: {
        name: `extract_${formType}_fields`,
        description: `Extract medical fields for ${formType.toUpperCase()} risk calculation from the patient information provided. Only extract fields that are explicitly mentioned or can be confidently inferred. Include a confidence score (0-1) for each extracted field.`,
        parameters: {
          type: 'object',
          properties: {
            extracted_fields: {
              type: 'object',
              description: 'The extracted field values',
              properties,
              required: [],
            },
            confidence_scores: {
              type: 'object',
              description:
                'Confidence score (0-1) for each extracted field. 1.0 = explicitly stated, 0.7-0.9 = strongly implied, 0.5-0.7 = inferred',
              additionalProperties: { type: 'number', minimum: 0, maximum: 1 },
            },
            extraction_notes: {
              type: 'string',
              description:
                'Any notes about the extraction, uncertainties, or fields that need clarification',
            },
          },
          required: ['extracted_fields', 'confidence_scores'],
        },
      },
    };
  }

  /**
   * Map JSON Schema types to OpenAI function parameter types
   */
  private mapJsonSchemaType(jsonSchemaType: string): string {
    const typeMap: Record<string, string> = {
      integer: 'integer',
      number: 'number',
      string: 'string',
      boolean: 'boolean',
      array: 'array',
      object: 'object',
    };
    return typeMap[jsonSchemaType] || 'string';
  }

  /**
   * Extract fields from a conversation using OpenAI function calling
   */
  async extractFields(
    messages: ChatCompletionMessageParam[],
    formSchema: FormSchema,
    formType: string,
    llmConfig?: { model?: string; temperature?: number },
  ): Promise<ExtractionResult> {
    const extractionId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const tool = this.schemaToFunctionTool(formSchema, formType);

      // Build extraction prompt
      const systemPrompt = `You are a medical data extraction assistant specializing in ${formType.toUpperCase()} risk assessment.
Your task is to extract relevant medical fields from the conversation.

IMPORTANT GUIDELINES:
1. Only extract fields that are explicitly mentioned or can be confidently inferred
2. Assign confidence scores: 1.0 for explicitly stated values, 0.7-0.9 for strongly implied, 0.5-0.7 for inferred
3. Do not make assumptions about missing data - leave fields unextracted if not mentioned
4. Convert values to the appropriate format (e.g., "65 years old" → 65 for age)
5. For categorical fields, map to the closest valid enum value
6. Note any ambiguities or fields requiring clarification`;

      const extractionMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages,
        {
          role: 'user',
          content:
            'Based on the conversation above, extract all relevant medical fields for the risk calculation. Use the extract function to provide structured data.',
        },
      ];

      const response = await this.openai.chat.completions.create({
        model: llmConfig?.model || 'gpt-4-turbo',
        messages: extractionMessages,
        tools: [tool],
        tool_choice: { type: 'function', function: { name: tool.function.name } },
        temperature: llmConfig?.temperature || 0.1, // Low temperature for consistent extraction
      });

      const toolCall = response.choices[0]?.message?.tool_calls?.[0];

      if (!toolCall || toolCall.type !== 'function') {
        this.logger.warn('No tool call in extraction response');
        return {
          extractionId,
          fields: [],
          status: 'partial',
          confidence: 0,
        };
      }

      // Parse the function arguments
      const args = JSON.parse(toolCall.function.arguments);
      const extractedFields = args.extracted_fields || {};
      const confidenceScores = args.confidence_scores || {};

      // Build field results
      const fields: ExtractedField[] = [];
      for (const [fieldName, value] of Object.entries(extractedFields)) {
        if (value !== null && value !== undefined && value !== '') {
          fields.push({
            fieldName,
            value,
            confidence: confidenceScores[fieldName] || 0.5,
          });
        }
      }

      // Calculate overall confidence
      const avgConfidence =
        fields.length > 0
          ? fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length
          : 0;

      this.logger.log(
        `Extracted ${fields.length} fields with avg confidence ${avgConfidence.toFixed(2)}`,
      );

      return {
        extractionId,
        fields,
        status: fields.length > 0 ? 'complete' : 'partial',
        confidence: avgConfidence,
        rawToolCall: args,
      };
    } catch (error) {
      this.logger.error('Extraction failed:', error);
      return {
        extractionId,
        fields: [],
        status: 'partial',
        confidence: 0,
      };
    }
  }

  /**
   * Extract fields incrementally from a single message
   * This is useful for real-time extraction as the user types
   */
  async extractFromMessage(
    userMessage: string,
    previousExtractions: ExtractedField[],
    formSchema: FormSchema,
    formType: string,
  ): Promise<ExtractionResult> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Add context about previous extractions
    if (previousExtractions.length > 0) {
      const prevContext = previousExtractions
        .map((f) => `${f.fieldName}: ${f.value} (confidence: ${f.confidence})`)
        .join('\n');

      messages.unshift({
        role: 'system',
        content: `Previously extracted fields:\n${prevContext}\n\nExtract any NEW or UPDATED fields from the following message.`,
      });
    }

    return this.extractFields(messages, formSchema, formType);
  }
}
