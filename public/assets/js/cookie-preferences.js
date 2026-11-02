(() => {
  'use strict';
  const MEASUREMENT_ID = 'G-SP8EDYP71R';
  const STORAGE_KEY = 'redremodels.cookie-preferences.v1';
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}`;
  window[DISABLE_KEY] = true;
  if (document.getElementById('rr-cookie-panel')) return;

  let memoryRecord = null;
  let analyticsStarted = false;
  let expiryTimer;
  let tag;
  let returnFocus = false;

  const validRecord = (value) => value?.version === 1
    && ['accepted', 'rejected'].includes(value.choice)
    && Number.isFinite(value.savedAt)
    && value.savedAt <= Date.now()
    && Date.now() - value.savedAt < MAX_AGE;

  const readRecord = () => {
    try {
      const record = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      return validRecord(record) ? record : null;
    } catch {
      return validRecord(memoryRecord) ? memoryRecord : null;
    }
  };

  const clearAnalyticsCookies = () => {
    // Only this site's known GA4 cookies; never touch security/preference cookies.
    const domains = ['', window.location.hostname, 'redremodels.com'];
    for (const name of ['_ga', '_ga_SP8EDYP71R']) {
      for (const domain of new Set(domains)) {
        try {
          document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure${domain ? `; Domain=${domain}` : ''}`;
        } catch { /* Analytics stays disabled even when cookie access is blocked. */ }
      }
    }
  };

  const cleanUrl = (value) => {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.origin + url.pathname : '';
    } catch { return ''; }
  };

  const startAnalytics = () => {
    if (analyticsStarted) {
      window[DISABLE_KEY] = false;
      if (!tag.isConnected) document.head.appendChild(tag);
      return;
    }
    analyticsStarted = true;
    window[DISABLE_KEY] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // Basic consent: no Google library or cookieless pings before opt-in.
    window.gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied',
    });
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      page_location: window.location.origin + window.location.pathname,
      page_referrer: cleanUrl(document.referrer),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // HTTPS-only cookies that expire with the consent record, not GA's 2-year default.
      cookie_flags: 'SameSite=Lax;Secure',
      cookie_expires: MAX_AGE / 1000,
    });
    tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(tag);
  };

  const panel = document.createElement('section');
  panel.id = 'rr-cookie-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'rr-cookie-title');
  panel.innerHTML = `
    <h2 id="rr-cookie-title">Your cookie choices</h2>
    <p>With your permission, Google Analytics uses cookies to help us understand site visits. Analytics is off until you accept. Site security, including Cloudflare Turnstile for our forms, stays active either way.</p>
    <p>We remember your choice on this browser for 180 days. You can change it anytime using Cookie settings.</p>
    <p id="rr-cookie-status" role="status" aria-live="polite"></p>
    <div class="rr-cookie-actions">
      <button type="button" data-cookie-reject>Reject analytics</button>
      <button type="button" data-cookie-accept>Accept analytics</button>
      <button type="button" data-cookie-close hidden>Close preferences</button>
    </div>`;
  const settings = document.createElement('button');
  settings.id = 'rr-cookie-settings';
  settings.type = 'button';
  settings.textContent = 'Cookie settings';
  settings.setAttribute('aria-controls', panel.id);
  settings.setAttribute('aria-expanded', 'false');
  document.body.appendChild(panel);
  document.body.appendChild(settings);
  const accept = panel.querySelector('[data-cookie-accept]');
  const reject = panel.querySelector('[data-cookie-reject]');
  const close = panel.querySelector('[data-cookie-close]');
  const status = panel.querySelector('#rr-cookie-status');
  let record = readRecord();

  const show = () => {
    status.textContent = `Analytics is ${record?.choice === 'accepted' ? 'on' : 'off'}.`;
    close.hidden = !record;
    panel.hidden = false;
    settings.hidden = true;
    settings.setAttribute('aria-expanded', 'true');
  };
  const hide = () => {
    panel.hidden = true;
    settings.hidden = false;
    settings.setAttribute('aria-expanded', 'false');
    if (returnFocus) settings.focus({ preventScroll: true });
  };
  const scheduleExpiry = () => {
    window.clearTimeout(expiryTimer);
    if (record) {
      expiryTimer = window.setTimeout(synchronize, Math.min(record.savedAt + MAX_AGE - Date.now() + 1, 2147483647));
    }
  };
  const stopAnalytics = (reload) => {
    window[DISABLE_KEY] = true;
    clearAnalyticsCookies();
    tag?.remove();
    // Removing a script does not unload a running library. Disable first, then
    // reload after a saved withdrawal so the new document never loads GA4.
    if (reload && analyticsStarted) window.location.reload();
  };
  function synchronize() {
    const next = readRecord();
    const revoked = analyticsStarted && next?.choice !== 'accepted';
    record = next;
    if (record?.choice === 'accepted') startAnalytics();
    else stopAnalytics(revoked);
    if (!record) show();
    else if (!returnFocus) hide();
    scheduleExpiry();
  }

  const choose = (choice) => {
    record = { version: 1, choice, savedAt: Date.now() };
    memoryRecord = record;
    let saved = false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      saved = window.localStorage.getItem(STORAGE_KEY) === JSON.stringify(record);
    } catch { /* A blocked store must not grant analytics on later pages. */ }
    if (choice === 'accepted') startAnalytics();
    else stopAnalytics(saved);
    returnFocus = true;
    scheduleExpiry();
    if (saved) hide();
    else {
      show();
      status.textContent = `Analytics is ${choice === 'accepted' ? 'on' : 'off'} for this page. Your browser could not save this choice. You may need to choose again on other pages.`;
    }
  };
  accept.addEventListener('click', () => choose('accepted'));
  reject.addEventListener('click', () => choose('rejected'));
  close.addEventListener('click', hide);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && record) { event.preventDefault(); hide(); }
  });
  settings.addEventListener('click', () => {
    returnFocus = true;
    show();
    (record?.choice === 'accepted' ? reject : accept).focus();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      returnFocus = false;
      synchronize();
    }
  });
  window.addEventListener('pageshow', (event) => { if (event.persisted) synchronize(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') synchronize();
  });
  synchronize();
})();
