# AWS Deployment Checklist - Step-by-Step

This guide organizes all AWS tasks needed to go live. **Note:** you must complete tasks in order.

---

## ✅ Prerequisites (Complete First)

- [ ] AWS Account created
- [ ] Credit card on file (for billing)
- [ ] AWS CLI installed: `brew install awscli` (macOS)
- [ ] AWS credentials configured: `aws configure`
  ```bash
  # Use your AWS Access Key ID + Secret Access Key
  # Default region: us-east-1 (required for CloudFront)
  # Default output format: json
  ```
- [ ] Domain `redremodels.com` registered in Squarespace (✅ already done)

---

## Phase 2 – Static Hosting (Weeks 1-2)

### Task 1: Create S3 Buckets

- [ ] Create bucket: `www.redremodels.com`
- [ ] Disable "Block all public access"
- [ ] Enable static website hosting
- [ ] Set index document: `index.html`
- [ ] Create optional redirect bucket: `redremodels.com` → `www.redremodels.com`

**CLI command:**

```bash
aws s3api create-bucket \
  --bucket www.redremodels.com \
  --region us-east-1

# Then enable static hosting via console or CLI
```

### Task 2: Upload Site Assets

- [ ] Upload contents of `public/` folder to S3

```bash
cd /Users/hector/Developer/Red_Remodels_OG_V3/public
aws s3 sync . s3://www.redremodels.com/ --delete
```

### Task 3: Create CloudFront Distribution

- [ ] Create new CloudFront distribution (Web)
- [ ] Origin: S3 website endpoint (not REST endpoint)
- [ ] Viewer protocol policy: Redirect HTTP to HTTPS
- [ ] Default root object: `index.html`
- [ ] Note the distribution domain: `d123abc.cloudfront.net`

### Task 4: Request ACM SSL Certificate

- [ ] Go to AWS Certificate Manager (us-east-1)
- [ ] Request certificate for:
  - `www.redremodels.com`
  - `redremodels.com`
- [ ] Choose DNS validation
- [ ] Attachment certificate to CloudFront distribution

**Validation:** Open certificate in ACM and copy DNS records to add in Squarespace

### Task 5: Verify Static Site

- [ ] Test via CloudFront domain: `https://d123abc.cloudfront.net`
- [ ] Confirm homepage loads and assets load
- [ ] Check browser developer tools for CloudFront headers

---

## Phase 3 – Serverless Contact (Weeks 2-3)

### Task 6: Set Up SES Domain

- [ ] Go to AWS SES (us-east-1)
- [ ] Verify domain: `redremodels.com`
- [ ] Enable DKIM
- [ ] Copy 3 DKIM CNAME records
- [ ] Add records to Squarespace DNS (see Phase 4)
- [ ] Wait for "Verified" status (15+ minutes)

### Task 7: Test SES Sending (Optional)

- [ ] In SES console, go to **Sending statistics**
- [ ] Verify you can send test emails before Lambda setup

### Task 8: Create Lambda Function

- [ ] Create Node.js 18 function: `red-remodels-contact-handler`
- [ ] Use the migration code from `server/index.mjs` (see below)
- [ ] Add environment variables:
  ```
  RECAPTCHA_SECRET=<your-key>
  MAIL_FROM=hello@redremodels.com
  MAIL_TO=<your-inbox>
  MAIL_SUBJECT=New Contact Form Submission
  MAIL_CONFIRMATION_ENABLED=true
  MAIL_CONFIRMATION_SUBJECT=Thanks for contacting us!
  MAIL_CONFIRMATION_MESSAGE=We'll get back to you soon.
  ```
- [ ] Add IAM policy to allow SES sending

**Lambda IAM Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "*"
    }
  ]
}
```

### Task 9: Create API Gateway

- [ ] Create HTTP API (lower cost than REST API)
- [ ] Route: `POST /api/contact`
- [ ] Integration: Lambda proxy
- [ ] Enable CORS
- [ ] Note the invoke URL: `https://abc123.execute-api.us-east-1.amazonaws.com`

### Task 10: Test Lambda Endpoint

- [ ] Use Postman or curl to POST to API Gateway URL

```bash
curl -X POST https://abc123.execute-api.us-east-1.amazonaws.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hello","g-recaptcha-response":"dummy"}'
```

---

## Phase 4 – DNS Cutover (Week 3)

### Task 11: Add CloudFront CNAME in Squarespace

- [ ] Log into Squarespace
- [ ] Go to Domains → `redremodels.com` → **DNS Settings**
- [ ] Add record:
      | Type | Name | Data |
      |------|------|------|
      | CNAME | `www` | `d123abc.cloudfront.net` |

### Task 12: Add SES DKIM records in Squarespace

- [ ] In Squarespace DNS, add 3 records from AWS SES
      | Type | Name | Data |
      |------|------|------|
      | CNAME | `token1._domainkey` | `token1.dkim.amazonses.com` |
      | CNAME | `token2._domainkey` | `token2.dkim.amazonses.com` |
      | CNAME | `token3._domainkey` | `token3.dkim.amazonses.com` |

### Task 13: Configure Root Domain

- [ ] In Squarespace, under **Domain Mapping**, set redirect:
  - `redremodels.com` → `https://www.redremodels.com`

### Task 14: Wait for DNS Propagation

- [ ] Wait 15–30 minutes (up to 24 hours)
- [ ] Test: `dig www.redremodels.com +short` (should return CloudFront IP)
- [ ] Test: `curl -I https://www.redremodels.com` (should return 200)

### Task 15: Update Contact Form (if needed)

- [ ] If form currently posts to `/api/contact`, update form's `action` attribute to use full API Gateway URL

---

## Phase 5 – QA & Monitoring (Week 4)

### Task 16: Final Testing

- [ ] [ ] Visit https://www.redremodels.com in browser
- [ ] [ ] Submit contact form
- [ ] [ ] Check email inbox for submission
- [ ] [ ] Verify SSL certificate (green lock)
- [ ] [ ] Test on mobile/tablet
- [ ] [ ] Run on all major browsers

### Task 17: CloudWatch Monitoring

- [ ] [ ] Set up CloudWatch alarms for Lambda errors
- [ ] [ ] Set up alarms for CloudFront 4xx/5xx errors
- [ ] [ ] Enable CloudFront logging (optional but recommended)

### Task 18: Go-Live Communication

- [ ] [ ] Notify team and stakeholders
- [ ] [ ] Document new form submission process
- [ ] [ ] Keep Squarespace DNS config as backup

---

## Common Issues & Fixes

| Problem                                         | Solution                                              |
| ----------------------------------------------- | ----------------------------------------------------- |
| CloudFront still serves old content             | Invalidate cache: CloudFront → Invalidations → `/\*`  |
| SES shows "unverified" after DKIM records added | Wait 15+ minutes; check records are exact match       |
| Contact form returns 403                        | Verify CORS settings in API Gateway                   |
| 404 on CloudFront                               | Ensure S3 bucket is public; check index.html uploaded |
| Certificate not covering domain                 | Reissue ACM cert with both domain names               |

---

## Success Criteria

- ✅ Site loads at https://www.redremodels.com
- ✅ Contact form submits successfully
- ✅ Email received in inbox
- ✅ SSL certificate valid (no warnings)
- ✅ Mobile/tablet responsive
- ✅ All errors logged in CloudWatch
