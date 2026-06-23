#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { createHash, randomUUID } = require('node:crypto');
const { appendFile, mkdir, rename, writeFile } = require('node:fs/promises');
const path = require('node:path');

const prisma = new PrismaClient();

const STRING_FIELDS = [
  { model: 'itemCatalog', label: 'ItemCatalog', field: 'image1Url' },
  { model: 'itemCatalog', label: 'ItemCatalog', field: 'image2Url' },
  { model: 'itemRequest', label: 'ItemRequest', field: 'imageUrl' },
  { model: 'itemRequest', label: 'ItemRequest', field: 'updateProofImageUrl' },
  { model: 'dropHistory', label: 'DropHistory', field: 'proofImageUrl' },
  { model: 'itemInterestPost', label: 'ItemInterestPost', field: 'proofImageUrl' },
  { model: 'itemInterestEntry', label: 'ItemInterestEntry', field: 'imageUrl' },
  { model: 'codexRequest', label: 'CodexRequest', field: 'imageUrl' },
  { model: 'codexRequest', label: 'CodexRequest', field: 'proofImageUrl' },
  { model: 'daoshiCashReceipt', label: 'DaoshiCashReceipt', field: 'proofImageUrl' },
  { model: 'playerProgress', label: 'PlayerProgress', field: 'imageUrl' },
];

const JSON_ARRAY_FIELDS = [
  { model: 'playerProgress', label: 'PlayerProgress', field: 'imageUrls' },
];

function parseArgs(argv) {
  const args = {
    apply: false,
    limit: Number.POSITIVE_INFINITY,
    uploadsDir: process.env.UPLOADS_HOST_DIR || '/srv/guild/uploads',
    manifest: path.join('reports', `drive-image-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--dry-run') args.apply = false;
    else if (arg === '--limit') args.limit = Number(argv[++index] || '0');
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length));
    else if (arg === '--uploads-dir') args.uploadsDir = argv[++index];
    else if (arg.startsWith('--uploads-dir=')) args.uploadsDir = arg.slice('--uploads-dir='.length);
    else if (arg === '--manifest') args.manifest = argv[++index];
    else if (arg.startsWith('--manifest=')) args.manifest = arg.slice('--manifest='.length);
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(args.limit) || args.limit <= 0) {
    args.limit = Number.POSITIVE_INFINITY;
  }

  args.uploadsDir = path.resolve(args.uploadsDir);
  args.manifest = path.resolve(args.manifest);
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/migrate-drive-images-to-local.js [--dry-run]
  node scripts/migrate-drive-images-to-local.js --apply [--limit 25] [--uploads-dir /srv/guild/uploads]

Options:
  --apply                Download Drive images, write them to uploads, and update DB records.
  --dry-run              Inventory only. This is the default.
  --limit N              Process at most N Drive URL references.
  --uploads-dir PATH     Uploads directory visible to the process. Defaults to UPLOADS_HOST_DIR or /srv/guild/uploads.
  --manifest PATH        JSONL report path. Defaults to reports/drive-image-migration-*.jsonl.
`);
}

function isDriveUrl(value) {
  return typeof value === 'string' && /(?:drive\.google\.com|googleusercontent\.com)/i.test(value);
}

function extractDriveFileId(url) {
  const patterns = [
    /drive\.google\.com\/thumbnail\?id=([^&]+)/i,
    /drive\.google\.com\/file\/d\/([^/]+)/i,
    /drive\.google\.com\/open\?id=([^&]+)/i,
    /drive\.google\.com\/uc\?id=([^&]+)/i,
    /[?&]id=([^&]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return undefined;
}

function downloadUrlFor(url) {
  const fileId = extractDriveFileId(url);
  if (!fileId) return url;
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

function detectImageType(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimetype: 'image/png', extension: 'png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimetype: 'image/jpeg', extension: 'jpg' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mimetype: 'image/webp', extension: 'webp' };
  }
  return undefined;
}

async function fetchImageBuffer(url) {
  const response = await fetch(downloadUrlFor(url), {
    redirect: 'follow',
    headers: {
      'User-Agent': 'ERP-Raven-2 Drive image migration',
    },
  });

  if (!response.ok) {
    throw new Error(`download_failed status=${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());
  const detected = detectImageType(buffer);

  if (!detected) {
    throw new Error(`invalid_image content_type=${contentType || 'unknown'} size=${buffer.length}`);
  }

  return { buffer, ...detected };
}

async function writeLocalImage(uploadsDir, url) {
  await mkdir(uploadsDir, { recursive: true });

  const downloaded = await fetchImageBuffer(url);
  const filename = `${randomUUID()}.${downloaded.extension}`;
  const finalPath = path.join(uploadsDir, filename);
  const tempPath = `${finalPath}.tmp`;

  await writeFile(tempPath, downloaded.buffer, { flag: 'wx' });
  await rename(tempPath, finalPath);

  return {
    localUrl: `/uploads/${filename}`,
    filename,
    bytes: downloaded.buffer.length,
    mimetype: downloaded.mimetype,
    sha256: createHash('sha256').update(downloaded.buffer).digest('hex'),
  };
}

async function appendManifest(manifestPath, entry) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await appendFile(manifestPath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, 'utf8');
}

async function collectStringReferences(fieldConfig) {
  const delegate = prisma[fieldConfig.model];
  const rows = await delegate.findMany({
    where: { [fieldConfig.field]: { contains: 'drive.google.com', mode: 'insensitive' } },
    select: { id: true, [fieldConfig.field]: true },
    orderBy: { id: 'asc' },
  });

  const googleusercontentRows = await delegate.findMany({
    where: { [fieldConfig.field]: { contains: 'googleusercontent.com', mode: 'insensitive' } },
    select: { id: true, [fieldConfig.field]: true },
    orderBy: { id: 'asc' },
  });

  return [...rows, ...googleusercontentRows]
    .filter((row, index, all) => all.findIndex((candidate) => candidate.id === row.id) === index)
    .map((row) => ({
      ...fieldConfig,
      id: row.id,
      oldUrl: row[fieldConfig.field],
      kind: 'string',
    }))
    .filter((reference) => isDriveUrl(reference.oldUrl));
}

async function collectJsonArrayReferences(fieldConfig) {
  const delegate = prisma[fieldConfig.model];
  const rows = await delegate.findMany({
    select: { id: true, [fieldConfig.field]: true },
    orderBy: { id: 'asc' },
  });
  const references = [];

  for (const row of rows) {
    const values = Array.isArray(row[fieldConfig.field]) ? row[fieldConfig.field] : [];
    values.forEach((value, index) => {
      if (isDriveUrl(value)) {
        references.push({
          ...fieldConfig,
          id: row.id,
          oldUrl: value,
          index,
          allValues: values,
          kind: 'json-array',
        });
      }
    });
  }

  return references;
}

async function collectReferences() {
  const groups = await Promise.all([
    ...STRING_FIELDS.map(collectStringReferences),
    ...JSON_ARRAY_FIELDS.map(collectJsonArrayReferences),
  ]);
  return groups.flat();
}

async function applyReference(reference, localUrl) {
  const delegate = prisma[reference.model];

  if (reference.kind === 'string') {
    await delegate.update({
      where: { id: reference.id },
      data: { [reference.field]: localUrl },
    });
    return;
  }

  const current = await delegate.findUnique({
    where: { id: reference.id },
    select: { [reference.field]: true },
  });
  const values = Array.isArray(current?.[reference.field]) ? current[reference.field] : [];
  const nextValues = values.map((value) => (value === reference.oldUrl ? localUrl : value));

  await delegate.update({
    where: { id: reference.id },
    data: { [reference.field]: nextValues },
  });
}

function summarize(references) {
  const summary = new Map();
  for (const reference of references) {
    const key = `${reference.label}.${reference.field}`;
    summary.set(key, (summary.get(key) || 0) + 1);
  }
  return [...summary.entries()].sort(([left], [right]) => left.localeCompare(right));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const references = (await collectReferences()).slice(0, args.limit);
  const cache = new Map();
  let migrated = 0;
  let failed = 0;

  console.log(`${args.apply ? 'APPLY' : 'DRY-RUN'} Drive image migration`);
  console.log(`References found: ${references.length}`);
  console.log(`Manifest: ${args.manifest}`);
  if (args.apply) console.log(`Uploads dir: ${args.uploadsDir}`);

  for (const [key, count] of summarize(references)) {
    console.log(`- ${key}: ${count}`);
  }

  await appendManifest(args.manifest, {
    status: args.apply ? 'apply-started' : 'dry-run',
    references: references.length,
    summary: Object.fromEntries(summarize(references)),
  });

  if (!args.apply) return;

  for (const reference of references) {
    try {
      let stored = cache.get(reference.oldUrl);
      if (!stored) {
        stored = await writeLocalImage(args.uploadsDir, reference.oldUrl);
        cache.set(reference.oldUrl, stored);
      }

      await applyReference(reference, stored.localUrl);
      migrated += 1;
      await appendManifest(args.manifest, {
        status: 'migrated',
        model: reference.label,
        field: reference.field,
        id: reference.id,
        oldUrl: reference.oldUrl,
        newUrl: stored.localUrl,
        bytes: stored.bytes,
        mimetype: stored.mimetype,
        sha256: stored.sha256,
      });
      console.log(`migrated ${reference.label}.${reference.field} ${reference.id} -> ${stored.localUrl}`);
    } catch (error) {
      failed += 1;
      await appendManifest(args.manifest, {
        status: 'failed',
        model: reference.label,
        field: reference.field,
        id: reference.id,
        oldUrl: reference.oldUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`failed ${reference.label}.${reference.field} ${reference.id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  await appendManifest(args.manifest, {
    status: 'apply-finished',
    references: references.length,
    migrated,
    failed,
  });

  console.log(`Finished. migrated=${migrated} failed=${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
