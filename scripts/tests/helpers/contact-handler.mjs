import { readFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

export const secret = 'a'.repeat(64);
export const header = 'x-red-remodels-origin-verify';
export const validBody = { name: 'Jane Smith', email: 'jane@example.com', phone: '7205550123', message: 'Kitchen remodel inquiry.', turnstileToken: 'test-token' };
export const configuredEnv = { CLOUDFRONT_ORIGIN_SECRET: secret, TURNSTILE_SECRET_KEY: 'private-test-secret', TURNSTILE_ALLOWED_HOSTNAMES: 'www.redremodels.com' };
export const eventFor = (body = validBody) => ({ requestContext: { http: { method: 'POST' } }, headers: { [header]: secret }, body: JSON.stringify(body) });

// Execute real source with isolated environment, mocked Siteverify and SES.
export const loadHandler = async (env = {}, provider = { success: true, hostname: 'www.redremodels.com', action: 'contact' }) => {
  const calls = { ses: 0, captcha: 0, logs: [], requests: [] };
  const context = createContext({
    Buffer, URLSearchParams, AbortSignal,
    process: { env: { MAIL_TO: 'owner@example.com', MAIL_CONFIRMATION_ENABLED: 'false', ...env } },
    console: Object.fromEntries(['error', 'warn', 'log'].map((level) => [level, (...args) => calls.logs.push(args.join(' '))])),
    fetch: async (url, options) => {
      calls.captcha++;
      calls.requests.push({ url, options });
      if (typeof provider === 'function') return provider(url, options, calls.captcha);
      return { ok: true, json: async () => provider };
    },
  });
  const crypto = new SyntheticModule(['timingSafeEqual'], function () { this.setExport('timingSafeEqual', timingSafeEqual); }, { context });
  const sdk = new SyntheticModule(['SESClient', 'SendEmailCommand'], function () {
    this.setExport('SESClient', class { async send() { calls.ses++; } });
    this.setExport('SendEmailCommand', class { constructor(input) { this.input = input; } });
  }, { context });
  const verifier = new SourceTextModule(await readFile(new URL('../../../lambda/contact-handler/turnstile.mjs', import.meta.url), 'utf8'), { context });
  const module = new SourceTextModule(await readFile(new URL('../../../lambda/contact-handler/index.mjs', import.meta.url), 'utf8'), { context });
  await module.link((specifier) => {
    if (specifier === 'node:crypto') return crypto;
    if (specifier === '@aws-sdk/client-ses') return sdk;
    if (specifier === './turnstile.mjs') return verifier;
    throw new Error(`Unexpected dependency: ${specifier}`);
  });
  await module.evaluate();
  return { handler: module.namespace.handler, calls };
};
