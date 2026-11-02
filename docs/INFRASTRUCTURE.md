# Infrastructure Reference — redremodels.com

Live as of March 2026. All resources are in `us-east-1` unless noted.

---

## AWS Account

| Detail | Value |
|--------|-------|
| Account ID | `365608889294` |
| IAM deployer user | `red-remodels-deployer` |
| CLI profile | `red-remodels-deployer` |

---

## Domain & DNS

| Detail | Value |
|--------|-------|
| Registrar | Squarespace |
| DNS | AWS Route 53 |
| Active hosted zone | `Z04223471C71QJ52UWBI3` |
| Primary URL | `https://www.redremodels.com` |

---

## Static Hosting

| Resource | Value |
|----------|-------|
| S3 bucket | `www.redremodels.com` |
| S3 region | `us-east-1` |
| Access | CloudFront OAC only (no public access) |
| CloudFront distribution ID | `EKTYEDHVURFWC` |
| CloudFront domain | `d3g1vwpy0d42gr.cloudfront.net` |
| Default root object | `index.html` |
| ACM certificate ARN | `arn:aws:acm:us-east-1:365608889294:certificate/448b5221-e294-4d93-9b5a-9f2a9e095e55` |
| Certificate covers | `www.redremodels.com`, `redremodels.com` |

### Deploy command

```bash
aws s3 sync public/ s3://www.redremodels.com/ \
  --delete \
  --profile red-remodels-deployer

aws cloudfront create-invalidation \
  --distribution-id EKTYEDHVURFWC \
  --paths "/*" \
  --profile red-remodels-deployer
```

---

## CloudFront Function

| Detail | Value |
|--------|-------|
| Function name | `redremodels-url-rewrite` |
| ARN | `arn:aws:cloudfront::365608889294:function/redremodels-url-rewrite` |
| Event type | `viewer-request` |
| Source | `infra/cloudfront-functions/url-rewrite.js` |

Handles:
- `redremodels.com` → `www.redremodels.com` (preserves path and query string)
- `/our-services` and the legacy desktop/mobile/tablet `/pages/*` HTML URLs → current canonical pages (preserves query strings)
- `/contact-us` → `/contact-us/index.html`
- Directory paths (no extension) → appends `/index.html`

---

## CloudFront Response Headers Policy

| Detail | Value |
|--------|-------|
| Policy name | `redremodels-security-headers` |
| Policy ID | `7517fc76-39c0-4019-a1c7-7fe40fc2f038` |
| Source configuration | `infra/cloudfront-response-headers-policy.json` |
| Associations | Default site behavior and `/api/*` |

The policy sets HSTS for one year without `includeSubDomains` or preload, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive camera/microphone/geolocation `Permissions-Policy`. A Content Security Policy is not yet enabled; it requires a separate compatibility review of site scripts and third-party integrations.

---

## Contact Form

| Resource | Value |
|----------|-------|
| Lambda function | `red-remodels-contact-handler` |
| Runtime | Node.js 20 |
| Source | `lambda/contact-handler/index.mjs` |
| Execution role | `red-remodels-lambda-role` (has `AmazonSESFullAccess`) |
| API Gateway ID | `4cktifwaki` |
| API Gateway endpoint | `https://4cktifwaki.execute-api.us-east-1.amazonaws.com` |
| Route | `POST /api/contact` |
| CloudFront path | `/api/*` → API Gateway |

### Lambda environment variables

| Variable | Value |
|----------|-------|
| `MAIL_FROM` | `Red Remodels <hello@redremodels.com>` |
| `MAIL_TO` | `hello@redremodels.com` |
| `MAIL_CC` | `hector@savio.design` |
| `CORS_ORIGIN` | `https://www.redremodels.com` |
| `TURNSTILE_SECRET_KEY` | Configured privately; never commit its value. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | `www.redremodels.com,redremodels.com` |
| `CLOUDFRONT_ORIGIN_SECRET` | Configured October 28, 2026; matches the private origin header on CloudFront origin `APIGateway-contact`. Never commit the value. |

As of October 28, 2026, the contact flow uses Cloudflare Turnstile Free and the deployed CloudFront/Lambda origin guard. CloudFront adds `x-red-remodels-origin-verify`; Lambda enforces the matching private environment value. Empty POSTs through CloudFront reach validation (400), while direct API requests with a missing/forged secret return 403. Preflight remains available. The public sitekey is `0x4AAAAAAFqBe8etgytx9j6M`, approved for `www.redremodels.com` and `redremodels.com`.

The owner confirmed successful contact-page and homepage submissions and both business notification emails. The success-message contrast fix is deployed; the unused Google CAPTCHA variables and temporary widget-check page are removed. Turnstile, origin protection, mail settings, and code hashes were verified after cleanup. No WAF resources, CloudFront pricing-plan changes, or DNS changes were introduced. The broader compliance audit remains separate. See the [Turnstile migration runbook](./AWS_WAF_CAPTCHA_IMPLEMENTATION.md).

The Turnstile release uses `TURNSTILE_SECRET_KEY` and `TURNSTILE_ALLOWED_HOSTNAMES=www.redremodels.com,redremodels.com`. These values were configured with hidden input and verified by independent AWS readback. The owner explicitly approved normal token validation at Cloudflare Siteverify after the initial automatic review rejection; a real invalid token was rejected before SES. The Lambda ZIP contains `index.mjs`, `turnstile.mjs`, and `package.json`; omitting the shared verifier breaks startup. The deployed code hash, Active/Successful state, and preserved environment are recorded privately under `.local/waf-baselines/turnstile-env-3yl6kbhf/release-receipts/`.

The release updated 13 frontend objects using scoped live-HTML patches, added phone/email fallbacks, published tested legacy form redirects, and completed targeted CloudFront invalidation. Client/config URLs use `?v=turnstile-20261028-1`; the success/fallback contrast stylesheet now uses `?v=turnstile-20261028-2`. Its opaque pale-green/dark-green success panel was checked on all three forms at 8.65:1 text contrast, and the final live CSS hash matches source. The URL-rewrite function remains associated only with the site default behavior, not `/api/*`. The owner confirmed both business notification emails. The temporary widget-check page and obsolete Google secret/score variables are removed; the Turnstile/origin/mail settings and code are preserved. Final invalidations are Completed, empty-body guard checks still pass, and available immediate Lambda Errors metric points report zero errors. No successful/email-producing test was performed by the coding agent. Private evidence: `cleanup/final-verification.json` in the setup directory.

The lower homepage verification/error-contrast follow-up is deployed as client/CSS version `turnstile-20261028-3`. It adds the SDK's named load callback, shared preload on focus, visible failed widgets with independent retries, and opaque error/pending panels (9.16:1 / 9.52:1 text contrast). All four changed frontend hashes and completed invalidation were verified; 59 isolated tests and real-SDK dummy-key browser checks on both homepage forms pass. No backend/environment change or additional production email was made. After a hard refresh, the owner confirmed the lower form now succeeds on October 28, 2026. Targeted acceptance is complete; an additional lower-form email receipt was not separately claimed. See `lower-form-fix/verification.json` in the private setup folder.

### Update Lambda after code changes

```bash
cd lambda/contact-handler
zip -r ../contact-handler.zip .
aws lambda update-function-code \
  --function-name red-remodels-contact-handler \
  --zip-file fileb://../contact-handler.zip \
  --profile red-remodels-deployer
```

---

## Email (SES)

| Detail | Value |
|--------|-------|
| Verified domain | `redremodels.com` |
| DKIM | Enabled (3 CNAME records in Route 53) |
| Sending mode | Sandbox (production access pending AWS approval) |
| Notification email | `hello@redremodels.com` |
| CC email | `hector@savio.design` |

**Note:** While in sandbox mode, confirmation emails to customers are skipped. Once AWS approves production access, customers will receive a confirmation email automatically — no code changes needed.

---

## Monitoring

| Resource | Value |
|----------|-------|
| CloudFront access logs bucket | `redremodels-cf-logs` (prefix: `cloudfront/`) |
| SNS alerts topic | `arn:aws:sns:us-east-1:365608889294:redremodels-alerts` |
| Alert recipient | `hector@savio.design` |

### CloudWatch alarms

| Alarm | Metric | Threshold |
|-------|--------|-----------|
| `redremodels-cloudfront-5xx` | CloudFront 5xxErrorRate | > 2% over 5 min |
| `redremodels-cloudfront-4xx` | CloudFront 4xxErrorRate | > 90% over 5 min |
| `redremodels-lambda-errors` | Lambda Errors | >= 1 over 5 min |

Turnstile-specific verification monitoring is **deployed and AWS-readback verified** as of October 28, 2026: three dimension-free custom metrics and three alarms for configuration failures, provider unavailability, and sustained rejection volume. The owner approved the estimated $1.20/month metric/alarm cost before allowances/credits, excluding SNS/other usage, and granted the required permissions. All three AWS synthetic pattern checks and nine local safety checks pass. Alerts use the existing SNS topic; existing alarms/subscriptions are preserved. No test notifications were sent, so end-to-end notification delivery remains untested. See the [monitoring runbook](../infra/turnstile-monitoring/README.md).

To recreate the existing alarms (e.g. after account changes):
```bash
bash infra/setup-alarms.sh
```

---

## Analytics

| Detail | Value |
|--------|-------|
| Platform | Google Analytics 4 |
| Measurement ID | `G-SP8EDYP71R` |
| GA account | Savio Design |
| GA property | Red Remodels |
| Dashboard | [analytics.google.com](https://analytics.google.com) |

---

## Site Structure

```
public/
├── index.html                          # Main homepage (custom)
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── css/                            # Shared stylesheets
│   ├── js/
│   │   └── contact-form.js             # Form handler (posts to /api/contact)
│   └── images/
└── pages/
    ├── desktop/
    │   ├── home/
    │   ├── our-services/
    │   └── contact-us/
    ├── mobile/
    │   ├── home/
    │   ├── our-services/
    │   └── contact-us/
    └── tablet/
        ├── home/
        ├── our-services/
        └── contact-us/
```

Pages under `pages/` are Duda-exported HTML served at clean URLs via the CloudFront Function.

## Font and analytics privacy release — October 28, 2026

Applied scoped patches to all 15 maintained live HTML objects: removed the three Google Fonts stylesheet/preconnect links per page and deployed GA4 `page_location` as `window.location.origin + window.location.pathname`. Fresh private S3/public backups matched before conditional writes; existing object metadata and all form markup were preserved. No application assets, Lambda code, secrets, email settings, or unrelated pending HTML changes were deployed. The existing live local-font CSS matches source and all 164 referenced WOFF2 files exist in S3. All 15 public HTML hashes match the release, and the targeted CloudFront invalidation is Completed. Browser samples on home/contact/kitchen/blog observed local fonts and no Google Fonts requests; actual page-view URLs omit the supplied query/fragment. GA4 property settings, referrers/enhanced events and clean-profile consent/cookie behavior remain separate checks. Private evidence: `.local/waf-baselines/privacy-release-1p32yz0u/`.

## Analytics opt-in controls — October 28, 2026

The owner approved keeping GA4 with explicit Accept/Reject preferences. All 15 maintained pages and the blog generator now load local cookie-preferences CSS/JS instead of unconditional Google tags. The controller blocks Google requests until acceptance, supports withdrawal and cross-tab changes, expires the known root-path GA cookies on rejection, and remembers only choice/version/time in localStorage for 180 days. Turnstile remains independent. Page location/referrer are restricted to origin/path and advertising consent stays denied. See [behavior, tests and deployment evidence](./COOKIE_PREFERENCES.md). Fresh live HTML was patched narrowly; no other pending page changes, Lambda code, secrets or mail settings were deployed. All 17 live hashes and completed targeted invalidation are verified.
