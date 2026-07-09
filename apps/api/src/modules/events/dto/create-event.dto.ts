import { EventType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

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
