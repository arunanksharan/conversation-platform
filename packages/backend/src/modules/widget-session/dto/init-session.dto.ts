import { IsString, IsOptional, IsUrl, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Metadata for medical extraction configuration
 */
export class ExtractionMetadataDto {
  @ApiPropertyOptional({
    description: 'JSON Schema for extracting form fields',
    example: { type: 'object', properties: { age: { type: 'integer' } } },
  })
  @IsOptional()
  @IsObject()
  formSchema?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Type of form for extraction (e.g., "sts", "euroscore")',
    example: 'sts',
  })
  @IsOptional()
  @IsString()
  formType?: string;

  @ApiPropertyOptional({ description: 'User ID from the host application' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class InitSessionDto {
  @ApiProperty({ description: 'The project ID of the app', example: 'demo-support-widget' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Unique identifier for this widget instance', example: 'widget-abc123' })
  @IsString()
  widgetInstanceId: string;

  @ApiPropertyOptional({ description: 'External user ID from your system', example: 'user-123' })
  @IsOptional()
  @IsString()
  externalUserId?: string;

  @ApiPropertyOptional({ description: 'Current page URL where widget is embedded', example: 'https://example.com/support' })
  @IsOptional()
  @IsUrl()
  pageUrl?: string;

  @ApiPropertyOptional({ description: 'Origin of the host page', example: 'https://example.com' })
  @IsOptional()
  @IsString()
  hostOrigin?: string;

  @ApiPropertyOptional({ description: 'User agent string', example: 'Mozilla/5.0...' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'User locale', example: 'en-US' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata including medical extraction configuration',
    type: ExtractionMetadataDto,
  })
  @IsOptional()
  @IsObject()
  metadata?: ExtractionMetadataDto;
}
