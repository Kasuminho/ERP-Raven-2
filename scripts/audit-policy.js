const { spawnSync } = require('node:child_process');

const maxHigh = 8;
const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm audit --omit=dev --json']
  : ['audit', '--omit=dev', '--json'];
const audit = spawnSync(command, args, {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error(audit.stderr || audit.stdout || 'npm audit did not return valid JSON.');
  process.exit(1);
}

const vulnerabilities = report.metadata?.vulnerabilities ?? {};
const critical = vulnerabilities.critical ?? 0;
const high = vulnerabilities.high ?? 0;

console.log(`Production audit: ${critical} critical, ${high} high, ${vulnerabilities.total ?? 0} total.`);
if (critical > 0 || high > maxHigh) {
  console.error(`Audit policy failed. Allowed baseline: 0 critical and at most ${maxHigh} high.`);
  process.exit(1);
}
