export type DiscordNotificationType =
  | 'AUCTION_CREATED'
  | 'AUCTION_ENDING_SOON'
  | 'BID_OUTBID'
  | 'AUCTION_WINNER'
  | 'ATTENDANCE_STARTED'
  | 'EVENT_FINALIZED'
  | 'STAFF_REVIEW_REQUIRED';

export class DiscordNotifyDto {
  type!: DiscordNotificationType;
  targetId?: string;
  channelId?: string;
  userId?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}
