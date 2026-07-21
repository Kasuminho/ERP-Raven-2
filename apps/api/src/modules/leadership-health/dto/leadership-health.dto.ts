import { LeadershipArea } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
export class CreateLeadershipCheckInDto {
  @IsEnum(LeadershipArea) area!: LeadershipArea;
  @IsInt() @Min(1) @Max(5) workload!: number;
  @IsBoolean() availableOnCall!: boolean;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
