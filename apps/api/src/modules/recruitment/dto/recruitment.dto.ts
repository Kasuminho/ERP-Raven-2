import { PlayerClass, RecruitmentApplicationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRecruitmentApplicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nickname!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  discordTag?: string;

  @IsEnum(PlayerClass)
  playerClass!: PlayerClass;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999999999)
  combatPower!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  dimensionalLayer!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(240)
  availability!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  focus!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  experience!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proofImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsBoolean()
  rulesAccepted!: boolean;
}

export class ReviewRecruitmentApplicationDto {
  @IsEnum(RecruitmentApplicationStatus)
  status!: RecruitmentApplicationStatus;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reviewNote!: string;
}

export class ConvertRecruitmentApplicationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  userId!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nickname?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  onboardingNote!: string;
}
