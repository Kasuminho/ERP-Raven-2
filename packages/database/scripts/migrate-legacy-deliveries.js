const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');
const { PrismaClient } = require('@prisma/client');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_SQLITE_PATH = path.join(ROOT, 'database.db');
const PRESERVED_TABLES = new Set(['_prisma_migrations', 'User', 'Player', 'GuildRole', 'PlayerRole', 'ItemCatalog']);
const REQUEST_EXEMPTIONS = new Set(['creature of gaiety', 'elder dragon isteria', 'carnival queen']);
const REQUEST_CATEGORIES = new Map([
  ['mysterious essence of magic', 'relic'],
  ['dazzling mirror of harmony', 'relic'],
  ['burning eye of chaos', 'relic'],
  ['strong loop of perseverance', 'relic'],
  ["noble prophet's blood", 'relic'],
  ['shinning ancient tablet', 'relic'],
  ['heroic weapon crafting blueprint fragment', 'blueprint'],
  ['heroic armor crafting blueprint fragment', 'blueprint'],
  ['heroic accessory crafting blueprint fragment', 'blueprint'],
  ['heroic skill book blueprint fragment', 'blueprint'],
  ['heroic skill crafting blueprint fragment', 'blueprint'],
  ['creature of gaiety', 'creature'],
  ['elder dragon isteria', 'creature'],
  ['carnival queen', 'creature'],
]);
const DROP_ITEM_ALIASES = new Map([
  ['adagas sociedade da aurora', 'adagas da sociedade da aurora cinzenta'],
  ['arco aurora', 'sociedade da aurora cinzenta arco'],
  ['arco sociedade da aurora cinzenta', 'sociedade da aurora cinzenta arco'],
  ['arremeso de lanca', 'arremesso de lanca'],
  ['ataque multiplos', 'ataques multiplos'],
  ['bota do night stalker', 'botas do night stalker'],
  ['brincos do imortal', 'bricos do imortal'],
  ['cal of madness', 'call of madness'],
  ['chamado da temspetade', 'chamado da tempestade'],
  ['chapeu eu da sombra', 'chapeu veu da sombra'],
  ['chauva de flechas', 'chuva de flechas'],
  ['chuvva de flechas', 'chuva de flechas'],
  ['esfera elemental aurora', 'sociedade da aurora cinzenta esfera elemental'],
  ['espirito inflamvevl', 'espirito inflamavel'],
  ['explosao e sangue', 'explosao de sangue'],
  ['golpe de rochja', 'golpe de rocha'],
  ['golpe duplo', 'golpe duplo de atordoamento'],
  ['lh golpe duplo', 'golpe duplo de atordoamento'],
  ['gravas do rei sagrado', 'greaves of the holy king'],
  ['greavas do rei sagrado', 'greaves of the holy king'],
  ['grevas do rei sagrado', 'greaves of the holy king'],
  ['heroic skill crafting blueprint fragment', 'heroic skill book blueprint fragment'],
  ['javelin throw', 'javelyn throw'],
  ['lanca relampago', 'lanca de relampago'],
  ['lh golpe duplo', 'lh - golpe duplo de atordoamento'],
  ['lighting storm', 'lightning storm'],
  ['manoplhas do rei sagrado', 'manoplas do rei sagrado'],
  ['manoplas do santo sombrio', 'manoplhas do santo sombrio'],
  ['pedra de aprimoramento heroico', 'pedra de aprimoramento heroica'],
  ['pedra de aprimoramento rara', 'pedra de aprimoramento de habilidade rara'],
  ['pedra heroica', 'pedra de aprimoramento heroica'],
  ['piscar de revila', 'piscar de revilla'],
  ['protetores de maos do guardiao do crespusculo', 'protetores de maos do guardiao do crepusculo'],
  ['pulseira do arbitro fantasma', 'pulseiras do arbitro fantasma'],
  ['rchamado da da loucura', 'chamado da loucura'],
  ['tpque congelante', 'toque congelante da escuridao'],
  ['varinha magica aurora', 'sociedade da aurora cinzenta varinha magica'],
]);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = {
    sqlitePath: process.env.LEGACY_SQLITE_PATH || DEFAULT_SQLITE_PATH,
    apply: false,
    clean: false,
    includeOpenRequests: false,
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

    if (arg === '--clean') {
      args.clean = true;
      continue;
    }

    if (arg === '--include-open-requests') {
      args.includeOpenRequests = true;
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
  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return new Date(seconds * 1000);
}

function booleanFromSqlite(value) {
  return Number(value) === 1;
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ');
}

function normalizeDropName(value) {
  return normalizeName(value)
    .replace(/^(lh|pve|pvp)\s*[-:]\s*/i, '')
    .replace(/^livro\s+de\s+/i, '')
    .trim();
}

function mapTier(category) {
  const normalized = normalizeName(category);

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
  const value = normalizeName(`${typeEn || ''} ${typePt || ''} ${kind || ''}`).replace(/\s/g, '');

  if (value.includes('heavenstone') || value.includes('pedracelestial')) {
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
      'arma',
      'adaga',
      'arco',
      'esfera',
    ].some((keyword) => value.includes(keyword))
  ) {
    return 'WEAPON';
  }

  if (
    [
      'armor',
      'helmet',
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
      'manto',
      'perneira',
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
      'pulseira',
      'bracelete',
      'acessorio',
      'totem',
    ].some((keyword) => value.includes(keyword))
  ) {
    return 'ACCESSORY';
  }

  return null;
}

function catalogPayload(row) {
  return {
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
  };
}

function buildCatalogLookup(catalogItems) {
  const lookup = new Map();

  for (const item of catalogItems) {
    for (const name of [item.namePt, item.nameEn, item.nameEs]) {
      const normalized = normalizeDropName(name);

      if (normalized && !lookup.has(normalized)) {
        lookup.set(normalized, item.id);
      }
    }
  }

  for (const [source, target] of DROP_ITEM_ALIASES.entries()) {
    const targetId = lookup.get(target);

    if (targetId && !lookup.has(source)) {
      lookup.set(source, targetId);
    }
  }

  return lookup;
}

function resolveCatalogId(itemName, lookup) {
  const normalized = normalizeDropName(itemName);
  const alias = DROP_ITEM_ALIASES.get(normalized);

  if (lookup.has(normalized)) {
    return lookup.get(normalized);
  }

  if (alias && lookup.has(alias)) {
    return lookup.get(alias);
  }

  const compact = normalized.replace(/[^a-z0-9]/g, '');

  for (const [catalogName, id] of lookup.entries()) {
    const catalogCompact = catalogName.replace(/[^a-z0-9]/g, '');

    if (compact && (compact.includes(catalogCompact) || catalogCompact.includes(compact))) {
      return id;
    }
  }

  return null;
}

function validateRequestLocks(itemRequestRows) {
  const conflicts = [];
  const grouped = new Map();

  for (const row of itemRequestRows) {
    const itemKey = normalizeName(row.itemName);

    if (REQUEST_EXEMPTIONS.has(itemKey)) {
      continue;
    }

    const category = REQUEST_CATEGORIES.get(itemKey) || 'unknown';
    const key = `${row.discordId}:${category}`;
    const current = grouped.get(key) || [];
    current.push(row);
    grouped.set(key, current);
  }

  for (const [key, rows] of grouped.entries()) {
    const uniqueItems = new Set(rows.map((row) => normalizeName(row.itemName)));

    if (uniqueItems.size > 1) {
      conflicts.push({ key, rows });
    }
  }

  return conflicts;
}

async function cleanOperationalData(prisma) {
  const tableRows = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `;
  const tables = tableRows
    .map((row) => row.tablename)
    .filter((name) => !PRESERVED_TABLES.has(name))
    .sort();

  if (tables.length === 0) {
    return [];
  }

  const statement = `TRUNCATE TABLE ${tables.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`;
  await prisma.$executeRawUnsafe(statement);
  return tables;
}

async function upsertCatalog(prisma, catalogRows) {
  let created = 0;
  let updated = 0;

  for (const row of catalogRows) {
    const legacyId = Number(row.id);
    const data = catalogPayload(row);
    const existing = await prisma.itemCatalog.findUnique({ where: { legacyId } });

    if (existing) {
      await prisma.itemCatalog.update({ where: { legacyId }, data });
      updated += 1;
      continue;
    }

    await prisma.itemCatalog.create({ data: { legacyId, ...data } });
    created += 1;
  }

  return { created, updated };
}

async function buildPlayerLookup(prisma) {
  const users = await prisma.user.findMany({
    include: {
      players: {
        orderBy: [{ isActive: 'desc' }, { joinedAt: 'asc' }],
      },
    },
  });
  const lookup = new Map();

  for (const user of users) {
    const player = user.players[0];

    if (player) {
      lookup.set(user.discordId, player.id);
    }
  }

  return lookup;
}

async function upsertOpenRequests(prisma, itemRequestRows, catalogLookup, playerLookup) {
  let created = 0;
  let updated = 0;
  let matchedCatalog = 0;
  let matchedPlayer = 0;
  const unmatchedItems = new Map();
  const unmatchedPlayers = new Set();

  for (const row of itemRequestRows) {
    const legacyId = Number(row.id);
    const discordId = String(row.discordId);
    const itemName = normalizeName(row.itemName);
    const itemCatalogId = resolveCatalogId(row.itemName, catalogLookup);
    const playerId = playerLookup.get(discordId) || null;
    const createdAt = epochSecondsToDate(row.createdAt);
    const updatedAt = epochSecondsToDate(row.lastUpdate);
    const data = {
      itemCatalogId,
      playerId,
      discordId,
      playerName: String(row.playerName || ''),
      itemName,
      totalQuantity: Math.max(0, Number(row.totalQuantity || 0)),
      remainingQuantity: Math.max(0, Number(row.remainingQuantity || 0)),
      rankPosition: Math.max(1, Number(row.rankPosition || 1)),
      threadId: row.threadId ? String(row.threadId) : null,
      threadChannelId: row.threadChannelId ? String(row.threadChannelId) : null,
      warned3d: booleanFromSqlite(row.warned3d),
      warned4d: booleanFromSqlite(row.warned4d),
      legacyCreatedAt: createdAt,
      legacyUpdatedAt: updatedAt,
    };
    const existing = await prisma.itemRequest.findUnique({ where: { legacyId } });

    if (itemCatalogId) {
      matchedCatalog += 1;
    } else if (row.itemName) {
      unmatchedItems.set(String(row.itemName), (unmatchedItems.get(String(row.itemName)) || 0) + 1);
    }

    if (playerId) {
      matchedPlayer += 1;
    } else {
      unmatchedPlayers.add(discordId);
    }

    if (existing) {
      await prisma.itemRequest.update({ where: { legacyId }, data });
      updated += 1;
      continue;
    }

    await prisma.itemRequest.create({ data: { legacyId, ...data } });
    created += 1;
  }

  return {
    created,
    updated,
    matchedCatalog,
    matchedPlayer,
    unmatchedItems: Array.from(unmatchedItems.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([itemName, count]) => ({ itemName, count })),
    unmatchedPlayerCount: unmatchedPlayers.size,
  };
}

async function upsertDrops(prisma, dropRows, catalogLookup, playerLookup) {
  let created = 0;
  let updated = 0;
  let matchedCatalog = 0;
  let matchedPlayer = 0;
  const unmatchedItems = new Map();
  const unmatchedPlayers = new Set();

  for (const row of dropRows) {
    const legacyId = Number(row.id);
    const discordId = row.discordId ? String(row.discordId) : null;
    const itemCatalogId = resolveCatalogId(row.itemName, catalogLookup);
    const playerId = discordId ? playerLookup.get(discordId) || null : null;
    const deliveredAt = epochSecondsToDate(row.deliveredAt);
    const data = {
      itemCatalogId,
      playerId,
      discordId,
      nicknameIngame: row.nicknameIngame ? String(row.nicknameIngame) : null,
      itemName: row.itemName ? String(row.itemName) : null,
      threadId: row.threadId ? String(row.threadId) : null,
      staffDiscordId: row.staffDiscordId ? String(row.staffDiscordId) : null,
      deliveredAt,
      createdAt: deliveredAt || new Date(),
    };
    const existing = await prisma.dropHistory.findUnique({ where: { legacyId } });

    if (itemCatalogId) {
      matchedCatalog += 1;
    } else if (row.itemName) {
      unmatchedItems.set(String(row.itemName), (unmatchedItems.get(String(row.itemName)) || 0) + 1);
    }

    if (playerId) {
      matchedPlayer += 1;
    } else if (discordId) {
      unmatchedPlayers.add(discordId);
    }

    if (existing) {
      await prisma.dropHistory.update({ where: { legacyId }, data });
      updated += 1;
      continue;
    }

    await prisma.dropHistory.create({ data: { legacyId, ...data } });
    created += 1;
  }

  return {
    created,
    updated,
    matchedCatalog,
    matchedPlayer,
    unmatchedItems: Array.from(unmatchedItems.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([itemName, count]) => ({ itemName, count })),
    unmatchedPlayerCount: unmatchedPlayers.size,
  };
}

async function main() {
  loadEnvFile(path.join(ROOT, '.env'));
  loadEnvFile(path.join(ROOT, 'packages', 'database', '.env'));

  const args = parseArgs(process.argv.slice(2));
  const sqlitePath = path.resolve(args.sqlitePath);

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite file not found: ${sqlitePath}`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(sqlitePath));

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

  const dropRows = selectRows(
    db,
    `
    SELECT
      id,
      CASE WHEN discord_id IS NULL THEN NULL ELSE printf('%lld', discord_id) END AS discordId,
      nickname_ingame AS nicknameIngame,
      item AS itemName,
      CASE WHEN thread_id IS NULL THEN NULL ELSE printf('%lld', thread_id) END AS threadId,
      CASE WHEN staff_id IS NULL THEN NULL ELSE printf('%lld', staff_id) END AS staffDiscordId,
      delivered_at AS deliveredAt
    FROM drops
    ORDER BY id
    `,
  );

  const itemRequestRows = selectRows(
    db,
    `
    SELECT
      id,
      printf('%lld', discord_id) AS discordId,
      player_name AS playerName,
      item_name AS itemName,
      total_quantity AS totalQuantity,
      remaining_quantity AS remainingQuantity,
      rank_position AS rankPosition,
      printf('%lld', thread_id) AS threadId,
      printf('%lld', thread_channel_id) AS threadChannelId,
      created_at AS createdAt,
      last_update AS lastUpdate,
      warned_3d AS warned3d,
      warned_4d AS warned4d
    FROM item_requests
    ORDER BY item_name, rank_position
    `,
  );
  const lockConflicts = validateRequestLocks(itemRequestRows);

  console.log('Legacy SQLite:', sqlitePath);
  console.log('Apply mode:', args.apply ? 'YES' : 'NO');
  console.log('Clean operational data first:', args.clean ? 'YES' : 'NO');
  console.log('Include open legacy requests:', args.includeOpenRequests ? 'YES' : 'NO');
  console.log('Catalog rows to upsert:', catalogRows.length);
  console.log('Delivered drops to upsert:', dropRows.length);
  console.log(args.includeOpenRequests ? 'Open legacy item requests to upsert:' : 'Open legacy item requests to skip:', itemRequestRows.length);
  console.log('Legacy request lock conflicts:', lockConflicts.length);

  if (lockConflicts.length > 0) {
    console.log('Top lock conflicts:');
    for (const conflict of lockConflicts.slice(0, 10)) {
      console.log(
        `- ${conflict.key}: ${conflict.rows.map((row) => `${row.playerName}/${row.itemName}`).join(' | ')}`,
      );
    }
  }

  if (!args.apply) {
    console.log('\nDry run only. Re-run with --apply to write into PostgreSQL.');
    db.close();
    return;
  }

  const prisma = new PrismaClient();

  try {
    let cleanedTables = [];

    if (args.clean) {
      cleanedTables = await cleanOperationalData(prisma);
    }

    const catalogResult = await upsertCatalog(prisma, catalogRows);
    const persistedCatalog = await prisma.itemCatalog.findMany({
      select: { id: true, namePt: true, nameEn: true, nameEs: true },
    });
    const catalogLookup = buildCatalogLookup(persistedCatalog);
    const playerLookup = await buildPlayerLookup(prisma);
    const dropResult = await upsertDrops(prisma, dropRows, catalogLookup, playerLookup);
    const requestResult = args.includeOpenRequests
      ? await upsertOpenRequests(prisma, itemRequestRows, catalogLookup, playerLookup)
      : null;

    await prisma.auditLog.create({
      data: {
        action: 'LEGACY_DELIVERIES_IMPORT',
        targetType: 'LegacySQLite',
        targetId: path.basename(sqlitePath),
        metadata: {
          sqlitePath,
          cleanedTables,
          catalogRows: catalogRows.length,
          dropRows: dropRows.length,
          skippedOpenRequests: args.includeOpenRequests ? 0 : itemRequestRows.length,
          importedOpenRequests: args.includeOpenRequests ? itemRequestRows.length : 0,
          lockConflicts: lockConflicts.length,
          catalogResult,
          dropResult,
          requestResult,
        },
      },
    });

    console.log('\nImport completed.');
    console.log('Cleaned tables:', cleanedTables.join(', ') || 'none');
    console.log('Catalog:', catalogResult);
    console.log('Drops:', dropResult);
    console.log('Open requests:', requestResult || 'skipped');
  } finally {
    await prisma.$disconnect();
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
