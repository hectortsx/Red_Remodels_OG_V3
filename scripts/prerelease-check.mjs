#!/usr/bin/env node
/**
 * Pre-release check — Red Remodels
 * Runs the compliance checks from docs/WEB_COMPLIANCE_AUDIT.md before a deploy.
 *
 *   npm run check:release   Check the files in public/ (served locally at the
 *                           production address, with the production security
 *                           headers) before uploading them.
 *   npm run check:live      Run the browser checks against www.redremodels.com
 *                           after a deploy.
 *
 * Flags: --skip-browser (file checks only), --headed (show Chrome).
 * Needs Google Chrome installed. No form is submitted and no analytics data is
 * sent: Google Analytics collection and /api/* requests are blocked.
 */

import fs from 'fs';
import net from 'net';
import path from 'path';
import crypto from 'crypto';
import { spawn, spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SITE = 'https://www.redremodels.com';
const args = new Set(process.argv.slice(2));
const LIVE = args.has('--live');

// ── Reporting ───────────────────────────────────────────────────────────────

const results = [];
let section = '';
const heading = (name) => { section = name; console.log(`\n${name}`); };
const report = (ok, label, details = []) => {
  results.push({ section, ok, label });
  console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  if (!ok) for (const line of details.slice(0, 8)) console.log(`      - ${line}`);
  if (!ok && details.length > 8) console.log(`      - …and ${details.length - 8} more`);
};
const check = (label, problems) => report(problems.length === 0, label, problems);

// ── Pages ───────────────────────────────────────────────────────────────────

const pageFiles = () => {
  const dirs = (rel) => fs.readdirSync(path.join(PUBLIC, rel), { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(PUBLIC, rel, d.name, 'index.html')))
    .map((d) => `${rel}/${d.name}/index.html`);
  return ['index.html', 'contact-us/index.html', ...dirs('services'), 'blog/index.html', ...dirs('blog')];
};
const urlPath = (file) => `/${file.replace(/index\.html$/, '')}`;
const PAGES = pageFiles();

const productionCsp = () => {
  const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'infra', 'cloudfront-response-headers-policy.json'), 'utf8'));
  return policy.SecurityHeadersConfig?.ContentSecurityPolicy?.ContentSecurityPolicy || '';
};

// ── 1. File checks ──────────────────────────────────────────────────────────

function fileChecks() {
  heading('Files');

  // Blog HTML must match its Markdown source.
  const blogFiles = () => PAGES.filter((f) => f.startsWith('blog/')).concat('sitemap.xml');
  const hash = () => blogFiles().map((f) => crypto.createHash('sha1').update(fs.readFileSync(path.join(PUBLIC, f))).digest('hex')).join();
  const before = hash();
  const build = spawnSync(process.execPath, ['scripts/build-blog.js'], { cwd: ROOT, encoding: 'utf8' });
  if (build.status !== 0) report(false, 'Blog builds from Markdown', [build.stderr.trim()]);
  else report(hash() === before, 'Blog pages match their Markdown source', ['public/blog was out of date and has been rebuilt; review and commit the changes']);

  const html = Object.fromEntries(PAGES.map((f) => [f, fs.readFileSync(path.join(PUBLIC, f), 'utf8')]));
  const each = (fn) => PAGES.flatMap((f) => fn(html[f], f).map((msg) => `${urlPath(f)}: ${msg}`));
  const count = (s, re) => (s.match(re) || []).length;
  const attr = (s, re) => (s.match(re) || [])[1];
  const metas = (s) => Object.fromEntries([...s.matchAll(/<meta\b([^>]*)>/g)].map(([, a]) => [
    (a.match(/\b(?:name|property)="([^"]+)"/) || [])[1], (a.match(/\bcontent="([^"]*)"/) || [])[1],
  ]).filter(([k]) => k));
  const description = (s) => metas(s).description;

  check('Every page has a title, description, one canonical link and share-image tags', each((s) => {
    const p = [];
    if (!attr(s, /<title>([^<]+)<\/title>/)) p.push('missing <title>');
    const meta = metas(s);
    if (!meta.description) p.push('missing meta description');
    if (count(s, /<link rel="canonical"/g) !== 1) p.push(`${count(s, /<link rel="canonical"/g)} canonical links`);
    for (const og of ['og:image', 'og:image:width', 'og:image:height', 'og:image:alt']) {
      if (!meta[og]) p.push(`missing ${og}`);
    }
    if (!/<html lang="en"/.test(s)) p.push('missing lang="en"');
    return p;
  }));

  const dupes = (get, what) => {
    const seen = {};
    for (const f of PAGES) { const v = get(html[f]); if (v) (seen[v] ||= []).push(urlPath(f)); }
    return Object.values(seen).filter((l) => l.length > 1).map((l) => `same ${what}: ${l.join(', ')}`);
  };
  check('Titles and descriptions are unique', [...dupes((s) => attr(s, /<title>([^<]+)<\/title>/), 'title'), ...dupes(description, 'description')]);

  check('Every page marks its own menu link as current and has a skip link, one main area and one H1', each((s) => {
    const p = [];
    const nav = (s.match(/<nav class="site-nav"[\s\S]*?<\/nav>/) || [''])[0];
    if (count(nav, /aria-current="(page|true)"/g) !== 1) p.push(`${count(nav, /aria-current="(page|true)"/g)} current-page marks in the menu`);
    if (!/<a class="skip-link" href="#main-content">/.test(s)) p.push('missing skip link');
    if (count(s, /<main\b[^>]*id="main-content"/g) !== 1) p.push('needs exactly one <main id="main-content">');
    if (count(s, /<h1\b/g) !== 1) p.push(`${count(s, /<h1\b/g)} H1 headings`);
    return p;
  }));

  check('No inline scripts, event handlers or style attributes (required by the security rules)', each((s) => {
    const p = [];
    for (const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (!/\bsrc=/.test(m[1]) && !/application\/ld\+json/.test(m[1]) && m[2].trim()) p.push('inline <script>');
    }
    if (/<[a-z][^>]*\son[a-z]+=/i.test(s)) p.push('inline event handler (on…=)');
    if (/<[a-z][^>]*\sstyle="/i.test(s)) p.push('style="" attribute');
    if (/<style\b/i.test(s)) p.push('<style> block');
    return p;
  }));

  check('Shared scripts load on every page; no Google Fonts or hard-coded Google tags', each((s) => {
    const p = [];
    for (const js of ['cookie-preferences.js', 'site-nav.js', 'nav-accessibility.js']) if (!s.includes(`/assets/js/${js}`)) p.push(`missing ${js}`);
    if (/fonts\.(googleapis|gstatic)\.com/.test(s)) p.push('loads Google Fonts');
    if (/<script[^>]+googletagmanager\.com/.test(s)) p.push('loads Google Tag Manager directly (must wait for consent)');
    return p;
  }));

  check('Every linked local file exists', each((s) => {
    const p = [];
    for (const m of s.matchAll(/\s(?:src|href)="(\/[^"#?]*\.[a-z0-9]+)(?:[?#][^"]*)?"/gi)) {
      if (!fs.existsSync(path.join(PUBLIC, decodeURIComponent(m[1])))) p.push(`missing ${m[1]}`);
    }
    return [...new Set(p)];
  }));

  const lambda = fs.readFileSync(path.join(ROOT, 'lambda', 'contact-handler', 'index.mjs'), 'utf8');
  const limit = (name) => Number(attr(lambda, new RegExp(`const MAX_${name}_LENGTH = (\\d+)`)));
  const limits = { name: limit('NAME'), email: limit('EMAIL'), phone: limit('PHONE'), message: limit('MESSAGE'), serviceType: limit('SERVICE_TYPE') };
  check('Contact forms match the server limits and show the phone/email fallback', each((s) => {
    const p = [];
    for (const form of s.match(/<form\b[\s\S]*?<\/form>/g) || []) {
      if (!/name="name"/.test(form)) continue;
      for (const [field, max] of Object.entries(limits)) {
        const tag = (form.match(new RegExp(`<(?:input|textarea|select)\\b[^>]*name="${field}"[^>]*>`)) || [])[0];
        if (tag && field !== 'serviceType' && Number(attr(tag, /maxlength="(\d+)"/)) !== max) p.push(`${field} maxlength should be ${max}`);
      }
      if (!/class="form-fallback"/.test(form)) p.push('form has no phone/email fallback');
    }
    return p;
  }));

  const exposed = [];
  const walk = (dir) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, d.name);
      const rel = path.relative(PUBLIC, full);
      if (d.isDirectory()) { walk(full); continue; }
      if (d.name === '.DS_Store') continue; // Finder metadata; excluded by the deploy command (see CLAUDE.md)
      if (/\.(map|env|pem|key|bak|zip)$|^\.env/i.test(d.name)) exposed.push(`${rel} should not be published`);
      if (!/\.(html|js|css|json|txt|xml|svg)$/i.test(d.name) || fs.statSync(full).size > 2e6) continue;
      const text = fs.readFileSync(full, 'utf8');
      if (/AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|0x4AAAAAAA[A-Za-z0-9_-]{20,}/.test(text)) exposed.push(`${rel} contains something that looks like a secret key`);
    }
  };
  walk(PUBLIC);
  check('No secret keys or private files in public/', exposed);

  const csp = productionCsp();
  check('Production security rules exist and do not allow inline or eval code', [
    ...(csp ? [] : ['no Content-Security-Policy in infra/cloudfront-response-headers-policy.json']),
    ...(/unsafe-(inline|eval)/.test(csp) ? ['policy contains unsafe-inline or unsafe-eval'] : []),
  ]);

  heading('Automated tests');
  for (const [label, cmd] of [
    ['Contact form and Lambda tests', ['--experimental-vm-modules', '--test', 'scripts/tests/contact-origin-guard.test.mjs', 'scripts/tests/contact-turnstile.test.mjs', 'scripts/tests/contact-form-turnstile.test.mjs', 'scripts/tests/contact-logging.test.mjs']],
    ['Cookie preference tests', ['--test', 'scripts/tests/cookie-preferences.test.mjs']],
    ['Redirect (CloudFront function) tests', ['--test', 'scripts/tests/cloudfront-url-rewrite.test.mjs']],
  ]) {
    const run = spawnSync(process.execPath, cmd, { cwd: ROOT, encoding: 'utf8' });
    const failed = Number(attr(run.stdout, /# fail (\d+)/) ?? 1);
    report(run.status === 0 && failed === 0, label, [`${failed} failing — run: node ${cmd.join(' ')}`]);
  }
}

// ── 2. Browser checks ───────────────────────────────────────────────────────

const freePort = () => new Promise((resolve) => {
  const srv = net.createServer().listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
});

async function startLocalServer() {
  const port = await freePort();
  const child = spawn(process.execPath, ['server/index.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return { child, origin: `http://127.0.0.1:${port}` }; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error('Local server did not start (npm start)');
}

const isAnalyticsHit = (u) => /(^|\.)google-analytics\.com$|(^|\.)analytics\.google\.com$/.test(u.hostname)
  || (u.hostname === 'www.google.com' && u.pathname.includes('/collect'));

async function newContext(browser, local, options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  const log = { thirdParty: new Set(), localErrors: [] };
  const csp = productionCsp();
  await ctx.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__cspViolations.push(`${e.effectiveDirective} ${e.blockedURI}`));
  });
  await ctx.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname !== 'www.redremodels.com') log.thirdParty.add(u.hostname);
    if (isAnalyticsHit(u)) return route.abort();
    if (u.hostname === 'www.redremodels.com' && u.pathname.startsWith('/api/')) return route.abort();
    if (local && u.hostname === 'www.redremodels.com') {
      const resp = await route.fetch({ url: local + u.pathname + u.search });
      if (resp.status() >= 400) log.localErrors.push(`${resp.status()} ${u.pathname}`);
      const headers = { ...resp.headers() };
      delete headers['content-security-policy'];
      if ((headers['content-type'] || '').includes('text/html')) headers['content-security-policy'] = csp;
      return route.fulfill({ response: resp, headers });
    }
    return route.continue();
  });
  ctx.on('response', (r) => {
    const u = new URL(r.url());
    if (!local && u.hostname === 'www.redremodels.com' && r.status() >= 400 && !u.pathname.startsWith('/api/')) log.localErrors.push(`${r.status()} ${u.pathname}`);
  });
  return { ctx, log };
}

async function browserChecks() {
  let chromium;
  try { ({ chromium } = require('playwright-core')); } catch { report(false, 'Browser checks', ['playwright-core is not installed: run npm install']); return; }
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const server = LIVE ? null : await startLocalServer();
  const local = server?.origin;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: !args.has('--headed') });
  } catch (err) {
    server?.child.kill();
    report(false, 'Browser checks', [`Could not start Google Chrome: ${err.message.split('\n')[0]}`]);
    return;
  }

  try {
    heading(LIVE ? `Pages (live site: ${SITE})` : 'Pages (release candidate, with production security rules)');
    const { ctx, log } = await newContext(browser, local);
    const page = await ctx.newPage();
    const problems = { a11y: [], csp: [], keyboard: [], layout: [], header: [] };
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of PAGES) {
        const at = `${urlPath(file)} @${width}px`;
        const resp = await page.goto(`${SITE}${urlPath(file)}`, { waitUntil: 'load' });
        if (LIVE && width === 375 && !resp.headers()['content-security-policy']) problems.header.push(`${urlPath(file)}: no Content-Security-Policy header`);
        await page.evaluate(() => { try { localStorage.clear(); } catch { /* ignore */ } });
        await page.reload({ waitUntil: 'load' });

        await page.keyboard.press('Tab');
        const skip = await page.evaluate(() => document.activeElement?.className);
        await page.keyboard.press('Enter');
        const focused = await page.evaluate(() => document.activeElement?.id);
        if (skip !== 'skip-link' || focused !== 'main-content') problems.keyboard.push(`${at}: skip link does not move focus to the main area`);

        if (width === 375) {
          const toggle = page.locator('.menu-toggle');
          await toggle.focus();
          await page.keyboard.press('Enter');
          const opened = await toggle.getAttribute('aria-expanded');
          await page.keyboard.press('Escape');
          const closed = await toggle.getAttribute('aria-expanded');
          const back = await page.evaluate(() => document.activeElement?.classList.contains('menu-toggle'));
          if (opened !== 'true' || closed !== 'false' || !back) problems.keyboard.push(`${at}: phone menu does not open with Enter and close with Escape`);
        }

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 0) problems.layout.push(`${at}: page is ${overflow}px wider than the screen`);

        await page.evaluate(axeSource);
        const violations = await page.evaluate(async () => (await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
          resultTypes: ['violations'],
        })).violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help}`));
        for (const v of violations) problems.a11y.push(`${at}: ${v}`);

        for (const v of await page.evaluate(() => window.__cspViolations)) problems.csp.push(`${at}: blocked ${v}`);
      }
    }
    check('Accessibility scan (WCAG 2.2 AA) finds no problems', problems.a11y);
    check('Security rules block nothing the site needs', problems.csp);
    if (LIVE) {
      check('Security rules are switched on (Content-Security-Policy header)', problems.header);
      const leaks = [];
      for (const p of ['/.DS_Store', '/assets/.DS_Store', '/.env', '/.git/config', '/package.json']) {
        const r = await fetch(`${SITE}${p}`, { redirect: 'manual' });
        if (r.status === 200) leaks.push(`${p} can be downloaded`);
      }
      check('Private files are not downloadable', leaks);
    }
    check('Skip link and phone menu work from the keyboard', problems.keyboard);
    check('No page is wider than the screen', problems.layout);
    check('No broken links to the site\'s own files', [...new Set(log.localErrors)]);
    await ctx.close();

    heading('Cookies and privacy (fresh browser each time)');
    const visit = async (c, p) => { await c.goto(`${SITE}${p}`, { waitUntil: 'load' }); await c.waitForTimeout(1500); };
    {
      const { ctx: c, log: l } = await newContext(browser, local);
      const p = await c.newPage();
      for (const u of ['/', '/services/kitchen-remodels/', '/blog/']) await visit(p, u);
      const cookies = (await c.cookies()).map((k) => k.name);
      check('Before a choice: no cookies and no outside services', [
        ...cookies.map((n) => `cookie set: ${n}`), ...[...l.thirdParty].map((h) => `contacted ${h}`)]);
      await p.locator('[data-cookie-reject]').click();
      await visit(p, '/contact-us/');
      check('After Reject: still no cookies and no Google', [
        ...(await c.cookies()).map((k) => `cookie set: ${k.name}`), ...[...l.thirdParty].filter((h) => /google/.test(h)).map((h) => `contacted ${h}`)]);
      await p.locator('form input[name="name"]').first().focus();
      await p.waitForFunction(() => !!window.turnstile, null, { timeout: 15000 }).catch(() => {});
      const ts = await p.evaluate(() => !!window.turnstile);
      const blocked = await p.evaluate(() => window.__cspViolations);
      check('Clicking into a form loads the Cloudflare spam check', [
        ...(ts ? [] : ['Turnstile did not load (no network, or blocked)']), ...blocked.map((v) => `blocked ${v}`)]);
      await c.close();
    }
    {
      const { ctx: c } = await newContext(browser, local);
      const p = await c.newPage();
      await visit(p, '/');
      await p.locator('[data-cookie-accept]').click();
      await p.waitForTimeout(2500);
      await visit(p, '/blog/');
      const ga = (await c.cookies()).filter((k) => k.name.startsWith('_ga'));
      const days = (k) => Math.round((k.expires * 1000 - Date.now()) / 86400000);
      check('After Accept: Google Analytics cookies are secure-only and last 180 days', ga.length !== 2
        ? [`expected 2 Google cookies, found ${ga.length} (no network?)`]
        : ga.filter((k) => !k.secure || days(k) > 181).map((k) => `${k.name}: secure=${k.secure}, ${days(k)} days`));
      await p.locator('#rr-cookie-settings').click();
      await Promise.all([p.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), p.locator('[data-cookie-reject]').click()]);
      await p.waitForTimeout(1000);
      check('Changing to Reject deletes the Google cookies', (await c.cookies()).filter((k) => k.name.startsWith('_ga')).map((k) => `still set: ${k.name}`));
      await c.close();
    }
  } finally {
    await browser.close();
    server?.child.kill();
  }
}

// ── Run ─────────────────────────────────────────────────────────────────────

console.log(`Red Remodels pre-release check — ${LIVE ? 'live site' : 'release candidate (public/)'}`);
if (!LIVE) fileChecks();
if (!args.has('--skip-browser')) await browserChecks();

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length ? '✗' : '✓'} ${results.length - failed.length} of ${results.length} checks passed.`);
if (failed.length) {
  console.log(LIVE ? 'Something is wrong on the live site. If a page or form is broken, see the rollback notes in docs/WEB_COMPLIANCE_AUDIT.md.' : 'Fix the failures above before uploading.');
  process.exitCode = 1;
}
