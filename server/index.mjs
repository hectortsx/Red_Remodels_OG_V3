import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const CONTACT_ROUTE = process.env.CONTACT_ROUTE ?? '/api/contact';
const CONTACT_SUCCESS_MESSAGE = process.env.CONTACT_SUCCESS_MESSAGE ?? 'Thanks! We will be in touch shortly.';
const CONTACT_ERROR_MESSAGE = process.env.CONTACT_ERROR_MESSAGE ?? 'We were unable to process your request.';
const PORT = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 4173);
const HOST = process.env.HOST ?? '0.0.0.0';
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 10);
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5);

const REQUIRED_MAIL_ENV = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO'];
const missingEnvVars = REQUIRED_MAIL_ENV.filter((key) => !process.env[key]);
if (missingEnvVars.length) {
  console.warn(
    `[contact-api] The following environment variables are missing: ${missingEnvVars.join(
      ', '
    )}. Email delivery will fail until they are provided.`
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const app = express();

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginEmbedderPolicy: false
  })
);

if (corsOrigins) {
  app.use(
    cors({
      origin: corsOrigins,
      methods: ['POST', 'OPTIONS'],
      credentials: false
    })
  );
} else {
  app.use(cors());
}

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    res
      .status(429)
      .json({ ok: false, error: 'Too many requests. Please try again in a moment.' })
});

app.use(CONTACT_ROUTE, limiter);

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

const mailTransporter = (() => {
  try {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } catch (error) {
    console.error('[contact-api] Failed to configure SMTP transport:', error);
    return null;
  }
})();

const sanitize = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 2000) : '';

const escapeHtml = (value) =>
  sanitize(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitize(value));

const verifyRecaptcha = async (token) => {
  if (!process.env.RECAPTCHA_SECRET) {
    return { success: true, skipped: true };
  }

  if (!token) {
    return { success: false, error: 'Missing reCAPTCHA token.' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET,
        response: token
      })
    });

    const result = await response.json();
    if (!result.success) {
      return { success: false, error: 'reCAPTCHA verification failed.' };
    }

    if (typeof result.score === 'number' && result.score < RECAPTCHA_MIN_SCORE) {
      return { success: false, error: 'Suspicious activity detected.' };
    }

    return { success: true };
  } catch (error) {
    console.error('[contact-api] Failed to verify reCAPTCHA:', error);
    return { success: false, error: 'Unable to verify reCAPTCHA token.' };
  }
};

const buildEmailPayload = ({ name, email, phone, message, source, formId }) => {
  const leadSource = sanitize(source) || 'website';
  const submittedAt = new Date().toLocaleString();

  const lines = [
    'New contact request from the Red Remodels website.',
    '',
    `Name: ${sanitize(name)}`,
    `Email: ${sanitize(email)}`,
    `Phone: ${sanitize(phone) || 'N/A'}`,
    '',
    'Message:',
    sanitize(message) || 'N/A',
    '',
    `Form ID: ${formId || 'more-info'}`,
    `Source: ${leadSource}`,
    `Submitted At: ${submittedAt}`
  ];

  const html = `
    <h2>New contact request</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone || '') || 'N/A'}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message || '').replace(/\n/g, '<br>') || 'N/A'}</p>
    <hr />
    <p><strong>Form ID:</strong> ${escapeHtml(formId || 'more-info')}</p>
    <p><strong>Source:</strong> ${escapeHtml(leadSource)}</p>
    <p><strong>Submitted At:</strong> ${escapeHtml(submittedAt)}</p>
  `;

  return {
    subject: process.env.MAIL_SUBJECT ?? 'Red Remodels website: info request',
    text: lines.join('\n'),
    html
  };
};

app.post(CONTACT_ROUTE, async (req, res) => {
  const { name, email, phone, message, recaptchaToken, _honey, company, source, formId } =
    req.body ?? {};

  if (_honey || company) {
    return res.status(400).json({ ok: false, error: 'Spam detected.' });
  }

  const cleanedName = sanitize(name);
  const cleanedEmail = sanitize(email);
  const cleanedMessage = sanitize(message);
  const cleanedPhone = sanitize(phone);

  if (!cleanedName || !cleanedEmail || !cleanedMessage) {
    return res
      .status(400)
      .json({ ok: false, error: 'Please fill out your name, email, and a short message.' });
  }

  if (!isValidEmail(cleanedEmail)) {
    return res.status(400).json({ ok: false, error: 'Please provide a valid email address.' });
  }

  const recaptchaResult = await verifyRecaptcha(recaptchaToken);
  if (!recaptchaResult.success) {
    return res.status(400).json({ ok: false, error: recaptchaResult.error });
  }

  if (!mailTransporter) {
    return res
      .status(500)
      .json({ ok: false, error: 'Mail transport is not configured. Please try again later.' });
  }

  try {
    const recipients = (process.env.MAIL_TO ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);
    const ccRecipients = (process.env.MAIL_CC ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);

    if (!recipients.length) {
      return res
        .status(500)
        .json({ ok: false, error: 'No recipient address configured for contact form.' });
    }

    const { subject, text, html } = buildEmailPayload({
      name: cleanedName,
      email: cleanedEmail,
      phone: cleanedPhone,
      message: cleanedMessage,
      source,
      formId
    });

    await mailTransporter.sendMail({
      from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
      to: recipients,
      cc: ccRecipients.length ? ccRecipients : undefined,
      replyTo: `${cleanedName} <${cleanedEmail}>`,
      subject,
      text,
      html
    });

    return res.json({ ok: true, message: CONTACT_SUCCESS_MESSAGE });
  } catch (error) {
    console.error('[contact-api] Failed to send email:', error);
    return res.status(500).json({ ok: false, error: CONTACT_ERROR_MESSAGE });
  }
});

app.options(CONTACT_ROUTE, (_req, res) => {
  res.sendStatus(204);
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'], index: 'index.html' }));

app.use((req, res) => {
  if (req.method === 'GET') {
    const requestedPath = path.join(PUBLIC_DIR, req.path);
    if (requestedPath.startsWith(PUBLIC_DIR)) {
      return res.sendFile(requestedPath, (err) => {
        if (err) {
          res.status(err.statusCode === 404 ? 404 : 500);
          res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
        }
      });
    }
  }
  res.status(404).json({ ok: false, error: 'Not Found' });
});

const server = app.listen(PORT, HOST, () => {
  console.log(
    `Red Remodels server running at http://${HOST}:${PORT}\n- Static files served from ${PUBLIC_DIR}\n- Contact endpoint: ${CONTACT_ROUTE}`
  );
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
  });
});
