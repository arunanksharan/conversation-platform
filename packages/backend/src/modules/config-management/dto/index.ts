import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { AppConfigData } from '../../../config/types';

export class CreateConfigDto implements Partial<AppConfigData> {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsObject()
  features: any;

  @IsObject()
  uiTheme: any;

  @IsObject()
  llmConfig: any;

  @IsObject()
  voiceConfig: any;
}
