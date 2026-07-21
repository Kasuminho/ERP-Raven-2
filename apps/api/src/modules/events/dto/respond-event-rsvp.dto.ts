import { EventRsvpNoteVisibility, EventRsvpStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondEventRsvpDto {
  @IsEnum(EventRsvpStatus)
  status!: EventRsvpStatus;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value)
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsEnum(EventRsvpNoteVisibility)
  noteVisibility?: EventRsvpNoteVisibility;
}
