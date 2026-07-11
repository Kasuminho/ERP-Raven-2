import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class OverrideReviewAlertDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  alertKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  playerId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
