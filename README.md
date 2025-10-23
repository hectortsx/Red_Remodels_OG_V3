# Red Remodels Test Environment

This repository contains the static assets for the Red Remodels marketing website. A lightweight Node-based development server is included so you can preview the site locally without installing any global tooling.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer (any runtime that supports ES modules will work)

## Getting Started

1. Duplicate `.env.example` and rename the copy to `.env`.
2. Fill in the SMTP and recipient settings so outbound email works (see notes below).
3. Populate `RECAPTCHA_SECRET` with the secret key that pairs with your Google reCAPTCHA site key.
4. Install dependencies and start the server:

```bash
npm install
npm start
```

The server listens on port `4173` by default and serves the static site alongside the contact API. Visit:

```
http://localhost:4173/
```

Submitting the “Want more info?” form will issue a `POST` to `/api/contact`. Successful requests return a JSON payload and send an email via your configured SMTP provider.

### Local verification

- Run `npm start` and open the site in a browser.
- Complete the form with test values. If you have reCAPTCHA enabled, solve the challenge when prompted.
- Watch the terminal for success or error logs. Failed deliveries usually indicate incorrect SMTP credentials or missing environment variables.

## Customisation

The server is configured through environment variables (see `.env.example` for defaults):

| Variable | Purpose |
| --- | --- |
| `PORT` / `HOST` | Network interface (default: `4173` / `0.0.0.0`). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Credentials for your outbound mail server. |
| `MAIL_FROM`, `MAIL_TO`, `MAIL_CC`, `MAIL_SUBJECT` | Email envelope and recipients for contact submissions. |
| `RECAPTCHA_SECRET`, `RECAPTCHA_MIN_SCORE` | Server-side verification for Google reCAPTCHA v3 tokens (optional but recommended). |
| `RATE_LIMIT_MAX` | Number of contact submissions allowed per minute per IP (default: `10`). |
| `CORS_ORIGIN` | Comma-separated list of origins permitted to call the API (omit to allow all). |

Set any variable inline when starting the server, or store them in the `.env` file:

```bash
PORT=8080 MAIL_TO=hello@redremodels.com npm start
```

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running to stop it.
