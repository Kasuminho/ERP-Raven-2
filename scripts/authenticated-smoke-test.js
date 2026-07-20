const baseUrl = (process.env.SMOKE_BASE_URL ?? process.env.SMOKE_API_URL ?? 'https://app.guild-g3x.com.br/api/v1').replace(/\/$/, '');
const token = process.env.SMOKE_AUTH_TOKEN ?? process.env.SMOKE_BEARER_TOKEN ?? '';
const allowEmptyAuctions = process.env.SMOKE_ALLOW_EMPTY_AUCTIONS === 'true';

if (!token) {
  console.error('Authenticated smoke requires SMOKE_AUTH_TOKEN or SMOKE_BEARER_TOKEN.');
  process.exit(1);
}

async function request(path) {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let body;

    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text;
    }

    return {
      path,
      status: response.status,
      ok: response.ok,
      latencyMs: Date.now() - startedAt,
      body,
    };
  } catch (error) {
    return {
      path,
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown error.',
    };
  }
}

function assertCheck(result, validate) {
  const valid = result.ok && (!validate || validate(result.body));

  return {
    path: result.path,
    ok: valid,
    status: result.status,
    latencyMs: result.latencyMs,
    message: valid ? undefined : summarizeFailure(result),
  };
}

function summarizeFailure(result) {
  if (result.error) return result.error;
  if (!result.ok) return `HTTP ${result.status}`;
  return 'Unexpected response shape.';
}

async function main() {
  const checks = [];

  checks.push(assertCheck(await request('/auth/me'), (body) => Boolean(body?.userId || body?.discordId)));
  checks.push(assertCheck(await request('/operations/staff'), (body) => Array.isArray(body?.tasks) && Boolean(body?.counts)));
  checks.push(assertCheck(await request('/drops/pending-auction-deliveries?page=1&limit=5'), (body) => Boolean(body)));
  checks.push(assertCheck(await request('/diamond-sales/setup'), (body) => Array.isArray(body?.items) && Array.isArray(body?.activePlayers)));
  checks.push(assertCheck(await request('/health/details'), (body) => Array.isArray(body?.checks) && Boolean(body?.status)));
  checks.push(assertCheck(await request('/operations/staff/deploy'), (body) => Boolean(body?.currentApiVersion && body?.publicSmoke)));

  const optionsResult = await request('/operations/staff/auction-diagnostics/options');
  const optionsCheck = assertCheck(optionsResult, (body) => Array.isArray(body));
  checks.push(optionsCheck);

  const options = Array.isArray(optionsResult.body) ? optionsResult.body : [];
  if (options.length > 0) {
    const auctionId = options[0]?.id;
    checks.push(assertCheck(
      await request(`/operations/staff/auction-diagnostics/${auctionId}`),
      (body) => Boolean(body?.auction?.id && body?.stateReason),
    ));
  } else {
    checks.push({
      path: '/operations/staff/auction-diagnostics/:auctionId',
      ok: allowEmptyAuctions,
      status: allowEmptyAuctions ? 204 : undefined,
      latencyMs: 0,
      message: allowEmptyAuctions ? 'Skipped because no auction exists.' : 'No auction option available for diagnostics smoke.',
    });
  }

  const failed = checks.filter((check) => !check.ok);
  const output = {
    ok: failed.length === 0,
    baseUrl,
    checkedAt: new Date().toISOString(),
    checks,
  };

  console.log(JSON.stringify(output, null, 2));

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
