import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredEnv, eventFor, loadHandler, validBody } from './helpers/contact-handler.mjs';

for (const [label, override, status] of [
  ['missing secret', { TURNSTILE_SECRET_KEY: '' }, 503],
  ['missing hostname allowlist', { TURNSTILE_ALLOWED_HOSTNAMES: '' }, 503],
  ['wildcard hostname allowlist', { TURNSTILE_ALLOWED_HOSTNAMES: '*' }, 503],
  ['URL instead of hostname', { TURNSTILE_ALLOWED_HOSTNAMES: 'https://www.redremodels.com' }, 503],
]) {
  test(`${label}: no provider call or SES`, async () => {
    const { handler, calls } = await loadHandler({ ...configuredEnv, ...override });
    assert.equal((await handler(eventFor())).statusCode, status);
    assert.equal(calls.captcha + calls.ses, 0);
  });
}
for (const [label, token] of [['missing', undefined], ['empty', ''], ['whitespace', ' '], ['wrong type', {}], ['too long', 'x'.repeat(2049)]]) {
  test(`${label} token: rejected before Siteverify/SES`, async () => {
    const { handler, calls } = await loadHandler(configuredEnv);
    assert.equal((await handler(eventFor({ ...validBody, turnstileToken: token }))).statusCode, 400);
    assert.equal(calls.captcha + calls.ses, 0);
  });
}
for (const [label, result] of [
  ['provider rejection', { success: false, 'error-codes': ['invalid-input-response'] }],
  ['expired/reused token', { success: false, 'error-codes': ['timeout-or-duplicate'] }],
  ['unapproved hostname', { success: true, hostname: 'evil.example', action: 'contact' }],
  ['subdomain suffix attack', { success: true, hostname: 'www.redremodels.com.evil.example', action: 'contact' }],
  ['missing hostname', { success: true, action: 'contact' }],
  ['wrong action', { success: true, hostname: 'www.redremodels.com', action: 'other' }],
  ['missing action', { success: true, hostname: 'www.redremodels.com' }],
  ['non-boolean success', { success: 'true', hostname: 'www.redremodels.com', action: 'contact' }],
  ['null provider result', null],
]) {
  test(`${label}: no SES`, async () => {
    const { handler, calls } = await loadHandler(configuredEnv, result);
    const response = await handler(eventFor({ ...validBody, hostname: 'www.redremodels.com', action: 'contact' }));
    assert.equal(response.statusCode, 400);
    assert.equal(calls.captcha, 1);
    assert.equal(calls.ses, 0);
  });
}
for (const [label, provider] of [
  ['HTTP failure', async () => ({ ok: false })],
  ['invalid JSON', async () => ({ ok: true, json: async () => { throw new Error('private-test-secret test-token'); } })],
  ['network/abort failure', async () => { throw new Error('private-test-secret test-token'); }],
]) {
  test(`${label}: fail closed without logging secrets/tokens`, async () => {
    const { handler, calls } = await loadHandler(configuredEnv, provider);
    const response = await handler(eventFor());
    assert.equal(response.statusCode, 503);
    assert.equal(calls.ses, 0);
    const output = JSON.stringify([response, calls.logs]);
    assert.ok(!output.includes('private-test-secret'));
    assert.ok(!output.includes('test-token'));
  });
}

test('accepted token uses exact endpoint, POST fields, bounded abort signal, and one SES send', async () => {
  const { handler, calls } = await loadHandler(configuredEnv);
  assert.equal((await handler(eventFor())).statusCode, 200);
  assert.equal(calls.ses, 1);
  const { url, options } = calls.requests[0];
  assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(options.method, 'POST');
  assert.equal(options.body.get('secret'), configuredEnv.TURNSTILE_SECRET_KEY);
  assert.equal(options.body.get('response'), validBody.turnstileToken);
  assert.equal(typeof options.signal.addEventListener, 'function');
  assert.equal(options.signal.aborted, false);
});

test('unrecognized provider codes cannot leak arbitrary strings into logs', async () => {
  const { handler, calls } = await loadHandler(configuredEnv, { success: false, 'error-codes': ['private-test-secret', 'test-token', { personal: 'fixture' }, 'timeout-or-duplicate'] });
  await handler(eventFor());
  const logs = JSON.stringify(calls.logs);
  assert.ok(logs.includes('timeout-or-duplicate'));
  assert.ok(!logs.includes('private-test-secret'));
  assert.ok(!logs.includes('test-token'));
  assert.ok(!logs.includes('personal'));
});

test('a legacy Google token does not authenticate a Turnstile request', async () => {
  const { handler, calls } = await loadHandler({ ...configuredEnv, RECAPTCHA_SECRET: 'old-google-secret' });
  const { turnstileToken, ...body } = validBody;
  assert.equal((await handler(eventFor({ ...body, recaptchaToken: 'legacy-token' }))).statusCode, 400);
  assert.equal(calls.captcha + calls.ses, 0);
});

test('replay rejected by Siteverify cannot send email twice', async () => {
  const { handler, calls } = await loadHandler(configuredEnv, async (_url, _options, attempt) => ({ ok: true, json: async () => attempt === 1 ? { success: true, hostname: 'www.redremodels.com', action: 'contact' } : { success: false, 'error-codes': ['timeout-or-duplicate'] } }));
  assert.equal((await handler(eventFor())).statusCode, 200);
  assert.equal((await handler(eventFor())).statusCode, 400);
  assert.equal(calls.ses, 1);
});

test('null/array request bodies return JSON errors rather than throwing', async () => {
  const { handler, calls } = await loadHandler(configuredEnv);
  for (const body of [null, []]) assert.equal((await handler(eventFor(body))).statusCode, 400);
  assert.equal(calls.captcha + calls.ses, 0);
});
