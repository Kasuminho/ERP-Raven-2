import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateGuildPolicyDraftDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  titlePt!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  titleEn!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1200)
  summaryPt!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1200)
  summaryEn!: string;

  @IsISO8601({ strict: true })
  effectiveAt!: string;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  @ValidateIf((dto: CreateGuildPolicyDraftDto) => dto.isEmergency === true || dto.emergencyReason !== undefined)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  emergencyReason?: string;
}

export class UpdateGuildPolicyDraftDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  titlePt?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1200)
  summaryPt?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1200)
  summaryEn?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  effectiveAt?: string;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  @ValidateIf((dto: UpdateGuildPolicyDraftDto) => dto.isEmergency === true || dto.emergencyReason !== undefined)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  emergencyReason?: string;
}
