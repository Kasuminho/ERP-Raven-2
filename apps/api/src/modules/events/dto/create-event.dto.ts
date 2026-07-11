import { EventOperationalCategory, EventType, WarRoomOperationPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class EventChecklistItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  detail?: string;

  @IsOptional()
  @IsBoolean()
  checked?: boolean;
}

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsEnum(EventType)
  type!: EventType;

  @IsISO8601()
  startsAt!: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsEnum(EventOperationalCategory)
  operationalCategory?: EventOperationalCategory;

  @IsOptional()
  @IsEnum(WarRoomOperationPriority)
  priority?: WarRoomOperationPriority;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  operationalNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventChecklistItemDto)
  checklist?: EventChecklistItemDto[];

  @IsOptional()
  @IsUUID()
  createdById?: string;

  @IsOptional()
  @IsUUID()
  attendanceBatchId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  batchOrder?: number;
}
