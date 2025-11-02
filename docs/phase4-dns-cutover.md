# Phase 4 – DNS Cutover Checklist

## 1. Pre-Cutover Verification
- Confirm CloudFront distribution is deployed and serving the site (check distribution domain).
- Ensure Lambda/API Gateway endpoint for `/api/contact` is live and tested.
- Collect current Squarespace DNS records (export or screenshot) for fallback reference.
- Plan maintenance window (DNS propagation up to 24h; most users within 1-4h).

## 2. DNS Strategy Options
1. **Stay on Squarespace DNS** (simpler):
   - Update `www` CNAME → CloudFront domain (`dxxxx.cloudfront.net`).
   - Squarespace does not support ALIAS for apex; use built-in forwarding to redirect `redremodels.com` → `https://www.redremodels.com`.
2. **Migrate to Route 53** (preferred flexibility):
   - Create hosted zone for `redremodels.com`.
   - Import existing records (MX, TXT, etc.).
   - Add ALIAS `A` records for both `redremodels.com` and `www` pointing to CloudFront distribution.
   - Update Squarespace registrar to use Route 53 name servers.

## 3. Record Changes (Squarespace DNS)
- `www.redremodels.com` → CNAME to CloudFront domain.
- Forward root domain:
  - Squarespace “Domain Mapping” → `redremodels.com` redirects to `https://www.redremodels.com`.
- Update/retain existing records (email MX, verification TXT).
- Add SES verification records (from Phase 3) if not already present.

## 4. Record Changes (Route 53 alternative)
- Create ALIAS `A` records (root + www) targeting CloudFront.
- Add `A` (apex) redirect bucket as secondary option if needed.
- Ensure MX/TXT records match original Squarespace settings.
- Insert SES domain verification TXT + DKIM CNAME records.

## 5. Post-Cutover Validation
- Use `dig`/`nslookup` to confirm new records:
  ```bash
  dig www.redremodels.com CNAME
  dig redremodels.com A
  ```
- Test via browser:
  - `http://redremodels.com` → should 301 to `https://www.redremodels.com/`.
  - `https://www.redremodels.com` → loads via CloudFront (check certificate).
- Check CloudFront access logs or analytics to confirm traffic hitting new distribution.
- Run SSL labs scan to verify certificate coverage.

## 6. Communication & Rollback
- Notify stakeholders once DNS update starts.
- Monitor form submissions, analytics, and CloudWatch for errors during propagation.
- If rollback needed, restore previous DNS records (Squarespace export or Route 53 prior settings).

---

_Branch: `phase4-dns-cutover`_
