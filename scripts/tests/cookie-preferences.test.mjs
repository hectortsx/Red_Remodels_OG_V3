import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../../public/assets/js/cookie-preferences.js', import.meta.url), 'utf8');
const KEY = 'redremodels.cookie-preferences.v1';
const DISABLE = 'ga-disable-G-SP8EDYP71R';
const NOW = 1793232000000;
const DAYS = 24 * 60 * 60 * 1000;
const stored = (choice, savedAt = NOW) => JSON.stringify({ version: 1, choice, savedAt });

function fixture({ value = null, blocked = false } = {}) {
  let clock = NOW;
  const storage = new Map(value === null ? [] : [[KEY, value]]);
  const calls = { scripts: [], cookies: [], reloads: 0, focus: [] };
  const listeners = {};
  const timers = new Map();
  const elements = new Map();
  class Element {
    hidden = false;
    textContent = '';
    attrs = {};
    listeners = {};
    children = new Map();
    isConnected = false;
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener(key, callback) { this.listeners[key] = callback; }
    querySelector(selector) {
      if (!this.children.has(selector)) this.children.set(selector, new Element());
      return this.children.get(selector);
    }
    focus() { calls.focus.push(this); }
    remove() { this.isConnected = false; }
    click() { this.listeners.click(); }
  }
  const document = {
    referrer: 'https://www.redremodels.com/?private=fixture#fragment',
    visibilityState: 'visible',
    getElementById: id => elements.get(id),
    createElement: () => new Element(),
    body: { appendChild(element) { elements.set(element.id, element); element.isConnected = true; } },
    head: { appendChild(element) { element.isConnected = true; calls.scripts.push(element); } },
    addEventListener(key, callback) { listeners[key] = callback; },
    set cookie(value) { calls.cookies.push(value); },
  };
  const window = {
    location: { origin: 'https://www.redremodels.com', pathname: '/contact-us', hostname: 'www.redremodels.com', reload() { calls.reloads++; } },
    localStorage: {
      getItem(key) { if (blocked) throw Error('Blocked'); return storage.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw Error('Blocked'); storage.set(key, value); },
    },
    addEventListener(key, callback) { listeners[key] = callback; },
    setTimeout(callback, delay) { timers.set(callback, delay); return callback; },
    clearTimeout(callback) { timers.delete(callback); },
  };
  class Clock extends Date { static now() { return clock; } }
  runInNewContext(source, { window, document, Date: Clock, URL, Set, Number, JSON });
  const panel = elements.get('rr-cookie-panel');
  return {
    window, document, calls, storage, listeners, timers, panel,
    accept: panel.querySelector('[data-cookie-accept]'),
    reject: panel.querySelector('[data-cookie-reject]'),
    close: panel.querySelector('[data-cookie-close]'),
    status: panel.querySelector('#rr-cookie-status'),
    settings: elements.get('rr-cookie-settings'),
    advance(ms) { clock += ms; },
  };
}

test('unknown choice blocks Google completely and exposes equal accept/reject choices', () => {
  const f = fixture();
  assert.equal(f.calls.scripts.length, 0);
  assert.equal(f.window[DISABLE], true);
  assert.equal(f.window.gtag, undefined);
  assert.equal(f.panel.hidden, false);
  assert.equal(f.close.hidden, true);
  assert.equal(f.storage.size, 0);
  assert.ok(f.calls.cookies.every(c => /^_ga(?:_SP8EDYP71R)?=; Max-Age=0;/.test(c)));
});

test('acceptance persists only version/choice/time and starts one sanitized analytics config', () => {
  const f = fixture();
  f.accept.click();
  assert.deepEqual(JSON.parse(f.storage.get(KEY)), { version: 1, choice: 'accepted', savedAt: NOW });
  assert.equal(f.calls.scripts.length, 1);
  assert.equal(f.window[DISABLE], false);
  const config = f.window.dataLayer.find(c => c[0] === 'config');
  assert.equal(config[1], 'G-SP8EDYP71R');
  assert.equal(config[2].page_location, 'https://www.redremodels.com/contact-us');
  assert.equal(config[2].page_referrer, 'https://www.redremodels.com/');
  assert.equal(config[2].allow_google_signals, false);
  assert.equal(config[2].allow_ad_personalization_signals, false);
  assert.equal(f.window.dataLayer[0][2].ad_storage, 'denied');
  f.settings.click();
  f.accept.click();
  assert.equal(f.calls.scripts.length, 1);
});

test('rejection persists across pages, clears known cookies, and never loads Google', () => {
  const f = fixture();
  f.reject.click();
  assert.equal(f.calls.scripts.length, 0);
  assert.equal(f.panel.hidden, true);
  const next = fixture({ value: f.storage.get(KEY) });
  assert.equal(next.calls.scripts.length, 0);
  assert.equal(next.panel.hidden, true);
  assert.equal(next.settings.hidden, false);
  assert.equal(next.window[DISABLE], true);
  assert.ok(next.calls.cookies.some(c => c.includes('Domain=redremodels.com')));
});

test('a remembered acceptance enables analytics on another page', () => {
  const f = fixture({ value: stored('accepted') });
  assert.equal(f.calls.scripts.length, 1);
  assert.equal(f.panel.hidden, true);
});

test('withdrawing acceptance disables and removes the tag before reloading', () => {
  const f = fixture({ value: stored('accepted') });
  f.settings.click();
  assert.equal(f.panel.hidden, false);
  assert.equal(f.calls.focus.at(-1), f.reject);
  f.reject.click();
  assert.equal(JSON.parse(f.storage.get(KEY)).choice, 'rejected');
  assert.equal(f.window[DISABLE], true);
  assert.equal(f.calls.scripts[0].isConnected, false);
  assert.equal(f.calls.reloads, 1);
});

test('malformed, outdated, future-dated and expired records cannot grant consent', () => {
  for (const value of ['invalid', 'null', '{}', stored('accepted', NOW + 1), stored('accepted', NOW - 180 * DAYS), JSON.stringify({ version: 0, choice: 'accepted', savedAt: NOW })]) {
    const f = fixture({ value });
    assert.equal(f.calls.scripts.length, 0, value);
    assert.equal(f.panel.hidden, false, value);
  }
});

test('blocked storage defaults off and reports inability to remember either choice', () => {
  const f = fixture({ blocked: true });
  assert.equal(f.calls.scripts.length, 0);
  f.reject.click();
  assert.match(f.status.textContent, /could not save/);
  assert.equal(f.calls.reloads, 0);
  f.accept.click();
  assert.equal(f.calls.scripts.length, 1);
  assert.match(f.status.textContent, /on for this page/);
  f.reject.click();
  assert.equal(f.window[DISABLE], true);
  f.accept.click();
  assert.equal(f.window[DISABLE], false);
  assert.equal(f.calls.scripts.at(-1).isConnected, true);
});

test('another tab withdrawing consent or clearing site storage stops this tab', () => {
  for (const value of [stored('rejected'), null]) {
    const f = fixture({ value: stored('accepted') });
    if (value === null) f.storage.clear(); else f.storage.set(KEY, value);
    f.listeners.storage({ key: value === null ? null : KEY });
    assert.equal(f.window[DISABLE], true);
    assert.equal(f.calls.reloads, 1);
  }
});

test('expiry stops a running tag, and timer delays cannot overflow', () => {
  const f = fixture({ value: stored('accepted', NOW - 179 * DAYS) });
  assert.ok([...f.timers.values()].every(ms => ms > 0 && ms <= 2147483647));
  f.advance(2 * DAYS);
  [...f.timers.keys()][0]();
  assert.equal(f.window[DISABLE], true);
  assert.equal(f.calls.reloads, 1);
  assert.equal(f.panel.hidden, false);
});

test('back/forward cache restoration rechecks consent', () => {
  const f = fixture({ value: stored('accepted') });
  f.storage.set(KEY, stored('rejected'));
  f.listeners.pageshow({ persisted: true });
  assert.equal(f.window[DISABLE], true);
  assert.equal(f.calls.reloads, 1);
});

test('closing reopened preferences preserves the choice and returns focus', () => {
  const f = fixture({ value: stored('rejected') });
  f.settings.click();
  let prevented = false;
  f.panel.listeners.keydown({ key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(f.panel.hidden, true);
  assert.equal(f.calls.focus.at(-1), f.settings);
  assert.equal(JSON.parse(f.storage.get(KEY)).choice, 'rejected');
});

test('every maintained page gates analytics and the blog generator preserves gating', async () => {
  const root = new URL('../../public/', import.meta.url);
  const paths = ['index.html', 'contact-us/index.html', 'blog/index.html'];
  for (const dir of ['services', 'blog']) {
    for (const entry of await readdir(new URL(dir + '/', root), { withFileTypes: true })) {
      if (entry.isDirectory()) paths.push(`${dir}/${entry.name}/index.html`);
    }
  }
  assert.equal(paths.length, 15);
  for (const path of paths) {
    const html = await readFile(new URL(path, root), 'utf8');
    assert.equal((html.match(/src="\/assets\/js\/cookie-preferences\.js\?/g) || []).length, 1, path);
    assert.doesNotMatch(html, /googletagmanager\.com|gtag\(/, path);
  }
  const generator = await readFile(new URL('../build-blog.js', import.meta.url), 'utf8');
  assert.match(generator, /cookie-preferences\.js/);
  assert.doesNotMatch(generator, /googletagmanager\.com|gtag\(/);
});
