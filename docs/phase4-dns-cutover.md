# Phase 4 – DNS Cutover (Squarespace to AWS)

## Overview

Your domain (`redremodels.com`) is registered in Squarespace. You'll keep it there but update DNS records to point to AWS services (CloudFront for static hosting + SES for email).

## Prerequisites

Before updating DNS in Squarespace, you must have:

- ✅ CloudFront distribution created (you'll need the domain: `d123abc.cloudfront.net`)
- ✅ ACM certificate issued and validated for `www.redremodels.com` + `redremodels.com`
- ✅ SES domain verified with DKIM records ready (SES will provide 3 CNAME records)
- ✅ S3 buckets created and CloudFront linked

---

## Step 1: Access Squarespace DNS Settings

1. Log into [squarespace.com](https://squarespace.com)
2. Navigate to **Settings** → **Domains** → **your domain** → **DNS Settings**
3. You'll see existing Squarespace-managed DNS records (you can leave these or replace them)

---

## Step 2: Add CloudFront CNAME Records

### For `www.redremodels.com` (primary)

| Type  | Name  | Data                     | TTL  |
| ----- | ----- | ------------------------ | ---- |
| CNAME | `www` | `d123abc.cloudfront.net` | 3600 |

### For root domain redirect (optional but recommended)

Create a URL redirect from `redremodels.com` → `www.redremodels.com` using **Squarespace's "Redirect" feature** under domain settings.

---

## Step 3: Add SES DKIM Records

After verifying your domain in SES, you'll receive 3 CNAME records for DKIM authentication.

1. In AWS SES console, go to **Domains** → select `redremodels.com` → **DKIM Settings**
2. Copy each CNAME record provided by SES (typically named like `token1._domainkey.redremodels.com`)
3. Add these 3 records to Squarespace DNS:

| Type  | Name                | Data                        |
| ----- | ------------------- | --------------------------- |
| CNAME | `token1._domainkey` | `token1.dkim.amazonses.com` |
| CNAME | `token2._domainkey` | `token2.dkim.amazonses.com` |
| CNAME | `token3._domainkey` | `token3.dkim.amazonses.com` |

**Status:** SES will automatically verify DKIM when these records are discoverable (usually within 15 minutes).

---

## Step 4: SES Domain Verification TXT Record (Optional)

If SES asks for domain verification:

| Type | Name         | Data                                |
| ---- | ------------ | ----------------------------------- |
| TXT  | `@` or blank | `v=spf1 include:amazonses.com ~all` |

---

## Step 5: Propagation & Testing

1. **Wait for DNS propagation** (typically 15–30 minutes, up to 24 hours):

   ```bash
   dig redremodels.com +short
   dig www.redremodels.com +short
   ```

2. **Test CloudFront:**

   ```bash
   curl -I https://www.redremodels.com
   # Should return 200 with CloudFront headers
   ```

3. **Test SES in AWS console:**
   - Go to SES → **Verified identities** → check status of `redremodels.com`
   - Should show "Verified" for domain + DKIM

4. **Monitor CloudFront distribution logs** for traffic after DNS cutover.

---

## Step 6: Update Site Configuration (if needed)

### Contact Form Endpoint

- If using API Gateway, update CloudFront to route `/api/*` to your API Gateway domain.
- Alternatively, use the full API Gateway invoke URL in the form's `action` attribute.

### SPA Routing (Optional)

If your site uses client-side routing, configure CloudFront custom error responses:

- Map `403` and `404` → respond with `200` and serve `/index.html`

---

## Troubleshooting

| Issue                                 | Solution                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| Site still shows old Squarespace page | Wait for DNS propagation; flush browser cache; check CNAME is correct           |
| SES still not verified                | Verify all 3 DKIM CNAME records exist in Squarespace DNS; wait 15 min           |
| Contact form returns 403/404          | Check API Gateway route in CloudFront origin config; verify CORS settings       |
| SSL certificate error                 | Ensure ACM cert is validated for both `redremodels.com` + `www.redremodels.com` |

---

## Rollback Plan

If cutover fails:

1. Restore old DNS records in Squarespace (keep backups).
2. Disable CloudFront distribution temporarily if needed.
3. Revert SES DKIM records if email breaks.

---

## Next Steps

- Proceed to **Phase 5 – QA & Monitoring** once DNS is live and verified.
