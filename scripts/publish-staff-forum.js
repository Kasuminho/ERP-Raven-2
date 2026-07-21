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
const { posts, tags } = require('./staff-forum-content');

const root = path.resolve(__dirname, '..');
const categoryId = process.env.STAFF_FORUM_CATEGORY_ID || '1528829674166423552';
const forumName = process.env.STAFF_FORUM_NAME || '🛡️・central-da-staff';
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
  const tagKeys = new Set(tags.map((tag) => tag.key));
  for (const post of posts) {
    if (!tagKeys.has(post.tag)) {
      throw new Error(`Unknown canonical tag ${post.tag} in ${post.slug}.`);
    }
    if (post.body.length > 4096) throw new Error(`Embed limit exceeded by ${post.slug}: ${post.body.length}`);
    const asset = path.join(root, 'docs', 'staff-forum', 'assets', `${post.slug}.png`);
    if (!fs.existsSync(asset)) throw new Error(`Missing Staff tutorial asset: ${asset}`);
  }
}

function embedFor(post, indexLinks = '') {
  return new EmbedBuilder()
    .setColor(0xb53d5f)
    .setAuthor({ name: 'Aristolfo, 570 anos de webhook', iconURL: 'https://app.guild-g3x.com.br/aristolfo-webhooks.png' })
    .setDescription(`${post.body}${indexLinks}`)
    .setImage(`attachment://${post.slug}.png`)
    .setFooter({ text: `STAFF-ONLY · PT-BR · ${post.route}` });
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
  const assetPath = path.join(root, 'docs', 'staff-forum', 'assets', `${post.slug}.png`);
  const file = new AttachmentBuilder(assetPath, { name: `${post.slug}.png` });
  const compactIndex = [];
  for (let offset = 0; offset < links.length; offset += 10) {
    compactIndex.push(links.slice(offset, offset + 10).map((row) => {
      const number = row.title.match(/^\d{2}/)?.[0] ?? String(offset + 1).padStart(2, '0');
      return `[${number}](https://discord.com/channels/${forum.guildId}/${row.id})`;
    }).join(' · '));
  }
  const index = post.slug === 'staff-comece-aqui'
    ? `\n\n### 📚 Índice da Central\n${compactIndex.join('\n')}`
    : '';
  const payload = {
    content: '🛡️ Tutorial interno da Staff · PT-BR — dúvidas operacionais podem ser respondidas nesta thread.',
    embeds: [embedFor(post, index)],
    files: [file],
    allowedMentions: { parse: [] },
  };

  if (existing) {
    if (existing.archived) await existing.setArchived(false, 'Atualização do tutorial interno');
    const starter = await existing.fetchStarterMessage();
    if (!starter) throw new Error(`Starter message not found for ${post.title}`);
    await starter.edit({ ...payload, attachments: [] });
    await existing.setAppliedTags([tagId], 'Sincronização das tags Staff');
    return existing;
  }

  return forum.threads.create({
    name: post.title,
    autoArchiveDuration: 10080,
    appliedTags: [tagId],
    message: payload,
    reason: 'Criação da Central da Staff Raven 2',
  });
}

async function main() {
  loadEnvFile(path.join(root, '.env'));
  validateContent();
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const staffRoleId = process.env.DISCORD_STAFF_ROLE_ID || '1431337988423549000';
  if (!token || !guildId) throw new Error('DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(token);
  try {
    const guild = await client.guilds.fetch(guildId);
    const [category, staffRole] = await Promise.all([guild.channels.fetch(categoryId), guild.roles.fetch(staffRoleId)]);
    if (!category || category.type !== ChannelType.GuildCategory) throw new Error(`Category ${categoryId} is invalid.`);
    if (!staffRole) throw new Error(`Staff role ${staffRoleId} was not found.`);

    const channels = await guild.channels.fetch();
    let forum = channels.find((channel) => channel?.type === ChannelType.GuildForum && channel.name === forumName && channel.parentId === categoryId);
    if (dryRun) {
      console.log(JSON.stringify({ dryRun: true, guild: guild.name, category: category.name, staffRole: staffRole.name, forum: forum?.name ?? forumName, action: forum ? 'update' : 'create', posts: posts.length, language: 'pt-BR', staffOnly: true }, null, 2));
      return;
    }

    const tagOptions = tags.map((tag) => ({ name: tag.name, emoji: { name: tag.emoji } }));
    if (!forum) {
      forum = await guild.channels.create({
        name: forumName,
        type: ChannelType.GuildForum,
        parent: categoryId,
        topic: 'Tutoriais internos PT-BR do ERP Raven 2. Acesso exclusivo da Staff G3X.',
        availableTags: tagOptions,
        defaultAutoArchiveDuration: 10080,
        defaultForumLayout: ForumLayoutType.ListView,
        defaultSortOrder: SortOrderType.CreationDate,
        reason: 'Central interna de tutoriais da Staff',
      });
    } else {
      const currentByName = new Map(forum.availableTags.map((tag) => [tag.name, tag]));
      await forum.edit({
        topic: 'Tutoriais internos PT-BR do ERP Raven 2. Acesso exclusivo da Staff G3X.',
        availableTags: tags.map((tag) => ({ id: currentByName.get(tag.name)?.id, name: tag.name, emoji: { name: tag.emoji }, moderated: false })),
        defaultAutoArchiveDuration: 10080,
        defaultForumLayout: ForumLayoutType.ListView,
        defaultSortOrder: SortOrderType.CreationDate,
        reason: 'Sincronização da Central da Staff',
      });
    }

    forum = await guild.channels.fetch(forum.id);
    if (!forum || forum.type !== ChannelType.GuildForum) {
      throw new Error('Staff forum could not be refreshed after tag synchronization.');
    }

    await forum.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: false,
      SendMessages: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      SendMessagesInThreads: false,
    }, { reason: 'Bloqueio explícito de acesso para players' });
    await forum.permissionOverwrites.edit(staffRole, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
      CreatePublicThreads: true,
      SendMessagesInThreads: true,
      AddReactions: true,
      AttachFiles: true,
      EmbedLinks: true,
      ManageThreads: true,
    }, { reason: 'Acesso exclusivo da Staff à central interna' });

    const effective = forum.permissionsFor(staffRole);
    if (!effective?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessagesInThreads])) {
      throw new Error('The configured Staff role cannot read and reply in the forum.');
    }

    const threads = await allForumThreads(forum);
    const tagIds = new Map(forum.availableTags.map((tag) => [tags.find((item) => item.name === tag.name)?.key, tag.id]));
    const created = [];
    for (const post of posts.filter((item) => item.slug !== 'staff-comece-aqui')) {
      const tagId = tagIds.get(post.tag);
      if (!tagId) throw new Error(`Forum tag not found: ${post.tag}`);
      const thread = await upsertPost({ forum, post, tagId, existing: threads.get(post.title), links: [] });
      created.push({ id: thread.id, title: post.title });
    }
    const welcome = posts.find((item) => item.slug === 'staff-comece-aqui');
    const welcomeThread = await upsertPost({ forum, post: welcome, tagId: tagIds.get(welcome.tag), existing: threads.get(welcome.title), links: created });
    console.log(JSON.stringify({ guild: guild.name, category: category.name, staffRole: staffRole.name, forum: { id: forum.id, name: forum.name }, welcomeThreadId: welcomeThread.id, postsPublished: posts.length, language: 'pt-BR', staffOnly: true }, null, 2));
  } finally {
    client.destroy();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
