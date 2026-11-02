const CONTACT_ENDPOINT = '/api/contact';
const VERIFICATION_ERROR = 'We could not verify your request. Please try again, or call (720) 519-2606.';
let turnstileScriptPromise;

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const updateYearStamp = () => {
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = String(new Date().getFullYear());
};

const logVerificationFailure = (form, reason, code) => {
  const identifier = ['service-request', 'more-info', 'contact-us'].includes(form.dataset.secureForm)
    ? form.dataset.secureForm : 'contact';
  // Only a known form ID, fixed reason, and six-digit provider code are logged.
  // Never log exception objects, tokens, site responses, or submitted fields.
  const safeCode = /^\d{6}$/.test(String(code ?? '')) ? String(code) : 'unavailable';
  console.warn(`[contact-form] Verification (${identifier}): ${reason}; code=${safeCode}`);
};

// The SDK's named onload callback is its readiness signal, not the script
// element's load event. Share the promise across both homepage forms.
const loadTurnstile = () => {
  if (turnstileScriptPromise) return turnstileScriptPromise;
  if (window.turnstile?.render && window.turnstile?.execute) return Promise.resolve(window.turnstile);
  turnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let timer;
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.remove();
      reject(new Error(VERIFICATION_ERROR));
    };
    window.redRemodelsTurnstileReady = () => {
      if (settled) return;
      const sdk = window.turnstile;
      if (!sdk?.render || !sdk?.execute) { fail(); return; }
      settled = true;
      clearTimeout(timer);
      resolve(sdk);
    };
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=redRemodelsTurnstileReady';
    script.async = true;
    script.onerror = fail;
    timer = setTimeout(fail, 15000);
    document.head.appendChild(script);
  }).catch((error) => {
    turnstileScriptPromise = undefined;
    throw error;
  });
  return turnstileScriptPromise;
};

const requestTurnstileToken = (sdk, container, sitekey, form) => {
  let widgetId;
  let timer;
  const token = new Promise((resolve, reject) => {
    const fail = () => reject(new Error(VERIFICATION_ERROR));
    timer = setTimeout(fail, 300000);
    try {
      widgetId = sdk.render(container, {
        sitekey,
        action: 'contact',
        execution: 'execute',
        appearance: 'always',
        size: 'flexible',
        retry: 'never',
        'response-field': false,
        callback: (value) => {
          if (typeof value === 'string' && value.length > 0 && value.length <= 2048) resolve(value);
          else fail();
        },
        'error-callback': (code) => { logVerificationFailure(form, 'widget-error', code); fail(); return true; },
        'expired-callback': () => { logVerificationFailure(form, 'token-expired'); fail(); },
        'timeout-callback': () => { logVerificationFailure(form, 'interaction-timeout'); fail(); },
        'unsupported-callback': () => { logVerificationFailure(form, 'unsupported-browser'); fail(); },
      });
      if (typeof widgetId !== 'string' || !widgetId) throw new Error(VERIFICATION_ERROR);
      sdk.execute(widgetId);
    } catch {
      logVerificationFailure(form, 'widget-initialization');
      fail();
    }
  });
  return {
    token,
    finish: () => clearTimeout(timer),
    dispose: () => {
      clearTimeout(timer);
      if (widgetId !== undefined) {
        try { sdk.remove(widgetId); } catch { /* Already removed by the SDK. */ }
      }
    },
  };
};

const submitContactForm = async (form, statusElement, token) => {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.formId = payload.formId || form.dataset.secureForm || 'contact';
  payload.turnstileToken = token;
  // Never forward a stale token from an old form or a provider-generated field.
  delete payload.recaptchaToken;
  delete payload['cf-turnstile-response'];
  statusElement.textContent = 'Sending your request...';
  statusElement.dataset.status = 'pending';
  const endpoint = new URL(form.getAttribute('action') || CONTACT_ENDPOINT, window.location.href);
  if (endpoint.origin !== window.location.origin || endpoint.pathname !== CONTACT_ENDPOINT || endpoint.search) {
    throw new Error('We could not send your message. Please call (720) 519-2606.');
  }
  let response;
  try {
    response = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('We could not confirm delivery. Please call (720) 519-2606 before resubmitting.');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true) {
    throw new Error(sanitizeText(result?.error) || 'We could not confirm delivery. Please call (720) 519-2606 before resubmitting.');
  }
  statusElement.textContent = sanitizeText(result.message) || 'Message sent! We will reach out shortly.';
  statusElement.dataset.status = 'success';
  form.reset();
};

const setupSecureForm = (form) => {
  const statusElement = form.querySelector('[data-form-status]');
  const submitButton = form.querySelector('[data-form-submit]');
  const container = form.querySelector('[data-turnstile]');
  if (!submitButton || !statusElement) return;
  statusElement.hidden = true;
  let isSubmitting = false;
  let lastChallenge;
  // Start the SDK download before submit without generating a token or sending
  // contact data. Token execution remains tied to the actual submit attempt.
  form.addEventListener('focusin', () => {
    if (sanitizeText(window.RED_REMODELS_CONTACT?.turnstileSiteKey)) {
      loadTurnstile().catch(() => { /* Submit reports the recoverable error. */ });
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting || !form.reportValidity()) return;
    isSubmitting = true;
    submitButton.disabled = true;
    form.dataset.submitting = 'true';
    statusElement.textContent = 'Verifying your request...';
    statusElement.dataset.status = 'pending';
    statusElement.hidden = false;
    lastChallenge?.dispose();
    lastChallenge = undefined;
    let challenge;
    let tokenVerified = false;
    try {
      let token;
      try {
        const sitekey = sanitizeText(window.RED_REMODELS_CONTACT?.turnstileSiteKey);
        if (!sitekey || !container) throw new Error(VERIFICATION_ERROR);
        const sdk = await loadTurnstile();
        container.hidden = false;
        challenge = requestTurnstileToken(sdk, container, sitekey, form);
        lastChallenge = challenge;
        token = await challenge.token;
        tokenVerified = true;
      } catch {
        if (!challenge) logVerificationFailure(form, 'sdk-load-or-initialization');
        throw new Error(VERIFICATION_ERROR);
      }
      await submitContactForm(form, statusElement, token);
    } catch (error) {
      statusElement.textContent = sanitizeText(error?.message) || VERIFICATION_ERROR;
      statusElement.dataset.status = 'error';
    } finally {
      challenge?.finish();
      if (tokenVerified) {
        challenge?.dispose();
        lastChallenge = undefined;
        if (container) container.hidden = true;
      } else if (container) {
        // Keep a failed widget visible; the next attempt replaces only this
        // form's widget, rather than hiding useful provider/browser feedback.
        container.hidden = false;
      }
      statusElement.hidden = false;
      submitButton.disabled = false;
      isSubmitting = false;
      delete form.dataset.submitting;
    }
  });
};

const initSecureForms = () => {
  updateYearStamp();
  document.querySelectorAll('[data-secure-form]').forEach(setupSecureForm);
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSecureForms);
else initSecureForms();
