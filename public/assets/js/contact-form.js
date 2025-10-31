const CONTACT_ENDPOINT = '/api/contact';
const RECAPTCHA_SITE_KEY = '6LdEmfQrAAAAANdZcp69kPN5tFxkCXXfuBoxnLDW';

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const getFormIdentifier = (form) => form.dataset.secureForm || form.getAttribute('name') || 'contact';

const updateYearStamp = () => {
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = String(new Date().getFullYear());
  }
};

const requestRecaptchaToken = () =>
  new Promise((resolve, reject) => {
    if (typeof grecaptcha === 'undefined' || !RECAPTCHA_SITE_KEY) {
      resolve('');
      return;
    }

    grecaptcha.ready(() => {
      grecaptcha
        .execute(RECAPTCHA_SITE_KEY, { action: 'contact' })
        .then(resolve)
        .catch(reject);
    });
  });

const toPayload = (formData) => {
  const payload = {};
  for (const [key, value] of formData.entries()) {
    payload[key] = value;
  }
  return payload;
};

const setupSecureForm = (form) => {
  const statusElement = form.querySelector('[data-form-status]');
  const submitButton = form.querySelector('[data-form-submit]');

  if (!submitButton || !statusElement) {
    return;
  }

  statusElement.hidden = true;

  let isSubmitting = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    statusElement.textContent = '';
    statusElement.dataset.status = '';
    statusElement.hidden = true;
    isSubmitting = true;
    submitButton.disabled = true;
    form.dataset.submitting = 'true';

    try {
      const token = await requestRecaptchaToken();
      await submitContactForm(form, statusElement, token);
    } catch (error) {
      console.error(`[contact-form] Submission error (${getFormIdentifier(form)}):`, error);
      statusElement.textContent =
        sanitizeText(error?.message) || 'Something went wrong. Please try again.';
      statusElement.dataset.status = 'error';
      statusElement.hidden = false;
    } finally {
      submitButton.disabled = false;
      isSubmitting = false;
      delete form.dataset.submitting;
    }
  });
};

const submitContactForm = async (form, statusElement, recaptchaToken) => {
  const formData = new FormData(form);

  if (!formData.has('formId')) {
    formData.append('formId', form.dataset.secureForm ?? 'more-info');
  }

  if (recaptchaToken) {
    formData.append('recaptchaToken', recaptchaToken);
  }

  statusElement.textContent = 'Sending your request...';
  statusElement.dataset.status = 'pending';
  statusElement.hidden = false;

  const response = await fetch(form.getAttribute('action') || CONTACT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(toPayload(formData))
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.ok === false) {
    throw new Error(result.error || 'We could not send your message.');
  }

  const successMessage =
    sanitizeText(result.message) || 'Message sent! We will reach out shortly.';
  statusElement.textContent = successMessage;
  statusElement.dataset.status = 'success';
  statusElement.hidden = false;
  form.reset();
};

const initSecureForms = () => {
  const forms = document.querySelectorAll('[data-secure-form]');
  forms.forEach((form) => setupSecureForm(form));
};

document.addEventListener('DOMContentLoaded', () => {
  updateYearStamp();
  initSecureForms();
});
