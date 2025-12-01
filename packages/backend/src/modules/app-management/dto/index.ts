import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateAppDto {
  @IsString()
  tenantId: string;

  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  projectId: string;
}

export class UpdateAppDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
