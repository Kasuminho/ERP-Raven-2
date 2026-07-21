import { PlaybookLessonDisposition } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

class RoleInstructionDto {
  @IsString() @MinLength(2) @MaxLength(40) roleKey!: string;
  @IsString() @MinLength(2) @MaxLength(120) titlePt!: string;
  @IsString() @MinLength(2) @MaxLength(120) titleEn!: string;
  @IsString() @MinLength(3) @MaxLength(2000) bodyPt!: string;
  @IsString() @MinLength(3) @MaxLength(2000) bodyEn!: string;
}
export class CreatePlaybookVersionDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(80)
  key?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) contentType?: string;
  @IsString() @MinLength(3) @MaxLength(2000) objectivePt!: string;
  @IsString() @MinLength(3) @MaxLength(2000) objectiveEn!: string;
  @IsString() @MinLength(3) @MaxLength(5000) publicBriefPt!: string;
  @IsString() @MinLength(3) @MaxLength(5000) publicBriefEn!: string;
  @IsOptional() @IsString() @MaxLength(8000) staffNotes?: string;
  @IsArray() @ArrayMaxSize(50) compositionTarget!: string[];
  @IsArray() @ArrayMaxSize(50) positioning!: string[];
  @IsArray() @ArrayMaxSize(50) calls!: string[];
  @IsArray() @ArrayMaxSize(50) risks!: string[];
  @IsArray() @ArrayMaxSize(50) links!: string[];
  @IsArray() @ArrayMaxSize(100) checklist!: string[];
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RoleInstructionDto)
  roleInstructions!: RoleInstructionDto[];
}
export class AssignPlaybookDto {
  @IsString() versionId!: string;
  @IsOptional() @IsString() eventId?: string;
  @IsOptional() @IsString() operationId?: string;
}
export class DecidePlaybookLessonDto {
  @IsString() operationId!: string;
  @IsString() @MaxLength(120) sourceKey!: string;
  @IsOptional() @IsString() playbookId?: string;
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsString() @MinLength(3) @MaxLength(2000) lessonPt!: string;
  @IsString() @MinLength(3) @MaxLength(2000) lessonEn!: string;
  @IsEnum(PlaybookLessonDisposition) disposition!: PlaybookLessonDisposition;
  @IsString() ownerId!: string;
  @IsDateString() reviewAt!: string;
}
export class ConfirmPlaybookInstructionDto {
  @IsBoolean() confirm!: boolean;
}
