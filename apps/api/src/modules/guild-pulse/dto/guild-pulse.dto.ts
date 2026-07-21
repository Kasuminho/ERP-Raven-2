import { GuildPulseModerationStatus, GuildPulseStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
export class CreateGuildPulseDto {
  @IsString() @MinLength(3) @MaxLength(120) titlePt!: string;
  @IsString() @MinLength(3) @MaxLength(120) titleEn!: string;
  @IsDateString() opensAt!: string;
  @IsDateString() closesAt!: string;
  @IsInt() @Min(3) @Max(50) minGroupSize!: number;
  @IsInt() @Min(1) @Max(90) openTextDays!: number;
}
export class SetGuildPulseStatusDto {
  @IsEnum(GuildPulseStatus) status!: GuildPulseStatus;
}
export class SubmitGuildPulseDto {
  @IsInt() @Min(1) @Max(5) belonging!: number;
  @IsInt() @Min(1) @Max(5) clarity!: number;
  @IsInt() @Min(1) @Max(5) workload!: number;
  @IsInt() @Min(1) @Max(5) fun!: number;
  @IsInt() @Min(1) @Max(5) helpSafety!: number;
  @IsOptional() @IsString() @MaxLength(1000) openText?: string;
}
export class ModerateGuildPulseDto {
  @IsEnum(GuildPulseModerationStatus) status!: GuildPulseModerationStatus;
}
