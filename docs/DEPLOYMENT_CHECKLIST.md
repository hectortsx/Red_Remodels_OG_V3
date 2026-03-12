# Deployment Checklist — redremodels.com

**Status: Live** as of March 2026.

For full infrastructure details see [INFRASTRUCTURE.md](./INFRASTRUCTURE.md).

---

## Phase 2 – Static Hosting ✅

- [x] S3 bucket `www.redremodels.com` created (us-east-1)
- [x] Origin Access Control (OAC) configured — bucket is private, CloudFront-only
- [x] Site files uploaded to S3 (`public/` → `s3://www.redremodels.com/`)
- [x] CloudFront distribution created (ID: `EKTYEDHVURFWC`)
- [x] Default root object set to `index.html`
- [x] ACM SSL certificate issued and attached (covers `www` + apex)
- [x] HTTP → HTTPS redirect enabled

---

## Phase 3 – Serverless Contact Form ✅

- [x] SES domain `redremodels.com` verified with DKIM
- [x] Lambda function `red-remodels-contact-handler` deployed (Node.js 20)
- [x] Lambda IAM role `red-remodels-lambda-role` with `AmazonSESFullAccess`
- [x] API Gateway HTTP API created (`4cktifwaki`), route `POST /api/contact`
- [x] CloudFront behavior `/api/*` → API Gateway
- [x] Contact form tested end-to-end (returns `{"ok":true}`)
- [x] All Duda forms replaced with `data-secure-form` custom forms across all pages
- [ ] SES production access — **pending AWS approval**

---

## Phase 4 – DNS Cutover ✅

- [x] Route 53 hosted zone `Z04223471C71QJ52UWBI3` active
- [x] `www.redremodels.com` A record → CloudFront alias
- [x] `redremodels.com` A record → CloudFront alias
- [x] DKIM CNAME records added to Route 53
- [x] DNS propagated — site live at `https://www.redremodels.com`

---

## Phase 5 – QA & Monitoring ✅

- [x] CloudFront Function `redremodels-url-rewrite` deployed (clean URL routing)
- [x] All key pages return 200 (`/`, `/our-services`, `/contact-us`)
- [x] SSL, canonical tags, OG tags verified
- [x] CloudFront access logging → `redremodels-cf-logs`
- [x] SNS alerts topic → `hector@savio.design`
- [x] CloudWatch alarms: 4xx, 5xx, Lambda errors
- [x] GA4 analytics (`G-SP8EDYP71R`) added to homepage

---

## Ongoing Operations

### Deploy site changes

```bash
aws s3 sync public/ s3://www.redremodels.com/ --delete --profile red-remodels-deployer
aws cloudfront create-invalidation --distribution-id EKTYEDHVURFWC --paths "/*" --profile red-remodels-deployer
```

### Update Lambda

```bash
cd lambda/contact-handler
zip -r ../contact-handler.zip .
aws lambda update-function-code \
  --function-name red-remodels-contact-handler \
  --zip-file fileb://../contact-handler.zip \
  --profile red-remodels-deployer
```

### Update CloudFront URL rewrite rules

Edit `infra/cloudfront-functions/url-rewrite.js`, then:

```bash
ETAG=$(aws cloudfront describe-function --name redremodels-url-rewrite \
  --profile red-remodels-deployer --query ETag --output text)

aws cloudfront update-function \
  --name redremodels-url-rewrite \
  --if-match $ETAG \
  --function-config '{"Comment":"URL rewrite","Runtime":"cloudfront-js-2.0"}' \
  --function-code fileb://infra/cloudfront-functions/url-rewrite.js \
  --profile red-remodels-deployer

aws cloudfront publish-function \
  --name redremodels-url-rewrite \
  --if-match $ETAG \
  --profile red-remodels-deployer
```
