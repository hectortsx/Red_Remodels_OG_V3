import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Read-only AWS calls. Snapshots contain secrets and must stay on this computer.
const root = fileURLToPath(new URL('../', import.meta.url));
const profile = process.env.AWS_PROFILE || 'red-remodels-deployer';
const region = 'us-east-1';
const distribution = 'EKTYEDHVURFWC';
const api = '4cktifwaki';
const lambda = 'red-remodels-contact-handler';

if (process.argv.length > 2) {
  console.error('Usage: AWS_PROFILE=red-remodels-deployer node scripts/capture-waf-baseline.mjs');
  process.exit(1);
}

process.umask(0o077);
const parent = path.join(root, '.local/waf-baselines');
mkdirSync(parent, { recursive: true, mode: 0o700 });
const directory = mkdtempSync(path.join(parent, `${new Date().toISOString().replaceAll(':', '-')}-`));
const save = (name, value) => writeFileSync(path.join(directory, name), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
const manifest = { capturedAt: new Date().toISOString(), profile, region, distribution, api, lambda, complete: false };
save('manifest.json', manifest);

const capture = (name, args) => {
  const result = spawnSync('aws', [...args, '--region', region, '--profile', profile, '--output', 'json', '--no-cli-pager'], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, AWS_PAGER: '' },
  });
  // Do not echo CLI output: it can include environment values or origin headers.
  if (result.error || result.status !== 0) throw new Error(`${name} failed; check AWS login and read permissions. Baseline is incomplete.`);
  let value;
  try { value = JSON.parse(result.stdout); }
  catch { throw new Error(`${name} returned invalid JSON. Baseline is incomplete.`); }
  save(`${name}.json`, value);
  return value;
};

try {
  const identity = capture('identity', ['sts', 'get-caller-identity']);
  if (identity.Account !== '365608889294') throw new Error('Unexpected AWS account. Baseline is incomplete.');
  capture('cloudfront-config', ['cloudfront', 'get-distribution-config', '--id', distribution]);
  capture('cloudfront-status', ['cloudfront', 'get-distribution', '--id', distribution]);
  capture('lambda-config', ['lambda', 'get-function-configuration', '--function-name', lambda]);
  capture('api', ['apigatewayv2', 'get-api', '--api-id', api]);
  capture('routes', ['apigatewayv2', 'get-routes', '--api-id', api]);
  capture('integrations', ['apigatewayv2', 'get-integrations', '--api-id', api]);
  capture('stages', ['apigatewayv2', 'get-stages', '--api-id', api]);
  manifest.complete = true;
  save('manifest.json', manifest);
  console.log(`Private AWS baseline saved to ${path.relative(root, directory)}`);
  console.log('Review locally. Do not commit or paste snapshots: they contain secrets.');
  console.log('Also download the currently deployed Lambda ZIP and record live form settings before task 4.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
