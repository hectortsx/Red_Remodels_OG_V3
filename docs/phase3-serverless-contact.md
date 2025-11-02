# Phase 3 – Serverless Contact Endpoint Plan

## 1. Amazon SES Setup
1. Open SES in `us-east-1` (same region as CloudFront certs).
2. Verify domain `redremodels.com`:
   - SES → *Domains* → **Verify a new domain**.
   - Enable DKIM, generate required TXT/CNAME records.
   - Publish records in Squarespace (or Route 53 if DNS migrated).
   - Wait for “verified” status in SES console.
3. Configure identities:
   - Domain identity covers all senders (e.g., `hello@redremodels.com`).
   - Optional: create an address identity for `hello@redremodels.com` to test sending while domain validation completes.
4. Set MAIL_TO recipients (team inbox) and ensure they can receive messages from SES region (whitelisting if needed).

## 2. Lambda Migration (Node.js 18)
1. Extract validation/email logic from `server/index.mjs`:
   - Sanitize input, honeypot handling, reCAPTCHA verification, payload structuring.
   - Reuse existing helper functions (`sanitize`, `isValidEmail`, etc.).
2. Implement Lambda handler:
   ```javascript
   export const handler = async (event) => {
     // parse JSON body, validate, verify recaptcha, send email via SES
   };
   ```
3. Replace Nodemailer SMTP transport with AWS SES SDK (`@aws-sdk/client-ses`).
   - Use `SendEmailCommand` or `SendRawEmailCommand` for HTML + text.
4. Package dependencies:
   - Add npm dependencies (if any) and bundle for Lambda (`zip` or SAM build).
   - Consider separating helpers into modules for testability.
5. Store environment variables:
   - `RECAPTCHA_SECRET`, `MAIL_TO`, `MAIL_FROM`, `CONTACT_SUCCESS_MESSAGE`, etc.
   - Sensitive values: use Parameter Store (SecureString) and fetch at cold start; or keep as encrypted Lambda environment vars.

## 3. API Gateway Integration
1. Create HTTP API (lower cost) with route `POST /api/contact`.
2. Integrate Lambda (Lambda proxy integration).
3. Configure CORS:
   - Allowed origin: `https://www.redremodels.com`.
   - Methods: `POST`, `OPTIONS`.
   - Headers: `Content-Type`, `X-Requested-With`, `X-Recaptcha-Token` (if used).
4. Apply throttling/quotas (default is fine initially).

## 4. Testing Workflow
1. Local/unit: simulate Lambda invocation with sample event payloads.
2. Deploy infrastructure (SAM/Serverless Framework/console).
3. Use `curl`/Postman against API Gateway URL; confirm:
   - 200 success responses deliver email via SES.
   - 400 errors for invalid input or reCAPTCHA failure.
4. Update site form action to `/api/contact` if CloudFront routes `/api/*` to API Gateway; otherwise use the full invoke URL.
5. Test through CloudFront once static site + API Gateway integration are live.

## 5. Additional Considerations
- ReCAPTCHA: ensure Lambda sends `secret` + client token to Google verification API; handle low score responses.
- Rate limiting: API Gateway default + Lambda validation (honeypot, min fields).
- Logging/Monitoring: use `console.log` for structured logs; set CloudWatch alarms on Lambda errors/Throttles.
- Error handling: return JSON structure consistent with existing front-end expectations.

---

_Branch: `phase3-serverless-contact`_
