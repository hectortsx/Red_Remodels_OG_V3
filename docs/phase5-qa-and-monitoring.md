# Phase 5 – Redirects, QA, and Monitoring

**Status: Complete** (March 2026)

---

## 1. Redirect Implementation ✅

Deployed a CloudFront Function (`redremodels-url-rewrite`) on the `viewer-request` event that:

- Rewrites `/our-services` and `/our-services/` → `/pages/desktop/our-services/index.html`
- Rewrites `/contact-us` and `/contact-us/` → `/pages/desktop/contact-us/index.html`
- Appends `/index.html` to any path with no file extension (directory-style URLs)

Source: `infra/cloudfront-functions/url-rewrite.js`

---

## 2. Functional QA ✅

All checks passed:

| Check | Result |
|-------|--------|
| `https://www.redremodels.com/` | 200 |
| `https://www.redremodels.com/our-services` | 200 |
| `https://www.redremodels.com/contact-us` | 200 |
| `https://www.redremodels.com/sitemap.xml` | 200 |
| `https://www.redremodels.com/robots.txt` | 200 |
| HTTP → HTTPS redirect | 301 ✅ |
| SSL certificate | Valid ✅ |
| Contact form API (`POST /api/contact`) | `{"ok":true}` ✅ |
| Phone link (`tel:+17205192606`) | Present ✅ |
| Email link (`mailto:hello@redremodels.com`) | Present ✅ |
| Facebook / Instagram links | Present ✅ |
| `<link rel="canonical">` | `https://www.redremodels.com/` ✅ |
| OG tags | Title, URL, image, description ✅ |

---

## 3. Performance & SEO QA

- Canonical and OG tags verified pointing to `https://www.redremodels.com/`
- `sitemap.xml` and `robots.txt` accessible
- Lighthouse / PageSpeed audit: run manually at [pagespeed.web.dev](https://pagespeed.web.dev) — recommended periodically

---

## 4. Monitoring & Alerts ✅

- **CloudFront access logs** → `redremodels-cf-logs` S3 bucket (prefix: `cloudfront/`)
- **SNS topic** `redremodels-alerts` → alerts to `hector@savio.design`
- **CloudWatch alarms** created:
  - `redremodels-cloudfront-5xx` — fires if 5xx rate > 2% over 5 min
  - `redremodels-cloudfront-4xx` — fires if 4xx rate > 10% over 5 min
  - `redremodels-lambda-errors` — fires on any Lambda contact handler error

To recreate alarms: `bash infra/setup-alarms.sh`

---

## 5. Analytics ✅

Google Analytics 4 (`G-SP8EDYP71R`) added to homepage `index.html`.

View traffic at [analytics.google.com](https://analytics.google.com) → Savio Design account → Red Remodels property.

---

## Pending

- **SES production access** — submitted to AWS, pending approval (1–3 business days). Once approved, customers will automatically receive a confirmation email after submitting the contact form. No code changes needed.
