const VERIFICATION_ERROR = 'We could not verify your request. Please try again, or call (720) 519-2606.';
const SAFE_ERROR_CODES = new Set([
  'missing-input-secret', 'invalid-input-secret', 'missing-input-response',
  'invalid-input-response', 'bad-request', 'timeout-or-duplicate', 'internal-error',
]);

// Shared by the production Lambda and the local preview server. No bypass or
// provider fallback: every accepted contact request must pass Siteverify.
export const verifyTurnstile = async (token, { env = process.env, fetchImpl = fetch, logger = console } = {}) => {
  const reject = (statusCode = 400) => ({ success: false, statusCode, error: VERIFICATION_ERROR });
  const secret = env.TURNSTILE_SECRET_KEY;
  const hostnames = (env.TURNSTILE_ALLOWED_HOSTNAMES ?? '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
  if (!secret || !hostnames.length || hostnames.some((host) => !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(host))) {
    logger.error('[contact] Turnstile configuration is missing or invalid.');
    return reject(503);
  }
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) return reject();

  try {
    const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      logger.warn('[contact] Turnstile verification service returned an HTTP error.');
      return reject(503);
    }
    const result = await response.json();
    if (result?.success !== true || !hostnames.includes(result.hostname) || result.action !== 'contact') {
      const codes = Array.isArray(result?.['error-codes'])
        ? result['error-codes'].filter((code) => SAFE_ERROR_CODES.has(code)).slice(0, 7)
        : [];
      logger.warn('[contact] Turnstile verification rejected.', JSON.stringify({ codes }));
      return reject();
    }
    return { success: true };
  } catch {
    // Provider/network exception objects can contain request tokens or secrets.
    logger.warn('[contact] Turnstile verification unavailable.');
    return reject(503);
  }
};
