import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5);
const MAIL_CONFIRMATION_ENABLED = process.env.MAIL_CONFIRMATION_ENABLED !== 'false';
const CONTACT_SUCCESS_MESSAGE = process.env.CONTACT_SUCCESS_MESSAGE ?? 'Thanks! We will be in touch shortly.';
const CONTACT_ERROR_MESSAGE = process.env.CONTACT_ERROR_MESSAGE ?? 'We were unable to process your request.';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'https://www.redremodels.com';

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

const normalizeTemplate = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.replace(/\\n/g, '\n') : fallback;

const renderTemplate = (template, context) =>
  typeof template === 'string'
    ? template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
        typeof context[key] === 'string' ? context[key] : '')
    : '';

const verifyRecaptcha = async (token) => {
  if (!process.env.RECAPTCHA_SECRET) return { success: true };
  if (!token) return { success: false, error: 'Missing reCAPTCHA token.' };
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET, response: token }),
    });
    const result = await res.json();
    if (!result.success) return { success: false, error: 'reCAPTCHA verification failed.' };
    if (typeof result.score === 'number' && result.score < RECAPTCHA_MIN_SCORE)
      return { success: false, error: 'Suspicious activity detected.' };
    return { success: true };
  } catch (err) {
    console.error('[contact] reCAPTCHA error:', err);
    return { success: false, error: 'Unable to verify reCAPTCHA token.' };
  }
};

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

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body ?? {});
  } catch {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }

  const { name, email, phone, message, recaptchaToken, _honey, company, source, formId, serviceType } = body;

  if (_honey || company) return json(400, { ok: false, error: 'Spam detected.' });

  const cleanName = sanitize(name);
  const cleanEmail = sanitize(email);
  const cleanPhone = sanitize(phone);
  const cleanMessage = sanitize(message);

  if (!cleanName || !cleanEmail || !cleanPhone || !cleanMessage)
    return json(400, { ok: false, error: 'Please fill out your name, email, phone number, and a short message.' });

  if (!isValidEmail(cleanEmail))
    return json(400, { ok: false, error: 'Please provide a valid email address.' });

  const captcha = await verifyRecaptcha(recaptchaToken);
  if (!captcha.success) return json(400, { ok: false, error: captcha.error });

  try {
    const recipients = (process.env.MAIL_TO ?? '').split(',').map((a) => a.trim()).filter(Boolean);
    const cc = (process.env.MAIL_CC ?? '').split(',').map((a) => a.trim()).filter(Boolean);
    if (!recipients.length) return json(500, { ok: false, error: 'No recipient address configured.' });

    const { subject, text, html } = buildNotificationEmail({
      name: cleanName, email: cleanEmail, phone: cleanPhone, message: cleanMessage,
      source, formId: sanitize(formId), serviceType: sanitize(serviceType),
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
