# Red Remodels — redremodels.com

Production marketing website for Red Remodels, live at **[https://www.redremodels.com](https://www.redremodels.com)**.

## Architecture

| Layer | Service |
|---|---|
| Static hosting | AWS S3 + CloudFront (`EKTYEDHVURFWC`) |
| SSL | AWS ACM (covers `www` + apex) |
| DNS | AWS Route 53 |
| Contact form API | AWS Lambda + API Gateway |
| Email | AWS SES (`redremodels.com`) |
| URL routing | CloudFront Function (`redremodels-url-rewrite`) |
| Monitoring | CloudWatch alarms + SNS → `hector@savio.design` |
| Analytics | Google Analytics 4 (`G-SP8EDYP71R`) |

Full infrastructure details: [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)

---

## Local Development

A local dev server is included for previewing the site and testing the contact form without touching AWS.

### Prerequisites

- Node.js 18+
- A `.env` file (copy from `.env.example`)

### Setup

```bash
cp .env.example .env   # configure TURNSTILE_SECRET_KEY, allowed hostnames, and test-only email settings
npm install
npm start              # http://localhost:4173
```

Configure the public widget sitekey in `public/assets/js/contact-form-config.js`. A blank sitekey or missing secret/hostname allowlist keeps submissions closed. Google reCAPTCHA is not a fallback. Use official Turnstile test keys and mocked/test-only email handling in isolated tests; do not use test keys in production. Run `npm run test:contact` for the network-free frontend/Lambda checks.

The local server uses Nodemailer/SMTP for email, and a successful submission can send real email if SMTP credentials are configured. In production, Lambda uses AWS SES. See the [Turnstile migration runbook](docs/AWS_WAF_CAPTCHA_IMPLEMENTATION.md) for account setup, deployment, and owner-approved email testing.

---

## Deploying to Production

### 1. Make changes on a feature branch

```bash
git checkout -b my-feature
# ... make changes ...
git add <files>
git commit -m "describe change"
```

### 2. Merge to main and push to GitHub

```bash
git checkout main
git merge my-feature
git push origin main
```

### 3. Sync to S3 and bust the CloudFront cache

```bash
aws s3 sync public/ s3://www.redremodels.com/ --delete --profile red-remodels-deployer

aws cloudfront create-invalidation \
  --distribution-id EKTYEDHVURFWC \
  --paths "/*" \
  --profile red-remodels-deployer
```

Changes are live within ~30 seconds after the invalidation completes.

### Updating the Lambda (contact form)

```bash
cd lambda/contact-handler
zip -r ../contact-handler.zip .
aws lambda update-function-code \
  --function-name red-remodels-contact-handler \
  --zip-file fileb://../contact-handler.zip \
  --profile red-remodels-deployer
```

---

## Repository Structure

```
public/               # Static site files (deployed to S3)
  index.html          # Homepage
  pages/
    desktop/          # Desktop pages (Duda export, cleaned up)
    mobile/           # Mobile pages
    tablet/           # Tablet pages
  assets/             # Shared CSS, JS, images

lambda/
  contact-handler/    # AWS Lambda — contact form handler (Node.js 20)

server/               # Local dev server (Node.js + Express + Nodemailer)

infra/
  cloudfront-functions/url-rewrite.js   # CloudFront URL rewrite rules
  setup-alarms.sh                       # CloudWatch alarm setup script

docs/                 # Project documentation
  INFRASTRUCTURE.md   # All AWS resource IDs, endpoints, and commands
  DEPLOYMENT_CHECKLIST.md
  phase2-static-hosting.md
  phase3-serverless-contact.md
  phase4-dns-cutover.md
  phase5-qa-and-monitoring.md
```

---

## Pending

- **SES production access** — submitted to AWS, pending approval. Once approved, customers will receive a confirmation email after submitting the contact form. No code changes needed.
