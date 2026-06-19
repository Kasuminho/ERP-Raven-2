const fs = require('node:fs');
const path = require('node:path');

const colors = {
  player: 0xf2c94c,
  staff: 0xeb5757,
  announcements: 0x2f80ed,
};

const webhookUsername = 'Aristolfo, 570 anos de webhook';
const webhookAvatarUrl = 'https://app.guild-g3x.com.br/aristolfo-webhooks.png';
const punchlines = {
  'PT-BR': '*Aristolfo auditou. Se quebrar agora, foi feature com autoestima.*',
  EN: '*Aristolfo reviewed it. Any remaining bug is clearly a confidence feature.*',
  ES: '*Aristolfo lo reviso. Si falla ahora, es una feature con autoestima.*',
};

function loadEnv(cwd) {
  const envPath = path.join(cwd, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readMessage() {
  const ignoredValueIndexes = new Set();
  for (const option of ['--username', '--locale']) {
    const index = process.argv.indexOf(option);
    if (index >= 0) {
      ignoredValueIndexes.add(index + 1);
    }
  }

  const argPath = process.argv.find((arg, index) => (
    !arg.startsWith('--')
    && arg !== process.argv[0]
    && arg !== process.argv[1]
    && !ignoredValueIndexes.has(index)
  ));

  if (argPath) {
    return fs.readFileSync(path.resolve(argPath), 'utf8').trim();
  }

  const stdin = fs.readFileSync(0, 'utf8').trim();

  if (!stdin) {
    throw new Error('Provide a markdown file path or pipe message content through stdin.');
  }

  return stdin;
}

function readArgValue(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length).trim();
  }

  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1].trim();
  }

  return undefined;
}

function normalizeSections(content) {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n*(\*\*(?:PT-BR|PT|EN|ES)\*\*)/g, '\n\n$1')
    .replace(/\n*(^|\n)(PT-BR|PT|EN|ES)(?=\n)/g, '\n\n**$2**')
    .trim();
  const titleMatch = normalized.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || 'Atualizacao da plataforma';
  const withoutTitle = normalized.replace(/^#\s+.+\n?/, '').trim();
  const parts = withoutTitle.split(/\n(?=\*\*(?:PT-BR|PT|EN|ES)\*\*)/).map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    return [{ title, language: 'Update', body: withoutTitle || normalized }];
  }

  return parts.map((part) => {
    const match = part.match(/^\*\*(PT-BR|PT|EN|ES)\*\*\s*\n?/);
    return {
      title,
      language: match?.[1] || 'Update',
      body: part.replace(/^\*\*(PT-BR|PT|EN|ES)\*\*\s*\n?/, '').trim(),
    };
  });
}

function chunkText(text, limit = 3600) {
  if (text.length <= limit) {
    return [text];
  }

  const chunks = [];
  let current = '';

  for (const line of text.split('\n')) {
    if ((current + '\n' + line).trim().length > limit) {
      chunks.push(current.trim());
      current = line;
    } else {
      current = (current + '\n' + line).trim();
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}

function normalizeLocale(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'en' || normalized === 'en-us') return 'EN';
  if (normalized === 'es' || normalized === 'es-es') return 'ES';
  return 'PT-BR';
}

function selectLocaleSections(content, locale) {
  const sections = normalizeSections(content);
  const aliases = locale === 'PT-BR' ? new Set(['PT-BR', 'PT']) : new Set([locale]);
  const selected = sections.filter((section) => aliases.has(section.language));
  return selected.length > 0 ? selected : sections.filter((section) => section.language === 'Update');
}

function buildEmbeds(content, target, locale) {
  return selectLocaleSections(content, locale).flatMap((section) => {
    const chunks = chunkText(section.body);
    return chunks.map((chunk, index) => ({
      title: `${section.title}${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}`,
      description: `${chunk}\n\n${punchlines[locale]}`,
      color: colors[target] || colors.player,
      timestamp: new Date().toISOString(),
    }));
  });
}

function groupEmbeds(embeds) {
  const groups = [];
  let current = [];
  let size = 0;

  for (const embed of embeds) {
    const embedSize = (embed.title?.length || 0) + (embed.description?.length || 0);

    if (current.length >= 10 || (current.length > 0 && size + embedSize > 5600)) {
      groups.push(current);
      current = [];
      size = 0;
    }

    current.push(embed);
    size += embedSize;
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

async function main() {
  loadEnv(process.cwd());

  const target = process.argv.includes('--staff') ? 'staff' : process.argv.includes('--announcements') ? 'announcements' : 'player';
  const locale = target === 'staff' ? 'PT-BR' : normalizeLocale(readArgValue('--locale') || process.env.DISCORD_UPDATES_LOCALE);
  const username = readArgValue('--username') || process.env.DISCORD_WEBHOOK_USERNAME || webhookUsername;
  const avatarUrl = process.env.DISCORD_WEBHOOK_AVATAR_URL || webhookAvatarUrl;
  const webhookUrl = target === 'staff'
    ? (process.env.DISCORD_STAFF_UPDATES_WEBHOOK_URL || process.env.DISCORD_UPDATES_WEBHOOK_URL)
    : target === 'announcements'
      ? (process.env.DISCORD_ANNOUNCEMENTS_WEBHOOK_URL || process.env.DISCORD_EVENTS_WEBHOOK_URL)
      : process.env.DISCORD_UPDATES_WEBHOOK_URL;

  if (!webhookUrl) {
    const expectedEnv = target === 'staff'
      ? 'DISCORD_STAFF_UPDATES_WEBHOOK_URL'
      : target === 'announcements'
        ? 'DISCORD_ANNOUNCEMENTS_WEBHOOK_URL'
        : 'DISCORD_UPDATES_WEBHOOK_URL';
    throw new Error(`${expectedEnv} is not configured.`);
  }

  const embedGroups = groupEmbeds(buildEmbeds(readMessage(), target, locale));

  if (embedGroups.length === 0) {
    throw new Error(`No ${locale} section was found in the changelog.`);
  }

  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({ target, locale, username, avatarUrl, messages: embedGroups.length, embeds: embedGroups.flat().length }, null, 2));
    return;
  }

  for (const [index, embeds] of embedGroups.entries()) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username,
        avatar_url: avatarUrl,
        content: embedGroups.length > 1 ? `Atualizacao (${index + 1}/${embedGroups.length})` : undefined,
        embeds,
        allowed_mentions: { parse: [] },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Discord webhook failed with ${response.status}: ${body}`);
    }
  }

  console.log(`Discord update sent in ${embedGroups.length} message(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
