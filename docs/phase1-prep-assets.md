# Phase 1 – Deployment Prep Checklist

## Production Bundle
- Pulled latest `main` and created `phase1-prep-assets` branch.
- Zipped deployable assets from `public/` into `red-remodels-site.zip` (ignored via `.gitignore` for future runs).
- Command reference:
  ```bash
  cd public
  zip -r ../red-remodels-site.zip .
  cd ..
  ```

## Legacy URL Redirect Inventory
- Known legacy paths from the previous Duda site that must 301 to new canonicals:

  | Legacy URL                          | Target URL                           | Notes                              |
  |-------------------------------------|--------------------------------------|------------------------------------|
  | `/site/da551f6f/home`               | `/`                                  | Primary home page slug in Duda     |

- Next steps:
  - Export top landing pages from Google Analytics/Search Console for `redremodels.com` prior to cutover.
  - Append additional mappings to this table before configuring CloudFront/Lambda@Edge redirects.

## SES Identity Strategy
- Use **domain-wide** SES identity for `redremodels.com` to cover all sender addresses (e.g., `hello@redremodels.com`).
- Validation method: **DNS** (preferred to avoid manual email approvals).
  - Required DNS records: verification TXT + DKIM CNAMEs issued by SES.
  - Ensure Squarespace (or Route 53 if migrated) can host those records.
- Default sender: `hello@redremodels.com` (matches existing site messaging).

## Contact Form Environment Variables
- Existing Express handler references the following configuration keys (to be replicated in the Lambda/serverless implementation):

  | Variable | Purpose |
  |----------|---------|
  | `CONTACT_ROUTE` | API path (defaults to `/api/contact`) |
  | `CONTACT_SUCCESS_MESSAGE` / `CONTACT_ERROR_MESSAGE` | Custom response text |
  | `PORT`, `SERVER_PORT`, `HOST` | Local server binding (not needed once serverless) |
  | `RATE_LIMIT_MAX` | Throttle window |
  | `RECAPTCHA_MIN_SCORE`, `RECAPTCHA_SECRET` | reCAPTCHA v3 validation |
  | `CORS_ORIGIN` | Allowed origins for cross-domain requests |
  | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Current SMTP transport (superseded by SES) |
  | `MAIL_FROM`, `MAIL_TO`, `MAIL_CC` | Envelope addresses |
  | `MAIL_SUBJECT` | Admin email subject |
  | `MAIL_CONFIRMATION_ENABLED`, `MAIL_CONFIRMATION_FROM`, `MAIL_CONFIRMATION_SUBJECT`, `MAIL_CONFIRMATION_MESSAGE` | Customer auto-reply configuration |

- For the Lambda + SES flow, plan to store sensitive values in Parameter Store or Lambda environment variables with encryption.

---

_Last updated: Phase 1 (`phase1-prep-assets` branch)._ 
