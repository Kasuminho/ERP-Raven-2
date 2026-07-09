const baseUrl = (process.env.SMOKE_BASE_URL ?? 'https://app.guild-g3x.com.br/api/v1').replace(/\/$/, '');
const attempts = Number(process.env.SMOKE_ATTEMPTS ?? 6);
const delayMs = Number(process.env.SMOKE_DELAY_MS ?? 10_000);
const fetchTimeoutMs = Number(process.env.SMOKE_FETCH_TIMEOUT_MS ?? 10_000);
const expectedVersion = process.env.EXPECTED_VERSION ?? '';
const paths = ['/health', '/auctions/health', '/items/health', '/eligibility/health', '/audit/health'];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`timeout after ${fetchTimeoutMs}ms`)), fetchTimeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function check() {
  const results = await Promise.all(paths.map(async (path) => {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${path}`);
      const body = path === '/health' ? await response.json().catch(() => undefined) : undefined;
      const versionMatches = path !== '/health' || !expectedVersion || body?.version === expectedVersion;
      return { path, status: response.status, ...(body?.version ? { version: body.version } : {}), versionMatches };
    } catch (error) {
      return { path, error: error.message };
    }
  }));
  return { ok: results.every((result) => result.status === 200 && result.versionMatches !== false), results };
}

async function main() {
  console.log(JSON.stringify({ baseUrl, attempts, delayMs, fetchTimeoutMs, expectedVersion, paths }, null, 2));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await check();
    if (result.ok) {
      console.log(JSON.stringify({ ok: true, baseUrl, attempt, checks: result.results }, null, 2));
      return;
    }
    console.error(`Public smoke attempt ${attempt}/${attempts} failed: ${JSON.stringify(result.results)}`);
    if (attempt < attempts) await sleep(delayMs);
  }
  process.exitCode = 1;
}

main();
