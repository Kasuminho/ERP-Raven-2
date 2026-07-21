import { EventReminderChannel } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePlayerPreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsIn(['pt', 'en', 'es'])
  locale?: string;

  @IsOptional()
  @IsEnum(EventReminderChannel)
  eventReminderChannel?: EventReminderChannel;
}
