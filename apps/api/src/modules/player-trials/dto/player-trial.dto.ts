import { PlayerTrialDecisionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CreatePlayerTrialCriterionDto {
  @IsString() @Matches(/^[A-Z0-9_]{2,40}$/)
  key!: string;

  @IsString() @MinLength(3) @MaxLength(120)
  titlePt!: string;

  @IsString() @MinLength(3) @MaxLength(120)
  titleEn!: string;

  @IsString() @MinLength(3) @MaxLength(800)
  descriptionPt!: string;

  @IsString() @MinLength(3) @MaxLength(800)
  descriptionEn!: string;

  @IsBoolean()
  isRequired!: boolean;

  @IsInt() @Min(0) @Max(100)
  displayOrder!: number;
}

export class CreatePlayerTrialDto {
  @IsString() @MinLength(1) @MaxLength(80)
  playerId!: string;

  @IsString() @MinLength(3) @MaxLength(1000)
  objectivePt!: string;

  @IsString() @MinLength(3) @MaxLength(1000)
  objectiveEn!: string;

  @IsDateString()
  plannedStartAt!: string;

  @IsDateString()
  plannedEndAt!: string;

  @ArrayMinSize(1) @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreatePlayerTrialCriterionDto)
  criteria!: CreatePlayerTrialCriterionDto[];
}

export class CompletePlayerTrialCheckInDto {
  @IsString() @MinLength(3) @MaxLength(2000)
  bodyPt!: string;

  @IsString() @MinLength(3) @MaxLength(2000)
  bodyEn!: string;

  @IsOptional() @IsString() @MaxLength(3000)
  internalNote?: string;
}

export class DecidePlayerTrialDto {
  @IsEnum(PlayerTrialDecisionType)
  decision!: PlayerTrialDecisionType;

  @IsString() @MinLength(3) @MaxLength(2000)
  reasonPt!: string;

  @IsString() @MinLength(3) @MaxLength(2000)
  reasonEn!: string;

  @IsOptional() @IsDateString()
  extendedEndAt?: string;
}
