import { EmbedBuilder } from 'discord.js';
import { blocks } from './discord-formatting';

export function buildDkpNotificationEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(blocks(description))
    .setColor(0x9b51e0)
    .setTimestamp(new Date());
}
