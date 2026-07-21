import { GuildCaseCategory, GuildCaseSeverity, GuildCaseStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateGuildCaseDto {
  @IsEnum(GuildCaseCategory)
  category!: GuildCaseCategory;

  @IsOptional()
  @IsEnum(GuildCaseSeverity)
  severity?: GuildCaseSeverity;

  @IsString()
  @MinLength(5)
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(4000)
  description!: string;
}

export class AddGuildCaseMessageDto {
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  message!: string;
}

export class TriageGuildCaseDto {
  @IsOptional()
  @IsEnum(GuildCaseStatus)
  status?: GuildCaseStatus;

  @IsOptional()
  @IsEnum(GuildCaseSeverity)
  severity?: GuildCaseSeverity;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  internalNote?: string;
}

export class RespondGuildCaseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  bodyPt!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  bodyEn!: string;

  @IsOptional()
  @IsBoolean()
  resolve?: boolean;
}

export class ListGuildCasesQueryDto {
  @IsOptional()
  @IsEnum(GuildCaseStatus)
  status?: GuildCaseStatus;
}
