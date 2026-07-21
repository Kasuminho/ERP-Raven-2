import { CommunicationChannel, DigestCadence } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
export class UpdateCommunicationPreferenceDto {
  @IsEnum(CommunicationChannel) eventChannel!: CommunicationChannel;
  @IsEnum(CommunicationChannel) ownLootChannel!: CommunicationChannel;
  @IsEnum(CommunicationChannel) requestChannel!: CommunicationChannel;
  @IsEnum(CommunicationChannel) progressChannel!: CommunicationChannel;
  @IsEnum(CommunicationChannel) announcementChannel!: CommunicationChannel;
  @IsEnum(CommunicationChannel) reminderChannel!: CommunicationChannel;
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  quietStartsAt?: string;
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  quietEndsAt?: string;
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)*$/)
  timezone!: string;
  @IsEnum(DigestCadence) digestCadence!: DigestCadence;
  @IsBoolean() criticalBypassesQuietHours!: boolean;
}
