import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { createContext, runInContext } from 'node:vm';

const source = await readFile(new URL('../../public/assets/js/contact-form.js', import.meta.url), 'utf8');
const flush = () => new Promise((resolve) => setImmediate(resolve));
const fixture = ({ sitekey = 'public-fixture-key', hasSdk = true, fetchImpl, valid = true, action = '/api/contact', formsCount = 1, deferReady = false } = {}) => {
  const calls = { requests: [], rendered: [], executed: [], removed: [], scripts: [], reset: 0, diagnostics: [] };
  const timers = new Map();
  let nextTimer = 0;
  const sdk = {
    ready() { throw new Error('Use the named SDK onload callback for async loading.'); },
    render(container, options) { const id = String(calls.rendered.length); calls.rendered.push({ id, container, options }); return id; },
    execute(id) { calls.executed.push(id); },
    remove(id) { calls.removed.push(id); },
  };
  const forms = Array.from({ length: formsCount }, (_, index) => {
    const status = { hidden: true, textContent: '', dataset: {} };
    const button = { disabled: false };
    const container = { hidden: true };
    const handlers = {};
    return {
      dataset: { secureForm: `fixture-${index}` }, status, button, container, handlers,
      querySelector(selector) { return { '[data-form-status]': status, '[data-form-submit]': button, '[data-turnstile]': container }[selector]; },
      addEventListener(type, callback) { handlers[type] = callback; },
      reportValidity: () => valid,
      getAttribute: (name) => name === 'action' ? action : null,
      reset() { calls.reset++; },
    };
  });
  const window = { RED_REMODELS_CONTACT: { turnstileSiteKey: sitekey }, location: new URL('https://www.redremodels.com/contact-us/') };
  if (hasSdk && !deferReady) window.turnstile = sdk;
  const context = createContext({
    window, URL,
    console: { warn: (...args) => calls.diagnostics.push(args.join(' ')) },
    document: {
      readyState: 'complete',
      getElementById: () => null,
      querySelectorAll: () => forms,
      createElement: () => ({ remove() { this.removed = true; } }),
      head: { appendChild(script) { calls.scripts.push(script); } },
    },
    FormData: class { entries() { return Object.entries({ name: 'Jane', email: 'jane@example.com', phone: '7205550123', message: 'Fixture', recaptchaToken: 'stale-google-token' }); } },
    fetch: async (url, options) => {
      calls.requests.push({ url, options });
      if (fetchImpl) return fetchImpl(url, options);
      return { ok: true, json: async () => ({ ok: true }) };
    },
    setTimeout(callback, ms) { const id = ++nextTimer; timers.set(id, { callback, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  runInContext(source, context);
  return { calls, forms, window, sdk, timers, submit: (index = 0) => forms[index].handlers.submit({ preventDefault() {} }) };
};

for (const [label, options] of [['missing public key', { sitekey: '' }], ['invalid form', { valid: false }]]) {
  test(`${label}: no widget or contact POST`, async () => {
    const f = fixture(options);
    await f.submit();
    assert.equal(f.calls.requests.length + f.calls.rendered.length, 0);
    assert.equal(f.forms[0].button.disabled, false);
    if (options.sitekey === '') assert.match(f.forms[0].status.textContent, /720/);
  });
}

test('submit waits for verification and suppresses double clicks', async () => {
  const f = fixture();
  const pending = f.submit();
  await flush();
  assert.equal(f.forms[0].button.disabled, true);
  assert.equal(f.forms[0].container.hidden, false);
  assert.equal(f.calls.requests.length, 0);
  await f.submit();
  assert.equal(f.calls.rendered.length, 1);
  const { options } = f.calls.rendered[0];
  assert.equal(options.action, 'contact');
  assert.equal(options.execution, 'execute');
  options.callback('fresh-token');
  await pending;
  assert.equal(f.calls.requests.length, 1);
  assert.equal(f.calls.requests[0].url, '/api/contact');
  const payload = JSON.parse(f.calls.requests[0].options.body);
  assert.equal(payload.turnstileToken, 'fresh-token');
  assert.equal(payload.recaptchaToken, undefined);
  assert.equal(payload.formId, 'fixture-0');
  assert.equal(f.forms[0].status.dataset.status, 'success');
  assert.equal(f.forms[0].button.disabled, false);
  assert.equal(f.calls.reset, 1);
  assert.deepEqual(f.calls.removed, ['0']);
  assert.equal(f.timers.size, 0);
});

for (const callback of ['error-callback', 'expired-callback', 'timeout-callback']) {
  test(`${callback}: no POST and retry gets a new widget`, async () => {
    const f = fixture();
    const pending = f.submit();
    await flush();
    f.calls.rendered[0].options[callback]('provider-detail-never-show');
    await pending;
    assert.equal(f.calls.requests.length, 0);
    assert.equal(f.forms[0].status.dataset.status, 'error');
    assert.equal(f.forms[0].container.hidden, false);
    assert.equal(f.calls.removed.length, 0);
    assert.ok(!f.forms[0].status.textContent.includes('provider-detail'));
    const retry = f.submit();
    await flush();
    assert.equal(f.calls.rendered.length, 2);
    f.calls.rendered[1].options.callback('retry-token');
    await retry;
    assert.equal(f.calls.requests.length, 1);
    assert.deepEqual(f.calls.removed, ['0', '1']);
  });
}

test('unavailable script fails closed and can load again on retry', async () => {
  const f = fixture({ hasSdk: false });
  assert.equal(f.calls.scripts.length, 0); // No third-party request until submit.
  const first = f.submit();
  assert.equal(f.calls.scripts.length, 1);
  f.calls.scripts[0].onerror();
  await first;
  assert.equal(f.calls.requests.length, 0);
  const second = f.submit();
  assert.equal(f.calls.scripts.length, 2);
  f.window.turnstile = f.sdk;
  f.window.redRemodelsTurnstileReady();
  await flush();
  f.calls.rendered[0].options.callback('retry-token');
  await second;
  assert.equal(f.calls.requests.length, 1);
});

test('script load timeout restores submit state without a POST', async () => {
  const f = fixture({ hasSdk: false });
  const pending = f.submit();
  [...f.timers.values()].find((timer) => timer.ms === 15000).callback();
  await pending;
  assert.equal(f.calls.requests.length, 0);
  assert.equal(f.forms[0].button.disabled, false);
});

test('two forms keep independent widget and submission state', async () => {
  const f = fixture({ formsCount: 2 });
  const first = f.submit(0);
  const second = f.submit(1);
  await flush();
  assert.equal(f.calls.rendered.length, 2);
  f.calls.rendered[1].options.callback('second-form-token');
  await second;
  assert.equal(f.forms[1].button.disabled, false);
  assert.equal(f.forms[0].button.disabled, true);
  f.calls.rendered[0].options['error-callback']();
  await first;
  assert.equal(f.calls.requests.length, 1);
  assert.equal(JSON.parse(f.calls.requests[0].options.body).formId, 'fixture-1');
});

for (const [label, response] of [
  ['malformed JSON', { ok: true, json: async () => { throw new Error('invalid'); } }],
  ['empty 200 body', { ok: true, json: async () => ({}) }],
  ['API rejection', { ok: false, json: async () => ({ ok: false, error: 'Please try again.' }) }],
]) {
  test(`${label} never reports success or resets fields`, async () => {
    const f = fixture({ fetchImpl: async () => response });
    const pending = f.submit();
    await flush();
    f.calls.rendered[0].options.callback('test-token');
    await pending;
    assert.equal(f.forms[0].status.dataset.status, 'error');
    assert.equal(f.calls.reset, 0);
    assert.equal(f.forms[0].button.disabled, false);
    assert.equal(f.calls.requests.length, 1);
  });
}

test('ambiguous network error never automatically resends email-producing POST', async () => {
  const f = fixture({ fetchImpl: async () => { throw new Error('private-network-detail'); } });
  const pending = f.submit();
  await flush();
  f.calls.rendered[0].options.callback('test-token');
  await pending;
  assert.equal(f.calls.requests.length, 1);
  assert.match(f.forms[0].status.textContent, /before resubmitting/);
  assert.ok(!f.forms[0].status.textContent.includes('private-network-detail'));
});

test('off-site form action cannot receive a token or submitted fields', async () => {
  const f = fixture({ action: 'https://evil.example/api/contact' });
  const pending = f.submit();
  await flush();
  f.calls.rendered[0].options.callback('test-token');
  await pending;
  assert.equal(f.calls.requests.length, 0);
  assert.equal(f.forms[0].status.dataset.status, 'error');
});

test('all maintained forms include accessible widget/status/fallback and shared public config', async () => {
  let count = 0;
  for (const page of ['index.html', 'contact-us/index.html']) {
    const html = await readFile(new URL(`../../public/${page}`, import.meta.url), 'utf8');
    assert.ok(!html.includes('google.com/recaptcha'));
    assert.ok(html.indexOf('/assets/js/contact-form-config.js') < html.indexOf('/assets/js/contact-form.js'));
    for (const form of html.matchAll(/<form\b[\s\S]*?<\/form>/g)) {
      if (!form[0].includes('data-secure-form')) continue;
      count++;
      assert.match(form[0], /data-turnstile[^>]*aria-label="Security verification"/);
      assert.match(form[0], /data-form-status[^>]*aria-live="polite"/);
      assert.match(form[0], /tel:\+17205192606/);
    }
  }
  assert.equal(count, 3);
  const services = new URL('../../public/services/', import.meta.url);
  for (const entry of await readdir(services, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const html = await readFile(new URL(`${entry.name}/index.html`, services), 'utf8');
    assert.ok(!html.includes('google.com/recaptcha'), `${entry.name} still loads Google CAPTCHA`);
  }
});

test('waits for SDK readiness before rendering or executing a widget', async () => {
  const f = fixture({ deferReady: true });
  const pending = f.submit();
  await flush();
  assert.equal(f.calls.scripts.length, 1);
  assert.match(f.calls.scripts[0].src, /onload=redRemodelsTurnstileReady/);
  assert.equal(f.calls.rendered.length + f.calls.executed.length + f.calls.requests.length, 0);
  f.window.turnstile = f.sdk;
  f.window.redRemodelsTurnstileReady();
  await flush();
  f.calls.rendered[0].options.callback('ready-token');
  await pending;
  assert.equal(f.calls.requests.length, 1);
});

test('focus on either homepage form shares the SDK load without executing challenges', async () => {
  const f = fixture({ formsCount: 2, hasSdk: false });
  f.forms[1].handlers.focusin();
  f.forms[0].handlers.focusin();
  assert.equal(f.calls.scripts.length, 1);
  assert.equal(f.calls.rendered.length + f.calls.requests.length, 0);
  f.window.turnstile = f.sdk;
  f.window.redRemodelsTurnstileReady();
  await flush();
  const pending = f.submit(1);
  await flush();
  f.calls.rendered[0].options.callback('lower-form-token');
  await pending;
  assert.equal(JSON.parse(f.calls.requests[0].options.body).formId, 'fixture-1');
  assert.equal(f.calls.scripts.length, 1);
});

test('sequential upper and lower form submissions use separate widgets and fresh tokens', async () => {
  const f = fixture({ formsCount: 2 });
  for (const index of [0, 1]) {
    const pending = f.submit(index);
    await flush();
    f.calls.rendered[index].options.callback(`token-${index}`);
    await pending;
  }
  assert.equal(f.calls.requests.length, 2);
  assert.equal(JSON.parse(f.calls.requests[1].options.body).turnstileToken, 'token-1');
  assert.equal(JSON.parse(f.calls.requests[1].options.body).formId, 'fixture-1');
  assert.deepEqual(f.calls.executed, ['0', '1']);
});

test('an invalid widget ID cannot execute a different form widget', async () => {
  const f = fixture();
  f.sdk.render = () => undefined;
  await f.submit();
  assert.equal(f.calls.executed.length + f.calls.requests.length, 0);
  assert.equal(f.forms[0].status.dataset.status, 'error');
  assert.ok(f.calls.diagnostics.some((line) => line.includes('widget-initialization')));
});

test('safe diagnostics accept provider codes and discard arbitrary provider details', async () => {
  const f = fixture();
  const first = f.submit();
  await flush();
  f.calls.rendered[0].options['error-callback']('200500');
  await first;
  assert.ok(f.calls.diagnostics.some((line) => line.includes('code=200500')));
  const second = f.submit();
  await flush();
  f.calls.rendered[1].options['error-callback']('private-token-or-provider-detail');
  await second;
  assert.ok(!JSON.stringify(f.calls.diagnostics).includes('private-token-or-provider-detail'));
  assert.ok(!f.forms[0].status.textContent.includes('200500'));
});

test('SDK readiness timeout is recoverable and late callbacks cannot start a stale challenge', async () => {
  const f = fixture({ deferReady: true });
  const first = f.submit();
  const staleReady = f.window.redRemodelsTurnstileReady;
  [...f.timers.values()].find((timer) => timer.ms === 15000).callback();
  await first;
  assert.equal(f.forms[0].button.disabled, false);
  assert.equal(f.calls.rendered.length, 0);
  const second = f.submit();
  f.window.turnstile = f.sdk;
  staleReady();
  await flush();
  assert.equal(f.calls.rendered.length, 0);
  f.window.redRemodelsTurnstileReady();
  await flush();
  f.calls.rendered[0].options.callback('recovered-token');
  await second;
  assert.equal(f.calls.requests.length, 1);
});
