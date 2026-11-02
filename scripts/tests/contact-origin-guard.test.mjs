import assert from 'node:assert/strict';
import test from 'node:test';
import { loadHandler, secret, header, configuredEnv, validBody } from './helpers/contact-handler.mjs';

for (const [label, configured, headers, expected] of [
  ['missing configuration', undefined, {}, 503],
  ['short configuration', 'a'.repeat(31), {}, 503],
  ['missing origin header', secret, {}, 403],
  ['wrong origin header', secret, { [header]: 'b'.repeat(64) }, 403],
  ['short origin header', secret, { [header]: 'a' }, 403],
  ['non-string origin header', secret, { [header]: [secret] }, 403],
  ['Origin and Referer cannot authenticate', secret, { origin: 'https://www.redremodels.com', referer: 'https://www.redremodels.com/contact-us/' }, 403],
]) {
  test(`${label} rejects before parsing, CAPTCHA, or SES`, async () => {
    const { handler, calls } = await loadHandler({ CLOUDFRONT_ORIGIN_SECRET: configured });
    const response = await handler({ requestContext: { http: { method: 'POST' } }, headers, body: '{invalid' });
    assert.equal(response.statusCode, expected);
    assert.equal(calls.captcha, 0);
    assert.equal(calls.ses, 0);
    assert.ok(!JSON.stringify([response, calls.logs]).includes(secret));
  });
}

test('HTTP API and REST API preflight remain available without secrets', async () => {
  const { handler, calls } = await loadHandler();
  for (const event of [{ requestContext: { http: { method: 'OPTIONS' } } }, { httpMethod: 'OPTIONS' }]) {
    const response = await handler(event);
    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
  }
  assert.equal(calls.ses + calls.captcha, 0);
});

test('matching mixed-case header reaches normal validation', async () => {
  const { handler, calls } = await loadHandler({ CLOUDFRONT_ORIGIN_SECRET: secret });
  const response = await handler({ headers: { 'X-Red-Remodels-Origin-Verify': secret }, body: '{}' });
  assert.equal(response.statusCode, 400);
  assert.match(JSON.parse(response.body).error, /Please fill out/);
  assert.equal(calls.ses + calls.captcha, 0);
});

test('trusted origin cannot bypass missing Turnstile configuration using old Google settings', async () => {
  const { handler, calls } = await loadHandler({ CLOUDFRONT_ORIGIN_SECRET: secret, NODE_ENV: 'production', RECAPTCHA_SECRET: 'old-google-secret', RECAPTCHA_BYPASS: 'true' });
  const response = await handler({ headers: { [header]: secret }, body: JSON.stringify(validBody) });
  assert.equal(response.statusCode, 503);
  assert.equal(calls.ses + calls.captcha, 0);
});

test('trusted origin and verified CAPTCHA can reach mocked SES', async () => {
  const { handler, calls } = await loadHandler(configuredEnv);
  const response = await handler({ headers: { [header]: secret }, body: JSON.stringify(validBody) });
  assert.equal(response.statusCode, 200);
  assert.equal(calls.captcha, 1);
  assert.equal(calls.ses, 1);
});

test('trusted origin does not bypass rejected CAPTCHA', async () => {
  const { handler, calls } = await loadHandler(configuredEnv, { success: false });
  const response = await handler({ headers: { [header]: secret }, body: JSON.stringify(validBody) });
  assert.equal(response.statusCode, 400);
  assert.equal(calls.captcha, 1);
  assert.equal(calls.ses, 0);
});
