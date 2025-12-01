import { IsString, IsOptional } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;
}
