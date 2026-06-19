const fs = require('node:fs');
const path = require('node:path');

const defaultName = 'Aristolfo, 570 anos de webhook';
const defaultImage = path.join('apps', 'web', 'public', 'aristolfo-webhooks.png');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (!process.env[key]) process.env[key] = value;
  }
}

function argValue(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1).trim();
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

async function main() {
  loadEnvFile(path.resolve('.env'));
  loadEnvFile(path.resolve('.env.production'));
  loadEnvFile(path.resolve('apps', 'api', '.env'));

  const name = argValue('--name') || process.env.DISCORD_WEBHOOK_USERNAME || defaultName;
  const imagePath = path.resolve(argValue('--image') || defaultImage);
  const avatar = `data:image/png;base64,${fs.readFileSync(imagePath).toString('base64')}`;
  const webhookUrls = [...new Set(Object.entries(process.env)
    .filter(([key, value]) => key.startsWith('DISCORD_') && key.endsWith('_WEBHOOK_URL') && value)
    .map(([, value]) => value))];

  if (webhookUrls.length === 0) throw new Error('No Discord webhook URLs were found.');

  for (const webhookUrl of webhookUrls) {
    const response = await fetch(webhookUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, avatar }),
    });

    if (!response.ok) {
      throw new Error(`Discord rejected a webhook identity update with status ${response.status}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  console.log(`Updated ${webhookUrls.length} unique Discord webhook(s) as "${name}".`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
