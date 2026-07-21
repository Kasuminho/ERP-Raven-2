import { OnboardingCompletionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsEnum, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateOnboardingTemplateStepDto {
  @IsString()
  @Matches(/^[A-Z0-9_]{2,40}$/)
  key!: string;

  @IsString() @MinLength(3) @MaxLength(120)
  titlePt!: string;

  @IsString() @MinLength(3) @MaxLength(120)
  titleEn!: string;

  @IsString() @MinLength(3) @MaxLength(600)
  descriptionPt!: string;

  @IsString() @MinLength(3) @MaxLength(600)
  descriptionEn!: string;

  @IsString()
  @Matches(/^\/dashboard(?:\/|$)/)
  @MaxLength(200)
  href!: string;

  @IsBoolean()
  isRequired!: boolean;

  @IsEnum(OnboardingCompletionType)
  completionType!: OnboardingCompletionType;

  @IsInt() @Min(0) @Max(100)
  displayOrder!: number;
}

export class CreateOnboardingTemplateDto {
  @IsString() @MinLength(3) @MaxLength(120)
  name!: string;

  @IsInt() @Min(1) @Max(180)
  dueDays!: number;

  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateOnboardingTemplateStepDto)
  steps!: CreateOnboardingTemplateStepDto[];
}
