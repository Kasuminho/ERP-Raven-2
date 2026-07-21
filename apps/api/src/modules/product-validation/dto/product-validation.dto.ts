import {
  ProductValidationAbsenceVisibility,
  ProductValidationInterviewProfile,
} from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateProductValidationInterviewDto {
  @IsEnum(ProductValidationInterviewProfile)
  profile!: ProductValidationInterviewProfile;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsIn(["DISCORD", "WEB", "WHATSAPP", "VOICE", "OTHER"], { each: true })
  channels!: string[];

  @IsEnum(ProductValidationAbsenceVisibility)
  absenceVisibility!: ProductValidationAbsenceVisibility;

  @IsBoolean()
  rsvpWouldReduceManualCharge!: boolean;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  summary!: string;

  @IsDateString()
  interviewedAt!: string;
}

export class CaptureProductValidationWeekDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  expectedAttendance?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  staffConfirmationMinutes!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}
