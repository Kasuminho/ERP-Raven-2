import { EventOperationalCategory, EventType, WarRoomOperationPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { EventCompositionTargetDto } from './event-composition-target.dto';

export class CreateEventSeriesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsEnum(EventType)
  type!: EventType;

  @IsISO8601()
  firstStartsAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(1440)
  durationMinutes!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  intervalWeeks?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(365)
  horizonDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsEnum(EventOperationalCategory)
  operationalCategory?: EventOperationalCategory;

  @IsOptional()
  @IsEnum(WarRoomOperationPriority)
  priority?: WarRoomOperationPriority;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  exceptionDates?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventCompositionTargetDto)
  compositionTargets?: EventCompositionTargetDto[];
}

export class UpdateEventSeriesExceptionsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  exceptionDates!: string[];
}
