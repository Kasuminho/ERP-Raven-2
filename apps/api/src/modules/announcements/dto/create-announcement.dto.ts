export class CreateAnnouncementDto {
  type!: string;
  title!: string;
  description?: string;
  eventTime!: string;
  timezone?: string;
  channelId?: string;
  mentionRoleId?: string;
}
