import { IsString, IsEnum, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreatePromptDto {
  @IsString()
  name: string;

  @IsEnum(['SYSTEM', 'PRE_MESSAGE', 'POST_MESSAGE', 'TOOL_DESCRIPTION'])
  kind: 'SYSTEM' | 'PRE_MESSAGE' | 'POST_MESSAGE' | 'TOOL_DESCRIPTION';

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  variables?: any;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
