import { registerAs } from '@nestjs/config';

export default registerAs('discord', () => ({
  clientId: process.env.DISCORD_CLIENT_ID ?? '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
  callbackUrl: process.env.DISCORD_CALLBACK_URL ?? '',
  botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  guildId: process.env.DISCORD_GUILD_ID ?? '',
  publicUrl: process.env.PUBLIC_APP_URL ?? process.env.CORS_ORIGIN ?? '',
  staffRoleId: process.env.DISCORD_STAFF_ROLE_ID ?? '1431337988423549000',
  channels: {
    auctions: process.env.DISCORD_AUCTIONS_CHANNEL_ID ?? '',
    attendance: process.env.DISCORD_ATTENDANCE_CHANNEL_ID ?? '',
    staffReview: process.env.DISCORD_STAFF_REVIEW_CHANNEL_ID ?? '',
    dkp: process.env.DISCORD_DKP_CHANNEL_ID ?? '',
    announcements: process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID ?? process.env.DISCORD_ATTENDANCE_CHANNEL_ID ?? '',
  },
  webhooks: {
    events: process.env.DISCORD_EVENTS_WEBHOOK_URL ?? '',
    announcements: process.env.DISCORD_ANNOUNCEMENTS_WEBHOOK_URL ?? process.env.DISCORD_EVENTS_WEBHOOK_URL ?? '',
    auctions: process.env.DISCORD_AUCTIONS_WEBHOOK_URL ?? '',
    drops: process.env.DISCORD_DROPS_WEBHOOK_URL ?? '',
    attendance: process.env.DISCORD_ATTENDANCE_WEBHOOK_URL ?? '',
    staffReview: process.env.DISCORD_STAFF_REVIEW_WEBHOOK_URL ?? '',
    dkp: process.env.DISCORD_DKP_WEBHOOK_URL ?? '',
    interests: process.env.DISCORD_INTERESTS_WEBHOOK_URL ?? '',
    itemRequests: process.env.DISCORD_ITEM_REQUESTS_WEBHOOK_URL ?? '',
    staffRequests: process.env.DISCORD_STAFF_REQUESTS_WEBHOOK_URL ?? '',
    updates: process.env.DISCORD_UPDATES_WEBHOOK_URL ?? '',
    staffUpdates: process.env.DISCORD_STAFF_UPDATES_WEBHOOK_URL ?? '',
  },
}));
