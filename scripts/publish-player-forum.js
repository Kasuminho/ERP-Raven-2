const fs = require('fs');
const path = require('path');
const {
  AttachmentBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  ForumLayoutType,
  GatewayIntentBits,
  PermissionsBitField,
  SortOrderType,
} = require('discord.js');
const { posts, tags } = require('./player-forum-content');

const root = path.resolve(__dirname, '..');
const categoryId = process.env.PLAYER_FORUM_CATEGORY_ID || '1431340101052530829';
const forumName = process.env.PLAYER_FORUM_NAME || '📚・central-do-player';
const dryRun = process.argv.includes('--dry-run');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^['\"]|['\"]$/g, '');
  }
}

function validateContent() {
  for (const post of posts) {
    const total = post.pt.length + post.en.length;
    if (post.pt.length > 4096 || post.en.length > 4096 || total > 5900) {
      throw new Error(`Embed limits exceeded by ${post.slug}: pt=${post.pt.length}, en=${post.en.length}, total=${total}`);
    }
    const asset = path.join(root, 'docs', 'player-forum', 'assets', `${post.slug}.png`);
    if (!fs.existsSync(asset)) throw new Error(`Missing tutorial asset: ${asset}`);
  }
}

function embedFor(post, locale, indexLinks = '') {
  const isPt = locale === 'pt';
  const description = `${isPt ? post.pt : post.en}${indexLinks}`;
  return new EmbedBuilder()
    .setColor(isPt ? 0x8f5bd7 : 0xd5a84c)
    .setAuthor({ name: 'Aristolfo, 570 anos de webhook', iconURL: 'https://app.guild-g3x.com.br/aristolfo-webhooks.png' })
    .setDescription(description)
    .setImage(`attachment://${post.slug}.png`)
    .setFooter({ text: `${isPt ? 'PT-BR' : 'EN'} · ${post.route}` });
}

async function allForumThreads(forum) {
  const result = new Map();
  const active = await forum.threads.fetchActive();
  for (const thread of active.threads.values()) result.set(thread.name, thread);

  let before;
  do {
    const archived = await forum.threads.fetchArchived({ type: 'public', before, limit: 100 });
    for (const thread of archived.threads.values()) result.set(thread.name, thread);
    before = archived.hasMore ? archived.threads.last()?.archiveTimestamp : undefined;
    if (!before) break;
  } while (true);

  return result;
}

async function upsertPost({ forum, post, tagId, existing, links }) {
  const assetPath = path.join(root, 'docs', 'player-forum', 'assets', `${post.slug}.png`);
  const file = new AttachmentBuilder(assetPath, { name: `${post.slug}.png` });
  const indexPt = post.slug === 'comece-aqui' ? `\n\n### 📚 Índice\n${links.map((row) => `- [${row.title}](https://discord.com/channels/${forum.guildId}/${row.id})`).join('\n')}` : '';
  const indexEn = post.slug === 'comece-aqui' ? `\n\n### 📚 Index\n${links.map((row) => `- [${row.title}](https://discord.com/channels/${forum.guildId}/${row.id})`).join('\n')}` : '';
  const payload = {
    content: '📘 Tutorial oficial · Official tutorial — dúvidas e respostas são bem-vindas nesta thread.',
    embeds: [embedFor(post, 'pt', indexPt), embedFor(post, 'en', indexEn)],
    files: [file],
    allowedMentions: { parse: [] },
  };

  if (existing) {
    if (existing.archived) await existing.setArchived(false, 'Atualização do tutorial oficial');
    const starter = await existing.fetchStarterMessage();
    if (!starter) throw new Error(`Starter message not found for ${post.title}`);
    await starter.edit({ ...payload, attachments: [] });
    await existing.setAppliedTags([tagId], 'Sincronização das tags do tutorial');
    return existing;
  }

  return forum.threads.create({
    name: post.title,
    autoArchiveDuration: 10080,
    appliedTags: [tagId],
    message: payload,
    reason: 'Criação da Central do Player Raven 2',
  });
}

async function main() {
  loadEnvFile(path.join(root, '.env'));
  validateContent();
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId) throw new Error('DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(token);

  try {
    const guild = await client.guilds.fetch(guildId);
    const category = await guild.channels.fetch(categoryId);
    if (!category || category.type !== ChannelType.GuildCategory) throw new Error(`Category ${categoryId} is invalid.`);

    const everyone = guild.roles.everyone.permissions;
    const replyPermissions = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.SendMessagesInThreads,
      PermissionsBitField.Flags.ReadMessageHistory,
    ];
    if (!everyone.has(replyPermissions)) throw new Error('@everyone cannot view and reply under the current guild permissions.');

    const channels = await guild.channels.fetch();
    let forum = channels.find((channel) => channel?.type === ChannelType.GuildForum && channel.name === forumName && channel.parentId === categoryId);
    if (dryRun) {
      console.log(JSON.stringify({ dryRun: true, guild: guild.name, category: category.name, forum: forum?.name ?? forumName, action: forum ? 'update' : 'create', posts: posts.length, playersCanReply: true }, null, 2));
      return;
    }

    const tagOptions = tags.map((tag) => ({ name: tag.name, emoji: { name: tag.emoji } }));
    if (!forum) {
      forum = await guild.channels.create({
        name: forumName,
        type: ChannelType.GuildForum,
        parent: categoryId,
        topic: 'Tutoriais oficiais PT-BR / EN do ERP Raven 2. Players podem responder para tirar dúvidas.',
        availableTags: tagOptions,
        defaultAutoArchiveDuration: 10080,
        defaultForumLayout: ForumLayoutType.ListView,
        defaultSortOrder: SortOrderType.CreationDate,
        reason: 'Central bilíngue de tutoriais dos players',
      });
    } else {
      const currentByName = new Map(forum.availableTags.map((tag) => [tag.name, tag]));
      await forum.edit({
        topic: 'Tutoriais oficiais PT-BR / EN do ERP Raven 2. Players podem responder para tirar dúvidas.',
        availableTags: tags.map((tag) => ({ id: currentByName.get(tag.name)?.id, name: tag.name, emoji: { name: tag.emoji }, moderated: false })),
        defaultAutoArchiveDuration: 10080,
        defaultForumLayout: ForumLayoutType.ListView,
        defaultSortOrder: SortOrderType.CreationDate,
        reason: 'Sincronização da Central do Player',
      });
    }

    await forum.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      SendMessagesInThreads: true,
      AddReactions: true,
      AttachFiles: true,
      EmbedLinks: true,
    }, { reason: 'Players respondem aos tutoriais, mas novos posts oficiais ficam com a Staff' });

    const threads = await allForumThreads(forum);
    const tagIds = new Map(forum.availableTags.map((tag) => [tags.find((item) => item.name === tag.name)?.key, tag.id]));
    const created = [];

    for (const post of posts.filter((item) => item.slug !== 'comece-aqui')) {
      const tagId = tagIds.get(post.tag);
      if (!tagId) throw new Error(`Forum tag not found: ${post.tag}`);
      const thread = await upsertPost({ forum, post, tagId, existing: threads.get(post.title), links: [] });
      created.push({ id: thread.id, title: post.title });
    }

    const welcome = posts.find((item) => item.slug === 'comece-aqui');
    const welcomeTagId = tagIds.get(welcome.tag);
    const welcomeThread = await upsertPost({ forum, post: welcome, tagId: welcomeTagId, existing: threads.get(welcome.title), links: created });

    console.log(JSON.stringify({ guild: guild.name, category: category.name, forum: { id: forum.id, name: forum.name }, welcomeThreadId: welcomeThread.id, postsPublished: posts.length, playersCanReply: true, playersCanCreatePosts: false }, null, 2));
  } finally {
    client.destroy();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
