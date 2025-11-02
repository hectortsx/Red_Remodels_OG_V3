# Phase 5 – Redirects, QA, and Monitoring Plan

## 1. Redirect Implementation
- Compile final legacy URL → new URL mapping (extend spreadsheet from Phase 1).
- For simple static redirects:
  - Option A: upload `_redirects` file in S3 (if using Netlify-style hosting).
  - Option B: configure S3 redirect rules via bucket properties.
- For dynamic/complex patterns:
  - Deploy CloudFront Function or Lambda@Edge to issue 301s based on path map.
  - Example CloudFront Function snippet:
    ```javascript
    function handler(event) {
      const request = event.request;
      const redirects = {
        '/site/da551f6f/home': '/'
        // add more mappings
      };
      if (redirects[request.uri]) {
        return {
          statusCode: 301,
          headers: {
            location: { value: redirects[request.uri] }
          }
        };
      }
      return request;
    }
    ```

## 2. Functional QA
- Validate top-level pages: `/`, `/our-services`, `/contact-us`.
- Verify forms:
  - Service request form (`/` hero) posts to new Lambda endpoint (200 response, email received).
  - Contact form (`/contact-us`) similar checks.
- Confirm reCAPTCHA token is generated and validated server-side.
- Check social links, phone links (`tel:`), and mailto addresses.

## 3. Performance & SEO QA
- Run Lighthouse/PageSpeed Insight on desktop/mobile.
- Ensure canonical tags and OG tags reference `https://www.redremodels.com/`.
- Verify sitemap/robots accessible at `https://www.redremodels.com/sitemap.xml` and `robots.txt`.
- Test share previews via Facebook Sharing Debugger, LinkedIn Inspector, X Card Validator.

## 4. Monitoring & Alerts
- CloudFront: enable access logs; set CloudWatch metrics alarms for 4xx/5xx spikes.
- Lambda: configure error alarms (e.g., error percentage > 5%).
- SES: monitor bounce/complaint notifications (SNS topic or CloudWatch metrics).
- Optional: integrate with third-party uptime monitor (e.g., UptimeRobot, Pingdom).

## 5. Rollout Checklist
- Final review of DNS (Phase 4) to confirm correct domains.
- Confirm API Gateway logs show expected traffic.
- Verify analytics (GA/GTM) receiving hits post-launch.
- Document all monitoring endpoints and notification recipients.

---

_Branch: `phase5-qa-and-monitoring`_
