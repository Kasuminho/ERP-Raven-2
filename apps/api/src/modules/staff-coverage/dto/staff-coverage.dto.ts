import { LeadershipArea } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpsertStaffAreaCoverageDto {
  @IsEnum(LeadershipArea) area!: LeadershipArea;
  @IsOptional() @IsString() @MaxLength(80) primaryUserId?: string;
  @IsOptional() @IsString() @MaxLength(80) backupUserId?: string;
  @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) onCallStartsAt!: string;
  @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) onCallEndsAt!: string;
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)*$/)
  timezone!: string;
}

export class CreateStaffAvailabilityDto {
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}
