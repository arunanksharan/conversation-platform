import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
