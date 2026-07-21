import { LeadershipArea } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateStaffAutomationDryRunDto {
  @IsString() @MinLength(3) @MaxLength(120) name!: string;
  @IsString() @MinLength(3) @MaxLength(180) sourcePattern!: string;
  @IsString() @MinLength(3) @MaxLength(160) taskTitle!: string;
  @IsString() @MinLength(3) @MaxLength(1200) taskDescription!: string;
  @IsEnum(LeadershipArea) taskArea!: LeadershipArea;
  @IsString()
  @Matches(/^\/dashboard(?:\/|$)/)
  @MaxLength(300)
  taskHref!: string;
  @IsInt() @Min(60) @Max(10080) frequencyMinutes!: number;
  @IsInt() @Min(1) @Max(24) maxRunsPerDay!: number;
}

export class ConfirmStaffAutomationDto {
  @IsBoolean() confirm!: boolean;
}

export class SetStaffAutomationKillSwitchDto {
  @IsBoolean() killSwitch!: boolean;
}
