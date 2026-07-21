import {
  LeadershipArea,
  StaffTaskPriority,
  StaffTaskStatus,
} from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
export class CreateStaffTaskDto {
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsString() @MinLength(3) @MaxLength(1200) description!: string;
  @IsEnum(LeadershipArea) area!: LeadershipArea;
  @IsEnum(StaffTaskPriority) priority!: StaffTaskPriority;
  @IsOptional() @IsString() @MaxLength(80) ownerId?: string;
  @IsOptional() @IsString() @MaxLength(80) substituteId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsString() @Matches(/^\/dashboard(?:\/|$)/) @MaxLength(300) href!: string;
  @IsOptional() @IsString() @MaxLength(80) sourceType?: string;
  @IsOptional() @IsString() @MaxLength(240) sourceKey?: string;
}
export class UpdateStaffTaskDto {
  @IsOptional() @IsEnum(StaffTaskStatus) status?: StaffTaskStatus;
  @IsOptional() @IsEnum(StaffTaskPriority) priority?: StaffTaskPriority;
  @IsOptional() @IsString() @MaxLength(80) ownerId?: string;
  @IsOptional() @IsString() @MaxLength(80) substituteId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
}
export class CreateStaffTaskHandoffDto {
  @IsString() @MinLength(3) @MaxLength(2000) context!: string;
  @IsString() @MinLength(3) @MaxLength(1000) nextStep!: string;
  @IsOptional() @IsString() @MaxLength(80) toOwnerId?: string;
}
