import { PlayerAbsenceReasonVisibility } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertPlayerAbsenceDto {
  @IsDateString({ strict: true })
  startsAt!: string;

  @IsDateString({ strict: true })
  endsAt!: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value)
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsEnum(PlayerAbsenceReasonVisibility)
  reasonVisibility?: PlayerAbsenceReasonVisibility;
}
