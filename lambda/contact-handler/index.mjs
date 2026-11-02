import { timingSafeEqual } from 'node:crypto';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { verifyTurnstile } from './turnstile.mjs';

const ses = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const MAIL_CONFIRMATION_ENABLED = process.env.MAIL_CONFIRMATION_ENABLED !== 'false';
const CONTACT_SUCCESS_MESSAGE = process.env.CONTACT_SUCCESS_MESSAGE ?? 'Thanks! We will be in touch shortly.';
const CONTACT_ERROR_MESSAGE = process.env.CONTACT_ERROR_MESSAGE ?? 'We were unable to process your request.';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'https://www.redremodels.com';
const CLOUDFRONT_ORIGIN_HEADER = 'x-red-remodels-origin-verify';
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_SERVICE_TYPE_LENGTH = 120;
const exceedsLimit = (value, limit) => typeof value === 'string' && value.trim().length > limit;

const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', ...corsHeaders },
  body: JSON.stringify(body),
});

const isCloudFrontOriginSecretConfigured = () =>
  typeof process.env.CLOUDFRONT_ORIGIN_SECRET === 'string'
  && Buffer.byteLength(process.env.CLOUDFRONT_ORIGIN_SECRET, 'utf8') >= 32;

const hasTrustedCloudFrontOrigin = (event) => {
  const expected = process.env.CLOUDFRONT_ORIGIN_SECRET;
  const supplied = Object.entries(event.headers ?? {})
    .find(([name]) => name.toLowerCase() === CLOUDFRONT_ORIGIN_HEADER)?.[1];
  if (!isCloudFrontOriginSecretConfigured() || typeof supplied !== 'string') return false;

  const expectedBytes = Buffer.from(expected, 'utf8');
  const suppliedBytes = Buffer.from(supplied, 'utf8');
  return suppliedBytes.length === expectedBytes.length
    && timingSafeEqual(suppliedBytes, expectedBytes);
};

const sanitize = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 2000) : '';

const sanitizeMultiline = (value) =>
  typeof value === 'string' ? value.replace(/\r\n?/g, '\n').slice(0, 4000) : '';

const encodeHtml = (value) =>
  (typeof value === 'string' ? value : '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const escapeHtml = (value) => encodeHtml(sanitize(value));
const escapeHtmlPreserve = (value) => (typeof value === 'string' ? encodeHtml(value) : '');
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitize(value));

// Keywords checked against the email local-part and the submitted name.
// Matches anywhere in the string, case-insensitive.
const SPAM_EMAIL_KEYWORDS = [
  'lead', 'leads', 'virtual', 'helper', 'cache', 'scripts',
  'marketing', 'seo', 'agency', 'promo', 'promotion', 'bulk', 'blast', 'campaign',
  'bot', 'robot', 'noreply', 'no-reply', 'auto',
  'outsource', 'offshore', 'freelance',
  'sales', 'growth', 'digital', 'webmaster', 'backlink', 'traffic',
  'temp', 'throwaway',
];

const SPAM_NAME_KEYWORDS = [
  'virtual assistant', 'lead generation', 'lead gen', 'digital marketing',
  'seo', 'marketing agency', 'marketing team', 'marketing services',
  'outsourcing', 'offshore', 'freelance', 'backlink', 'bulk email',
  'ai assistant', 'ai agent',
];

const SPAM_EMAIL_DOMAINS = [
  'cachehelper.com',
];

const isSpam = (email, name) => {
  const parts = sanitize(email).toLowerCase().split('@');
  const localPart = parts[0];
  const domain = parts[1] ?? '';
  const lowerName = sanitize(name).toLowerCase();
  if (SPAM_EMAIL_KEYWORDS.some((kw) => localPart.includes(kw))) return true;
  if (SPAM_EMAIL_DOMAINS.some((d) => domain === d)) return true;
  if (SPAM_NAME_KEYWORDS.some((kw) => lowerName.includes(kw))) return true;
  return false;
};

const normalizeTemplate = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.replace(/\\n/g, '\n') : fallback;

const renderTemplate = (template, context) =>
  typeof template === 'string'
    ? template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
        typeof context[key] === 'string' ? context[key] : '')
    : '';

const sendEmail = async ({ from, to, cc, replyTo, subject, text, html }) => {
  const cmd = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to],
      ...(cc?.length ? { CcAddresses: cc } : {}),
    },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Message: {
      Subject: { Data: subject },
      Body: { Text: { Data: text }, Html: { Data: html } },
    },
  });
  return ses.send(cmd);
};

const buildNotificationEmail = ({ name, email, phone, message, source, formId, serviceType }) => {
  const leadSource = sanitize(source) || 'website';
  const submittedAt = new Date().toLocaleString();
  const projectType = sanitize(serviceType);

  const lines = [
    'New contact request from the Red Remodels website.', '',
    `Name: ${sanitize(name)}`, `Email: ${sanitize(email)}`, `Phone: ${sanitize(phone) || 'N/A'}`,
  ];
  if (projectType) lines.push(`Project Type: ${projectType}`);
  lines.push('', 'Message:', sanitize(message) || 'N/A', '',
    `Form ID: ${formId || 'more-info'}`, `Source: ${leadSource}`, `Submitted At: ${submittedAt}`);

  const htmlParts = [
    '<h2>New contact request</h2>',
    `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(email)}</p>`,
    `<p><strong>Phone:</strong> ${escapeHtml(phone || '') || 'N/A'}</p>`,
  ];
  if (projectType) htmlParts.push(`<p><strong>Project Type:</strong> ${escapeHtml(projectType)}</p>`);
  htmlParts.push(
    '<p><strong>Message:</strong></p>',
    `<p>${escapeHtml(message || '').replace(/\n/g, '<br>') || 'N/A'}</p>`,
    '<hr />',
    `<p><strong>Form ID:</strong> ${escapeHtml(formId || 'more-info')}</p>`,
    `<p><strong>Source:</strong> ${escapeHtml(leadSource)}</p>`,
    `<p><strong>Submitted At:</strong> ${escapeHtml(submittedAt)}</p>`,
  );

  return {
    subject: process.env.MAIL_SUBJECT ?? 'Red Remodels website: info request',
    text: lines.join('\n'),
    html: htmlParts.join('\n'),
  };
};

const buildConfirmationEmail = ({ name, formId }) => {
  const context = { name: sanitize(name) || 'there', formId: sanitize(formId) || 'contact' };
  const subjectTpl = normalizeTemplate(process.env.MAIL_CONFIRMATION_SUBJECT, 'Thanks for contacting Red Remodels');
  const messageTpl = normalizeTemplate(
    process.env.MAIL_CONFIRMATION_MESSAGE,
    'Hi {{name}},\n\nThanks for reaching out to Red Remodels. We received your message and will be in touch soon.\n\nTalk soon,\nThe Red Remodels Team'
  );
  const fallback = 'Thanks for reaching out. We will be in touch soon.';
  const subject = sanitize(renderTemplate(subjectTpl, context)).slice(0, 200) || 'Thanks for contacting Red Remodels';
  const text = sanitizeMultiline(renderTemplate(messageTpl, context) || fallback).trim() || fallback;
  const html = text.split(/\n{2,}/).map((p) => `<p>${escapeHtmlPreserve(p).replace(/\n/g, '<br>')}</p>`).join('\n');
  return { subject, text, html };
};

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (!isCloudFrontOriginSecretConfigured()) {
    console.error('[contact] CLOUDFRONT_ORIGIN_SECRET is missing or too short.');
    return json(503, { ok: false, error: 'Contact service is not configured.' });
  }
  if (!hasTrustedCloudFrontOrigin(event)) {
    return json(403, { ok: false, error: 'Request could not be verified.' });
  }

  let body;
  try {
    if (typeof event.body === 'string' && Buffer.byteLength(event.body, 'utf8') > MAX_REQUEST_BYTES) {
      return json(413, { ok: false, error: 'Request is too large.' });
    }
    body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body ?? {});
  } catch {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }

  const { name, email, phone, message, turnstileToken, _honey, company, source, formId, serviceType } = body;

  if (_honey || company) return json(400, { ok: false, error: 'Spam detected.' });

  const cleanName = sanitize(name);
  const cleanEmail = sanitize(email);

  if (isSpam(cleanEmail, cleanName)) return json(400, { ok: false, error: 'We were unable to process your request.' });
  const cleanPhone = sanitize(phone);
  const cleanMessage = sanitize(message);
  const cleanServiceType = sanitize(serviceType);

  if (!cleanName || !cleanEmail || !cleanPhone || !cleanMessage)
    return json(400, { ok: false, error: 'Please fill out your name, email, phone number, and a short message.' });

  if (exceedsLimit(name, MAX_NAME_LENGTH) || exceedsLimit(email, MAX_EMAIL_LENGTH)
    || exceedsLimit(phone, MAX_PHONE_LENGTH) || exceedsLimit(message, MAX_MESSAGE_LENGTH)
    || exceedsLimit(serviceType, MAX_SERVICE_TYPE_LENGTH)
    || cleanName.length > MAX_NAME_LENGTH || cleanEmail.length > MAX_EMAIL_LENGTH
    || cleanPhone.length > MAX_PHONE_LENGTH || cleanMessage.length > MAX_MESSAGE_LENGTH
    || cleanServiceType.length > MAX_SERVICE_TYPE_LENGTH)
    return json(400, { ok: false, error: 'One or more fields exceed the allowed length.' });

  if (!isValidEmail(cleanEmail))
    return json(400, { ok: false, error: 'Please provide a valid email address.' });

  const phoneDigits = cleanPhone.replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15)
    return json(400, { ok: false, error: 'Please provide a valid phone number.' });

  const captcha = await verifyTurnstile(turnstileToken);
  if (!captcha.success) return json(captcha.statusCode, { ok: false, error: captcha.error });

  try {
    const recipients = (process.env.MAIL_TO ?? '').split(',').map((a) => a.trim()).filter(Boolean);
    const cc = (process.env.MAIL_CC ?? '').split(',').map((a) => a.trim()).filter(Boolean);
    if (!recipients.length) return json(500, { ok: false, error: 'No recipient address configured.' });

    const { subject, text, html } = buildNotificationEmail({
      name: cleanName, email: cleanEmail, phone: cleanPhone, message: cleanMessage,
      source, formId: sanitize(formId), serviceType: cleanServiceType,
    });

    await sendEmail({
      from: process.env.MAIL_FROM,
      to: recipients,
      cc,
      replyTo: `${cleanName} <${cleanEmail}>`,
      subject, text, html,
    });

    if (MAIL_CONFIRMATION_ENABLED) {
      try {
        const { subject: cs, text: ct, html: ch } = buildConfirmationEmail({ name: cleanName, formId: sanitize(formId) });
        await sendEmail({
          from: process.env.MAIL_CONFIRMATION_FROM ?? process.env.MAIL_FROM,
          to: `${cleanName} <${cleanEmail}>`,
          subject: cs, text: ct, html: ch,
        });
      } catch (err) {
        console.warn('[contact] Confirmation email failed:', err);
      }
    }

    return json(200, { ok: true, message: CONTACT_SUCCESS_MESSAGE });
  } catch (err) {
    console.error('[contact] Send failed:', err);
    return json(500, { ok: false, error: CONTACT_ERROR_MESSAGE });
  }
};
