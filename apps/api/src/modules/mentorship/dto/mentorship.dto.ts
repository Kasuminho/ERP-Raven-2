import {
  MentorshipHelpStatus,
  MentorshipHelpTopic,
  MentorshipStatus,
  PlayerCombatRole,
} from "@prisma/client";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateMentorProfileDto {
  @IsBoolean() isAvailable!: boolean;
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(MentorshipHelpTopic, { each: true })
  topics!: MentorshipHelpTopic[];
  @IsArray()
  @ArrayMaxSize(7)
  @IsEnum(PlayerCombatRole, { each: true })
  roles!: PlayerCombatRole[];
  @IsOptional() @IsString() @MaxLength(500) notePt?: string;
  @IsOptional() @IsString() @MaxLength(500) noteEn?: string;
}

export class CreateMentorshipHelpRequestDto {
  @IsEnum(MentorshipHelpTopic) topic!: MentorshipHelpTopic;
  @IsOptional() @IsEnum(PlayerCombatRole) requestedRole?: PlayerCombatRole;
  @IsOptional() @IsString() @MaxLength(1000) body?: string;
}

export class AssignMentorshipDto {
  @IsString() @MinLength(1) @MaxLength(80) menteeId!: string;
  @IsOptional() @IsString() @MaxLength(80) mentorId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) groupName?: string;
}

export class UpdateMentorshipDto {
  @IsEnum(MentorshipStatus) status!: MentorshipStatus;
}

export class TriageMentorshipHelpDto {
  @IsEnum(MentorshipHelpStatus) status!: MentorshipHelpStatus;
  @IsOptional() @IsString() @MaxLength(80) assignedMentorId?: string;
}
