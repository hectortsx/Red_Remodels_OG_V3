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
- `/our-services` → `/pages/desktop/our-services/index.html`
- `/contact-us` → `/pages/desktop/contact-us/index.html`
- Directory paths (no extension) → appends `/index.html`

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
| `RECAPTCHA_SECRET` | (set in Lambda console — do not commit) |

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
| `redremodels-cloudfront-4xx` | CloudFront 4xxErrorRate | > 10% over 5 min |
| `redremodels-lambda-errors` | Lambda Errors | >= 1 over 5 min |

To recreate alarms (e.g. after account changes):
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
