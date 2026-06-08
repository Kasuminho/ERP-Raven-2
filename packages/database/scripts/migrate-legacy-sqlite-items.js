const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const initSqlJs = require('sql.js');
const { PrismaClient } = require('@prisma/client');

const DEFAULT_SQLITE_PATH = 'C:\\Users\\Administrator\\Downloads\\database.db';
const BATCH_SIZE = 250;

function parseArgs(argv) {
  const args = {
    sqlitePath: process.env.LEGACY_SQLITE_PATH || DEFAULT_SQLITE_PATH,
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--apply') {
      args.apply = true;
      continue;
    }

    if (arg === '--dry-run') {
      args.apply = false;
      continue;
    }

    if (arg === '--sqlite') {
      args.sqlitePath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--sqlite=')) {
      args.sqlitePath = arg.slice('--sqlite='.length);
    }
  }

  return args;
}

function rowsFromResult(result) {
  if (!result) {
    return [];
  }

  return result.values.map((values) =>
    Object.fromEntries(result.columns.map((column, index) => [column, values[index]])),
  );
}

function selectRows(db, sql) {
  return rowsFromResult(db.exec(sql)[0]);
}

function epochSecondsToDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return new Date(seconds * 1000);
}

function booleanFromSqlite(value) {
  return Number(value) === 1;
}

function mapTier(category) {
  const normalized = String(category || '').trim().toLowerCase();

  if (normalized === 'legendary') {
    return 'LEGENDARY';
  }

  if (normalized === 'heroic') {
    return 'T4';
  }

  if (normalized === 'rare') {
    return 'T3';
  }

  return null;
}

function mapItemType(typeEn, typePt, kind) {
  const value = normalizeName(`${typeEn || ''} ${typePt || ''} ${kind || ''}`);

  if (value.includes('heavenstone') || value.includes('pedra celestial')) {
    return 'CELESTIAL_STONE';
  }

  if (
    [
      'handgun',
      'aegisblade',
      'bow',
      'greatsword',
      'wand',
      'staff',
      'crossbow',
      'dagger',
      'sphere',
      'weapon',
    ].some((keyword) => value.includes(keyword))
  ) {
    return 'WEAPON';
  }

  if (
    [
      'armor',
      'helmet',
      'helmets',
      'shoes',
      'boots',
      'gloves',
      'top',
      'bottom',
      'pants',
      'cape',
      'armadura',
      'elmo',
      'bota',
      'luva',
      'calca',
      'capa',
    ].some((keyword) => value.includes(keyword))
  ) {
    return 'ARMOR';
  }

  if (
    [
      'ring',
      'earrings',
      'bracelet',
      'totem',
      'accessory',
      'anel',
      'brinco',
      'bracelete',
      'acessorio',
    ].some((keyword) => value.includes(keyword))
  ) {
    return 'ACCESSORY';
  }

  return null;
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildCatalogLookup(catalogItems) {
  const lookup = new Map();

  for (const item of catalogItems) {
    for (const name of [item.namePt, item.nameEn]) {
      const normalized = normalizeName(name);

      if (normalized && !lookup.has(normalized)) {
        lookup.set(normalized, item.id);
      }
    }
  }

  return lookup;
}

async function createManyInBatches(model, rows) {
  let inserted = 0;

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const result = await model.createMany({
      data: batch,
      skipDuplicates: true,
    });

    inserted += result.count;
  }

  return inserted;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sqlitePath = path.resolve(args.sqlitePath);

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite file not found: ${sqlitePath}`);
  }

  const SQL = await initSqlJs();
  const sqliteBytes = fs.readFileSync(sqlitePath);
  const db = new SQL.Database(sqliteBytes);

  const catalogRows = selectRows(
    db,
    `
    SELECT
      id,
      kind,
      category,
      item_pt AS itemPt,
      item_en AS itemEn,
      type_pt AS typePt,
      type_en AS typeEn,
      image1_path AS image1Path,
      image2_path AS image2Path,
      active,
      created_at AS createdAt
    FROM forum_items
    ORDER BY id
    `,
  );

  const itemRequestRows = selectRows(
    db,
    `
    SELECT
      id,
      CAST(discord_id AS TEXT) AS discordId,
      player_name AS playerName,
      item_name AS itemName,
      total_quantity AS totalQuantity,
      remaining_quantity AS remainingQuantity,
      rank_position AS rankPosition,
      CAST(thread_id AS TEXT) AS threadId,
      CAST(thread_channel_id AS TEXT) AS threadChannelId,
      created_at AS createdAt,
      last_update AS lastUpdate,
      warned_3d AS warned3d,
      warned_4d AS warned4d
    FROM item_requests
    ORDER BY id
    `,
  );

  const dropRows = selectRows(
    db,
    `
    SELECT
      id,
      CAST(discord_id AS TEXT) AS discordId,
      nickname_ingame AS nicknameIngame,
      item AS itemName,
      CAST(thread_id AS TEXT) AS threadId,
      CAST(staff_id AS TEXT) AS staffDiscordId,
      delivered_at AS deliveredAt
    FROM drops
    ORDER BY id
    `,
  );

  const emptyOperationalTables = selectRows(
    db,
    `
    SELECT 'dkp_bids' AS tableName, COUNT(*) AS count FROM dkp_bids
    UNION ALL
    SELECT 'dkp_bid_entries' AS tableName, COUNT(*) AS count FROM dkp_bid_entries
    UNION ALL
    SELECT 'dkp_transactions' AS tableName, COUNT(*) AS count FROM dkp_transactions
    `,
  );

  console.log('Legacy SQLite:', sqlitePath);
  console.log('Catalog items:', catalogRows.length);
  console.log('Item requests:', itemRequestRows.length);
  console.log('Drop history rows:', dropRows.length);
  console.log('Operational DKP tables:', emptyOperationalTables);

  if (!args.apply) {
    console.log('\nDry run only. Re-run with --apply to write into PostgreSQL.');
    db.close();
    return;
  }

  const prisma = new PrismaClient();

  try {
    const now = new Date();
    const catalogData = catalogRows.map((row) => ({
      id: randomUUID(),
      legacyId: Number(row.id),
      kind: String(row.kind || 'unknown'),
      category: String(row.category || 'unknown'),
      itemTier: mapTier(row.category),
      itemType: mapItemType(row.typeEn, row.typePt, row.kind),
      namePt: String(row.itemPt || row.itemEn || 'Unknown item'),
      nameEn: String(row.itemEn || row.itemPt || 'Unknown item'),
      typePt: String(row.typePt || ''),
      typeEn: String(row.typeEn || ''),
      image1Url: row.image1Path ? String(row.image1Path) : null,
      image2Url: row.image2Path ? String(row.image2Path) : null,
      isActive: booleanFromSqlite(row.active),
      legacyCreatedAt: epochSecondsToDate(row.createdAt),
      createdAt: now,
      updatedAt: now,
    }));

    const insertedCatalog = await createManyInBatches(prisma.itemCatalog, catalogData);
    const persistedCatalog = await prisma.itemCatalog.findMany({
      select: {
        id: true,
        namePt: true,
        nameEn: true,
      },
    });
    const catalogLookup = buildCatalogLookup(persistedCatalog);

    const itemRequestData = itemRequestRows.map((row) => ({
      id: randomUUID(),
      legacyId: Number(row.id),
      itemCatalogId: catalogLookup.get(normalizeName(row.itemName)) || null,
      discordId: String(row.discordId),
      playerName: String(row.playerName || ''),
      itemName: String(row.itemName || ''),
      totalQuantity: Number(row.totalQuantity || 0),
      remainingQuantity: Number(row.remainingQuantity || 0),
      rankPosition: Math.max(1, Number(row.rankPosition || 1)),
      threadId: String(row.threadId || ''),
      threadChannelId: String(row.threadChannelId || ''),
      warned3d: booleanFromSqlite(row.warned3d),
      warned4d: booleanFromSqlite(row.warned4d),
      legacyCreatedAt: epochSecondsToDate(row.createdAt),
      legacyUpdatedAt: epochSecondsToDate(row.lastUpdate),
      createdAt: now,
      updatedAt: now,
    }));

    const insertedRequests = await createManyInBatches(prisma.itemRequest, itemRequestData);

    const dropHistoryData = dropRows.map((row) => ({
      id: randomUUID(),
      legacyId: Number(row.id),
      itemCatalogId: catalogLookup.get(normalizeName(row.itemName)) || null,
      discordId: row.discordId ? String(row.discordId) : null,
      nicknameIngame: row.nicknameIngame ? String(row.nicknameIngame) : null,
      itemName: row.itemName ? String(row.itemName) : null,
      threadId: row.threadId ? String(row.threadId) : null,
      staffDiscordId: row.staffDiscordId ? String(row.staffDiscordId) : null,
      deliveredAt: epochSecondsToDate(row.deliveredAt),
      createdAt: now,
    }));

    const insertedDrops = await createManyInBatches(prisma.dropHistory, dropHistoryData);

    await prisma.auditLog.create({
      data: {
        action: 'LEGACY_SQLITE_ITEM_IMPORT',
        targetType: 'LegacySQLite',
        targetId: path.basename(sqlitePath),
        metadata: {
          sqlitePath,
          catalogRows: catalogRows.length,
          itemRequestRows: itemRequestRows.length,
          dropRows: dropRows.length,
          insertedCatalog,
          insertedRequests,
          insertedDrops,
          operationalTables: emptyOperationalTables,
        },
      },
    });

    console.log('\nImport completed.');
    console.log('Inserted catalog items:', insertedCatalog);
    console.log('Inserted item requests:', insertedRequests);
    console.log('Inserted drop history rows:', insertedDrops);
  } finally {
    await prisma.$disconnect();
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
