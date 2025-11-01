# Phase 2 – Static Hosting Execution Plan

## 1. S3 Website Buckets
1. Sign into AWS console (region: `us-east-1` recommended for CloudFront/ACM compatibility).
2. Create bucket **`www.redremodels.com`**:
   - Disable “Block all public access”.
   - Enable ACLs (required for static hosting) if prompted.
   - Under *Properties* → *Static website hosting*: enable, set
     - Index document: `index.html`
     - Error document: `404.html` (falls back to main page; upload separate file or reuse existing template).
3. Upload contents of `red-remodels-site.zip` (the files inside `public/`) to the bucket.
   - Use AWS CLI: `aws s3 sync public/ s3://www.redremodels.com/ --delete`
   - Or unzip locally and upload via console.
4. Optional but recommended: create bucket **`redremodels.com`**.
   - Enable static website hosting with “Redirect requests for an object” → Target host: `www.redremodels.com`.

## 2. Verify S3 Website Endpoint
1. Obtain website endpoint from bucket properties (`http://www.redremodels.com.s3-website-us-east-1.amazonaws.com`).
2. Open in browser to ensure homepage loads and assets resolve.
3. Visit a non-existent path (e.g., `/does-not-exist`) to confirm 404 fallback behavior.

## 3. CloudFront Distribution
1. Create new distribution (Web / HTTP+HTTPS):
   - Origin domain: **S3 website endpoint** (not the REST endpoint).
   - Origin ID: `S3-www.redremodels.com`.
   - Viewer protocol policy: Redirect HTTP to HTTPS.
   - Allowed HTTP methods: GET/HEAD (POST optional once Lambda/API added).
2. Default cache behavior:
   - Cache policy: use managed `CachingOptimized` for static assets or create custom policy (HTML shorter TTL, assets longer).
   - Origin request policy: `AllViewerExceptHostHeader` (or minimal since no query-based behavior yet).
3. Settings:
   - Default root object: `index.html`.
   - Alternate domain names (CNAME): `www.redremodels.com`, `redremodels.com`.
   - SSL certificate: request via **ACM (us-east-1)** covering both hostnames (complete DNS validation).
   - Custom error responses: map `403` and `404` → respond with `200` and `/index.html` for SPA-style routing (optional if site is pure static).
   - Logging: enable to S3 bucket (e.g., `red-remodels-cf-logs`) for later analytics (optional).
4. Deploy distribution; note distribution ID and domain (e.g., `d123abc.cloudfront.net`).

## 4. Post-Setup Validation
1. Before DNS cutover, test via CloudFront domain:
   - `curl -I https://d123abc.cloudfront.net`
   - Check headers, caching, and HTTPS certificate.
2. Confirm HTTP → HTTPS redirect and root index load.
3. Visit random paths to ensure error response configuration works.

## 5. Artifacts to Track
- CloudFront distribution ID & domain.
- ACM certificate ARN + validation status.
- S3 website endpoints.
- Logging bucket if enabled.

_Next Phase_: configure serverless contact endpoint (Lambda + API Gateway + SES).
