#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PUBLIC_APP_URL',
  'CORS_ORIGIN',
  'NEXT_PUBLIC_API_URL',
  'DISCORD_CALLBACK_URL',
  'IMAGE_STORAGE_PROVIDER',
  'UPLOADS_HOST_DIR',
  'BACKUP_DIR',
  'BACKUP_STATUS_FILE',
  'DISCORD_GUILD_ID',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_BOT_TOKEN',
  'DISCORD_STAFF_ROLE_ID',
];

const RECOMMENDED_ENV_KEYS = ['JWT_EXPIRES_IN', 'BACKUP_MAX_AGE_HOURS'];
const G3X_MARKERS = [
  'container_name: guild-api',
  'container_name: guild-web',
  'container_name: guild-watchtower',
  'app.guild-g3x.com.br',
  '/srv/guild/uploads',
  '/srv/guild/backups',
  'guild_platform',
];

function parseArgs(argv) {
  const args = {
    skipDocker: false,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--help' || current === '-h') {
      args.help = true;
      continue;
    }

    if (current === '--skip-docker') {
      args.skipDocker = true;
      continue;
    }

    if (current === '--json') {
      args.json = true;
      continue;
    }

    if (!current.startsWith('--')) {
      throw new Error(`Argumento inesperado: ${current}`);
    }

    const key = current.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = argv[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`Argumento ${current} exige valor.`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function printHelp() {
  console.log(`Uso:
  npm run guild:dry-run -- --guild guilda-teste --compose docker-compose.guilda-teste.yml --env-file icontainer-guilda-teste.env --base-url https://guilda-teste.exemplo.com --uploads-dir /srv/guilda-teste/uploads --backups-dir /srv/guilda-teste/backups --postgres-db guilda_teste --postgres-user guilda_teste_app

Opcoes:
  --guild <slug>          Slug operacional da guilda, por exemplo guilda-teste.
  --compose <arquivo>     Compose exclusivo da guilda.
  --env-file <arquivo>    Env real da guilda. Valores nao sao impressos.
  --base-url <url>        URL publica esperada da guilda.
  --uploads-dir <path>    Diretorio host de uploads.
  --backups-dir <path>    Diretorio host de backups.
  --postgres-db <nome>    Database PostgreSQL esperada.
  --postgres-user <nome>  Usuario PostgreSQL esperado.
  --skip-docker           Pula docker compose config --quiet.
  --json                  Emite resultado sanitizado em JSON.
`);
}

function push(checks, level, message, details) {
  checks.push({ level, message, details });
}

function readText(filePath, label, checks) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    push(checks, 'fail', `${label} nao encontrado.`, resolved);
    return { resolved, text: '' };
  }

  if (!fs.statSync(resolved).isFile()) {
    push(checks, 'fail', `${label} nao e arquivo regular.`, resolved);
    return { resolved, text: '' };
  }

  push(checks, 'pass', `${label} encontrado.`, resolved);
  return { resolved, text: fs.readFileSync(resolved, 'utf8') };
}

function parseEnvKeys(envText) {
  const keys = new Set();
  const invalidLines = [];

  envText.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) {
      keys.add(match[1]);
      return;
    }

    invalidLines.push(index + 1);
  });

  return { keys, invalidLines };
}

function checkSlug(args, checks) {
  if (!args.guild) {
    push(checks, 'fail', '--guild e obrigatorio.');
    return;
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.guild)) {
    push(checks, 'fail', '--guild deve ser slug kebab-case simples.', args.guild);
    return;
  }

  push(checks, 'pass', 'Slug da guilda valido.', args.guild);
}

function checkBaseUrl(args, composeText, checks) {
  if (!args.baseUrl) {
    push(checks, 'warn', '--base-url nao informado; validacao de dominio publico foi limitada.');
    return;
  }

  try {
    const parsed = new URL(args.baseUrl);
    if (parsed.protocol !== 'https:') {
      push(checks, 'fail', 'URL publica deve usar HTTPS.', parsed.protocol);
    } else {
      push(checks, 'pass', 'URL publica usa HTTPS.', parsed.hostname);
    }

    if (!parsed.hostname.includes(args.guild)) {
      push(checks, 'warn', 'Hostname publico nao contem o slug da guilda.', parsed.hostname);
    }

    if (args.guild !== 'g3x' && parsed.hostname.includes('guild-g3x')) {
      push(checks, 'fail', 'Hostname publico parece apontar para a G3X.', parsed.hostname);
    }

    if (!composeText.includes(args.baseUrl) && !composeText.includes('${NEXT_PUBLIC_API_URL')) {
      push(checks, 'warn', 'Compose nao referencia a base URL informada nem NEXT_PUBLIC_API_URL por env.');
    }
  } catch {
    push(checks, 'fail', '--base-url invalido.', args.baseUrl);
  }
}

function checkCompose(args, composeText, checks) {
  if (!composeText) {
    return;
  }

  if (args.guild && composeText.includes(args.guild)) {
    push(checks, 'pass', 'Compose contem o slug da guilda.');
  } else {
    push(checks, 'fail', 'Compose nao contem o slug da guilda.');
  }

  G3X_MARKERS.forEach((marker) => {
    if (args.guild !== 'g3x' && composeText.includes(marker)) {
      push(checks, 'fail', 'Compose ainda contem marcador da G3X.', marker);
    }
  });

  ['api', 'web', 'watchtower'].forEach((service) => {
    const expected = `container_name: ${args.guild}-${service}`;
    if (args.guild && composeText.includes(expected)) {
      push(checks, 'pass', `Container ${service} nomeado para a guilda.`);
    } else {
      push(checks, 'warn', `Container ${service} nao segue o padrao ${expected}.`);
    }
  });

  if (composeText.includes('env_file:')) {
    push(checks, 'pass', 'Compose usa env_file.');
  } else {
    push(checks, 'warn', 'Compose nao declara env_file.');
  }

  if (composeText.includes('/app/uploads')) {
    push(checks, 'pass', 'Compose monta uploads no container.');
  } else {
    push(checks, 'warn', 'Compose nao mostra montagem de /app/uploads.');
  }

  if (composeText.includes('/app/backups')) {
    push(checks, 'pass', 'Compose monta backups no container.');
  } else {
    push(checks, 'warn', 'Compose nao mostra montagem de /app/backups.');
  }

  if (composeText.includes('watchtower')) {
    push(checks, 'pass', 'Compose inclui Watchtower.');
  } else {
    push(checks, 'warn', 'Compose nao inclui Watchtower.');
  }
}

function checkEnv(envText, checks) {
  if (!envText) {
    return;
  }

  const { keys, invalidLines } = parseEnvKeys(envText);

  if (invalidLines.length > 0) {
    push(checks, 'fail', 'Env possui linhas sem formato KEY=valor.', `linhas ${invalidLines.join(', ')}`);
  }

  REQUIRED_ENV_KEYS.forEach((key) => {
    if (keys.has(key)) {
      push(checks, 'pass', `Env contem ${key}.`);
    } else {
      push(checks, 'fail', `Env sem ${key}.`);
    }
  });

  RECOMMENDED_ENV_KEYS.forEach((key) => {
    if (keys.has(key)) {
      push(checks, 'pass', `Env contem ${key}.`);
    } else {
      push(checks, 'warn', `Env sem ${key}.`);
    }
  });

  const webhookKeys = [...keys].filter((key) => key.includes('WEBHOOK'));
  if (webhookKeys.length > 0) {
    push(checks, 'pass', 'Env contem chaves de webhook sem imprimir valores.', webhookKeys.join(', '));
  } else {
    push(checks, 'warn', 'Env nao contem chaves de webhook detectaveis.');
  }
}

function checkDirectories(args, checks) {
  [
    ['uploads', args.uploadsDir],
    ['backups', args.backupsDir],
  ].forEach(([label, dir]) => {
    if (!dir) {
      push(checks, 'warn', `--${label}-dir nao informado; diretorio host nao foi validado.`);
      return;
    }

    const resolved = path.resolve(dir);
    if (!fs.existsSync(resolved)) {
      push(checks, 'fail', `Diretorio de ${label} nao existe.`, resolved);
      return;
    }

    if (!fs.statSync(resolved).isDirectory()) {
      push(checks, 'fail', `Caminho de ${label} nao e diretorio.`, resolved);
      return;
    }

    push(checks, 'pass', `Diretorio de ${label} existe.`, resolved);
  });
}

function checkPostgres(args, checks) {
  if (!args.postgresDb) {
    push(checks, 'warn', '--postgres-db nao informado; database isolada nao foi validada.');
  } else if (args.guild !== 'g3x' && args.postgresDb === 'guild_platform') {
    push(checks, 'fail', 'Database informada ainda e a da G3X.', args.postgresDb);
  } else if (args.guild && args.postgresDb.includes(args.guild.replaceAll('-', '_'))) {
    push(checks, 'pass', 'Database parece especifica da guilda.', args.postgresDb);
  } else {
    push(checks, 'warn', 'Database nao contem o slug da guilda em snake_case.', args.postgresDb);
  }

  if (!args.postgresUser) {
    push(checks, 'warn', '--postgres-user nao informado; usuario restrito nao foi validado.');
  } else if (args.guild && args.postgresUser.includes(args.guild.replaceAll('-', '_'))) {
    push(checks, 'pass', 'Usuario PostgreSQL parece especifico da guilda.', args.postgresUser);
  } else {
    push(checks, 'warn', 'Usuario PostgreSQL nao contem o slug da guilda em snake_case.', args.postgresUser);
  }
}

function checkDockerCompose(args, checks) {
  if (args.skipDocker) {
    push(checks, 'warn', 'Validacao docker compose config --quiet pulada por --skip-docker.');
    return;
  }

  const result = spawnSync(
    'docker',
    ['compose', '-f', args.compose, '--env-file', args.envFile, 'config', '--quiet'],
    { encoding: 'utf8', stdio: 'pipe' },
  );

  if (result.error && result.error.code === 'ENOENT') {
    push(checks, 'warn', 'Docker nao encontrado; config do Compose nao foi validada localmente.');
    return;
  }

  if (result.status === 0) {
    push(checks, 'pass', 'docker compose config --quiet passou.');
    return;
  }

  push(checks, 'fail', 'docker compose config --quiet falhou. Rode manualmente para ver detalhes sem expor env.');
}

function printHuman(checks) {
  const labels = {
    pass: 'PASS',
    warn: 'WARN',
    fail: 'FAIL',
  };

  checks.forEach((check) => {
    const suffix = check.details ? ` (${check.details})` : '';
    console.log(`[${labels[check.level]}] ${check.message}${suffix}`);
  });

  const failures = checks.filter((check) => check.level === 'fail').length;
  const warnings = checks.filter((check) => check.level === 'warn').length;
  console.log('');
  console.log(`Resultado: ${failures} falha(s), ${warnings} aviso(s).`);
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }

  if (args.help) {
    printHelp();
    return;
  }

  const checks = [];
  checkSlug(args, checks);

  if (!args.compose) {
    push(checks, 'fail', '--compose e obrigatorio.');
  }

  if (!args.envFile) {
    push(checks, 'fail', '--env-file e obrigatorio.');
  }

  const compose = args.compose ? readText(args.compose, 'Compose', checks) : { text: '' };
  const env = args.envFile ? readText(args.envFile, 'Env file', checks) : { text: '' };

  checkCompose(args, compose.text, checks);
  checkBaseUrl(args, compose.text, checks);
  checkEnv(env.text, checks);
  checkDirectories(args, checks);
  checkPostgres(args, checks);

  if (args.compose && args.envFile) {
    checkDockerCompose(args, checks);
  }

  if (args.json) {
    console.log(JSON.stringify({ guild: args.guild, checks }, null, 2));
  } else {
    printHuman(checks);
  }

  if (checks.some((check) => check.level === 'fail')) {
    process.exit(1);
  }
}

main();
