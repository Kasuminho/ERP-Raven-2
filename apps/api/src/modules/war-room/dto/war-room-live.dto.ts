import { WarRoomTimelineEventType } from '@prisma/client';
import { IsEnum, IsISO8601, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWarRoomTimelineEventDto {
  @IsEnum(WarRoomTimelineEventType)
  type!: WarRoomTimelineEventType;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
