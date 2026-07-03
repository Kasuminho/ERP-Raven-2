import { EventType } from '@prisma/client';
import { ArrayMaxSize, ArrayUnique, IsArray, IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  type!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsISO8601()
  eventTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  channelId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  mentionRoleId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsEnum(EventType, { each: true })
  attendanceEventTypes?: EventType[];
}
