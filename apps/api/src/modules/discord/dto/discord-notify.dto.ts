import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export type DiscordNotificationType =
  | 'AUCTION_CREATED'
  | 'AUCTION_ENDING_SOON'
  | 'BID_OUTBID'
  | 'AUCTION_WINNER'
  | 'ATTENDANCE_STARTED'
  | 'EVENT_FINALIZED'
  | 'STAFF_REVIEW_REQUIRED';

export class DiscordNotifyDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{2,60}$/)
  type!: DiscordNotificationType;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  targetId?: string;

  @ValidateIf((dto: DiscordNotifyDto) => !isKnownNotificationType(dto.type) || dto.channelId !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  channelId?: string;

  @ValidateIf((dto: DiscordNotifyDto) => !isKnownNotificationType(dto.type) || dto.message !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

function isKnownNotificationType(type: string): boolean {
  return [
    'AUCTION_CREATED',
    'AUCTION_ENDING_SOON',
    'BID_OUTBID',
    'AUCTION_WINNER',
    'ATTENDANCE_STARTED',
    'EVENT_FINALIZED',
    'STAFF_REVIEW_REQUIRED',
  ].includes(type);
}
