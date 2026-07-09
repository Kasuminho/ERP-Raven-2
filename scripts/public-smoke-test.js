const dns = require('node:dns');
const http = require('node:http');
const https = require('node:https');

const baseUrl = (process.env.SMOKE_BASE_URL ?? 'https://app.guild-g3x.com.br/api/v1').replace(/\/$/, '');
const attempts = Number(process.env.SMOKE_ATTEMPTS ?? 6);
const delayMs = Number(process.env.SMOKE_DELAY_MS ?? 10_000);
const fetchTimeoutMs = Number(process.env.SMOKE_FETCH_TIMEOUT_MS ?? 10_000);
const dnsOrder = process.env.SMOKE_DNS_ORDER ?? 'ipv4first';
const dnsFamily = dnsOrder === 'ipv4first' ? 4 : dnsOrder === 'ipv6first' ? 6 : undefined;
const userAgent = process.env.SMOKE_USER_AGENT ?? 'Raven2PublicSmoke/1.0';
const expectedVersion = process.env.EXPECTED_VERSION ?? '';
const paths = ['/health', '/auctions/health', '/items/health', '/eligibility/health', '/audit/health'];

dns.setDefaultResultOrder(dnsOrder);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function requestWithTimeout(url, attempt) {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set('_smoke', `${process.env.EXPECTED_VERSION ?? 'manual'}-${attempt}-${Date.now()}`);
  const client = parsedUrl.protocol === 'http:' ? http : https;
  const options = {
    family: dnsFamily,
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'User-Agent': userAgent,
    },
    timeout: fetchTimeoutMs,
  };

  return new Promise((resolve, reject) => {
    const request = client.get(parsedUrl, options, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve({ status: response.statusCode, body });
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error(`timeout after ${fetchTimeoutMs}ms`));
    });
    request.on('error', reject);
  });
}

async function check(attempt) {
  const results = await Promise.all(paths.map(async (path) => {
    try {
      const response = await requestWithTimeout(`${baseUrl}${path}`, attempt);
      const body = path === '/health' ? JSON.parse(response.body) : undefined;
      const versionMatches = path !== '/health' || !expectedVersion || body?.version === expectedVersion;
      return { path, status: response.status, ...(body?.version ? { version: body.version } : {}), versionMatches };
    } catch (error) {
      return { path, error: error.message };
    }
  }));
  return { ok: results.every((result) => result.status === 200 && result.versionMatches !== false), results };
}

async function main() {
  console.log(JSON.stringify({ baseUrl, attempts, delayMs, fetchTimeoutMs, dnsOrder, dnsFamily, userAgent, expectedVersion, paths }, null, 2));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await check(attempt);
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
