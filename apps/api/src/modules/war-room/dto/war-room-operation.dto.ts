import { WarRoomOperationPriority, WarRoomOperationStatus, WarRoomOperationType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class WarRoomInternalLinkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  href!: string;
}

export class CreateWarRoomOperationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  name!: string;

  @IsEnum(WarRoomOperationType)
  type!: WarRoomOperationType;

  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;

  @IsOptional()
  @IsEnum(WarRoomOperationPriority)
  priority?: WarRoomOperationPriority;

  @IsOptional()
  @IsEnum(WarRoomOperationStatus)
  status?: WarRoomOperationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mapRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  staffNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  result?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarRoomInternalLinkDto)
  internalLinks?: WarRoomInternalLinkDto[];

  @IsOptional()
  @IsUUID()
  eventId?: string;
}

export class UpdateWarRoomOperationDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(WarRoomOperationType)
  type?: WarRoomOperationType;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsEnum(WarRoomOperationPriority)
  priority?: WarRoomOperationPriority;

  @IsOptional()
  @IsEnum(WarRoomOperationStatus)
  status?: WarRoomOperationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mapRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  staffNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  result?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarRoomInternalLinkDto)
  internalLinks?: WarRoomInternalLinkDto[];

  @IsOptional()
  @IsUUID()
  eventId?: string;
}

export class WarRoomOperationParamDto {
  @IsUUID()
  operationId!: string;
}

export class CloseWarRoomOperationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  result?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  score?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  improvementNotes?: string;
}
