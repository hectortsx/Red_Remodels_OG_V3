# Contact Form CAPTCHA — Cloudflare Turnstile Implementation Runbook

**Decision date:** October 28, 2026. The owner approved Cloudflare Turnstile Free in place of AWS WAF CAPTCHA because predictable CAPTCHA cost is a priority.
**Status:** Turnstile-only contact flow is deployed as of October 28, 2026. The owner confirmed the real widget succeeds and explicitly approved Cloudflare Siteverify token validation. Lambda is Active/Successful with the reviewed package hash and preserved environment; all 13 live frontend object hashes match, eight no-email rejection/preflight checks pass, and 18 legacy home/contact URL variants redirect correctly. The current 59 isolated contact tests and the existing six routing tests pass. The owner reports successful submissions and received business notifications from both the contact page and homepage. The homepage success-message contrast issue is fixed and deployed, unused Google environment variables and the temporary widget page are removed, and immediate post-deployment verification passed. Ongoing monitoring and broader site compliance/accessibility work continue separately. No WAF resources were created.
**Latest follow-up:** The owner subsequently reported verification failure and unreadable error text on the lower homepage form. The browser loading/retry flow and error/pending status contrast were updated and deployed as `turnstile-20261028-3`; 59 isolated tests, real-SDK dummy-key browser checks on both homepage forms, and live file/hash/cache checks pass. The owner hard-refreshed and confirmed “The lower form now succeeds” on October 28, 2026. Targeted frontend acceptance is complete; the original customer-side error code was not captured.
**File naming:** This existing filename is retained to preserve links. Its former AWS WAF CAPTCHA task list is superseded by the Turnstile tasks below.
**Production path:** Browser form → CloudFront `/api/*` → API Gateway `POST /api/contact` → Lambda verifies Turnstile with Cloudflare → SES.

**Owner clarification:** Google reCAPTCHA is excluded from both the target implementation and rollback because the account has a billing issue. New source uses Turnstile only, with no provider switch or fallback to Google. The deployed handler and maintained contact flow use only Turnstile; Google scripts were removed from the homepage/contact page and eight service pages. The old Google secret/score variables were removed after the owner confirmed both notification emails arrived.

## Decision and cost boundary

- Use Cloudflare Turnstile's **Free** plan for contact-form verification. Its published plan includes unlimited challenges and verification requests. It works with existing AWS hosting without moving DNS or proxying the website through Cloudflare. See [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/) and [overview](https://developers.cloudflare.com/turnstile/).
- Do not create the previously proposed pay-as-you-go WAF ACL, CAPTCHA rule, AWS CAPTCHA API key, or budget alert as part of this migration. The discussed $10 threshold was not approved as an alert and cannot serve as a hard AWS spending cap.
- Turnstile does not cap the overall AWS bill or prevent every bot request from reaching API Gateway/Lambda. Retain API throttling, validation, spam controls, and monitoring.
- A possible CloudFront Free-plan/WAF compatibility review is a **separate future task**. Do not change the distribution's pricing plan, DNS, response-header policies, or hosting while implementing Turnstile.

## Completed protection — retain it

- [x] Capture/review AWS baseline and download/hash-verify the original deployed Lambda ZIP.
- [x] Save fresh pre-change CloudFront/Lambda configuration and live homepage/contact copies privately.
- [x] Configure origin `APIGateway-contact` on distribution `EKTYEDHVURFWC` to add `x-red-remodels-origin-verify`.
- [x] Configure matching Lambda `CLOUDFRONT_ORIGIN_SECRET`; keep it private and unchanged during this migration.
- [x] Deploy the origin guard to `red-remodels-contact-handler`; verify package hash and preserved environment values.
- [x] Pass 12 isolated handler tests and six live checks using only empty JSON POST bodies and OPTIONS, without sending email.

This work remains necessary with Turnstile. A browser token is verified by Lambda, while the origin header restricts direct invocation through the public API endpoint. Never put the origin secret in frontend code or remove the guard to simplify testing. CORS, Origin, and Referer are not authentication.

## Ordered Turnstile implementation tasks

Checklist completion requires implementation and verification, not only preparation. The owner has approved the provider change; successful production email tests still need explicit approval at task 11.

1. **Create the Turnstile widget — owner/account setup.** In a Cloudflare account, create a Free-plan widget named `Red Remodels Contact`, select **Managed** mode, and register `www.redremodels.com`. Add only approved staging hostnames. The owner registered both `www.redremodels.com` and `redremodels.com`; both are approved for returned-hostname validation. Preserve the apex-to-www redirect. Leave pre-clearance disabled because this integration validates tokens in Lambda. No DNS transfer is required. Follow the [owner handoff](./AWS_WAF_CAPTCHA_OWNER_HANDOFF.md).
2. **Record keys securely — owner + coding agent.** Provide the public **sitekey** for the frontend. Save the private **secret key** in a password manager and configure it as Lambda `TURNSTILE_SECRET_KEY`, preserving all existing environment values, especially `CLOUDFRONT_ORIGIN_SECRET` and the current mail settings. Use the console or a secure local prompt for CLI setup; do not put secrets in shell history, source, screenshots, logs, or chat. Configure `TURNSTILE_ALLOWED_HOSTNAMES=www.redremodels.com,redremodels.com` (plus only approved staging hosts, comma-separated); the verifier requires this explicit allowlist. Adding environment values alone does not replace deployed code.
3. **Choose the test environment and refresh rollback materials.** Prefer an isolated HTTPS test deployment with test-only email handling or mocked SES. Record the staging hostname, recipients, owner, and current frontend/backend settings. Refresh the AWS baseline and back up the currently deployed **guarded** Lambda ZIP before deployment; the original unguarded ZIP is not a safe standalone rollback. Use Cloudflare's official test keys only in local/isolated tests, never production.
4. **Implement fail-closed Lambda verification.** Add a bounded-timeout POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` using the private secret and submitted token. Require provider `success`, an explicitly allowed returned hostname, and the expected returned action `contact` before SES. Reject missing/invalid token, missing secret, timeout, malformed response, wrong hostname/action, provider rejection, and unknown provider configuration. Do not trust a client-supplied hostname/action as proof. Return generic retry/phone errors; log only bounded provider error codes, never secrets, tokens, personal fields, or full request/provider objects. Retain origin guard, body/field limits, honeypot, spam checks, and API throttles.
5. **Use Turnstile only; prepare a complete package.** Per the owner clarification, do not add a Google provider switch, fallback, or bypass. Branch source removes Google verification and requires Turnstile for every accepted request. Package **`index.mjs`, `turnstile.mjs`, and `package.json`** together; omitting the shared verifier breaks Lambda startup. Prepare the real keys and isolated tests before deployment. If rollout fails, use the phone fallback and remain fail-closed.
6. **Implement the maintained frontend.** Update `public/index.html`, `public/contact-us/index.html`, and shared `public/assets/js/contact-form.js`. Inventory any still-reachable legacy forms without editing generated/legacy exports blindly. Load the official script from `https://challenges.cloudflare.com/turnstile/v0/api.js` and explicitly render a Managed widget on submit for each form using the public sitekey and action `contact`. Submit the `turnstileToken` field to the existing same-origin `/api/contact` endpoint only after verification succeeds. Use ordinary form JSON fetch; the former AWS WAF integration SDK is no longer part of the design.
7. **Preserve accessible submission and retry behavior.** Retain native validation, field limits, status announcements, keyboard access, focus visibility, phone fallback `(720) 519-2606`, pending/success/error states, and anti-double-submit behavior. Fail closed if the script/widget/token is unavailable. Handle error, expiration, and timeout callbacks; refresh/reset the correct widget before retry rather than reusing a consumed token. Turnstile tokens expire after five minutes and can be validated only once. Do not automatically repeat email-producing POSTs after ambiguous network failures.
8. **Review policy and privacy compatibility.** Check Turnstile script/frame/connect requirements against the actual response headers/CSP, including any report-only policy. Permit only the necessary origins and avoid blanket permissive policies. Update the provider/data inventory and relevant privacy disclosures; do not mark the wider compliance audit complete just because the CAPTCHA provider changes.
9. **Run local/isolated acceptance checks.** Mock Siteverify and SES to test success, missing/invalid/expired/replayed token, wrong hostname/action, missing secret, provider timeout/error, script failure, retry/reset, duplicate submits, and no sensitive logging. Confirm failures never reach SES. Official test credentials can exercise widget behavior in isolated deployments; they do not prove real production-domain validation.
10. **Prepare and execute a coordinated production cutover.** Once real keys and isolated tests are ready, coordinate the Turnstile-only backend and frontend deployment. There is no provider-selection variable and Google is not a fallback. Account for CloudFront/browser cache versions and already-open forms; use a brief maintenance/phone-fallback period if necessary instead of an unverified bypass. Preserve all other environment and distribution settings, save deploy hashes, invalidate only changed asset paths, and recheck preflight plus the direct API guard. Do not treat configuration as deployed code.
11. **Approve one controlled production submission.** After no-email checks and real widget initialization pass, obtain explicit owner approval for one clearly labeled request using approved contact details/recipients. Record the page result and business notification; inspect the configured confirmation-email behavior. Do not repeatedly submit or declare success based only on token verification.
12. **Verify Google removal and clean up stale configuration.** Google scripts and verification are removed from maintained branch source. At cutover, verify deployed pages/server no longer invoke Google CAPTCHA, inventory any legacy URLs and their redirects, and remove the now-unused `RECAPTCHA_SECRET` and `RECAPTCHA_MIN_SCORE` from Lambda through a deliberate environment update preserving every other value. Do not remove unrelated analytics code as part of this task. Retain Turnstile, the origin guard, and all other abuse controls.
13. **Monitor and close the migration.** Review Turnstile verification outcomes, Lambda/provider errors, API throttling, SES delivery, and AWS charges. Record widget owner, public sitekey/hostnames, deployment hashes, safe log retention, and rollback steps. Close the audit item only after production acceptance and post-deployment review. Reconsider free WAF compatibility separately if desired.

## Current next step and ownership

**Privacy follow-up:** The [technical data inventory](./PRIVACY_DATA_INVENTORY.md) is prepared with current AWS metadata and sampled live-page checks. Mailbox access, provider account settings, retention/deletion decisions, and browser cookie observations remain open. The subsequent scoped privacy release removed Google Fonts links and deployed query/fragment-free GA4 page locations across all 15 maintained live pages; four browser samples verified actual page-view URLs and local font delivery. GA4 account settings, referrers/enhanced events, and clean-profile cookie behavior remain open.

**Verification monitoring completed:** Three metric filters and three alarms for server configuration failures, provider unavailability, and sustained rejection volume are deployed and AWS-readback verified as of October 28, 2026. All three real AWS pattern tests and nine local safety checks pass. The owner approved the estimated $1.20/month metric/alarm cost and granted the required permissions. Alerts use the existing SNS topic; no test notifications or contact requests were sent. End-to-end notification delivery remains untested. See the [monitoring runbook](../infra/turnstile-monitoring/README.md) for thresholds, coverage limits, and private evidence locations. Broader compliance/accessibility tasks remain separate.

- [x] Owner approved replacing the AWS WAF CAPTCHA plan with Turnstile Free.
- [x] Owner creates widget and supplies public sitekey `0x4AAAAAAFqBe8etgytx9j6M` with approved hosts `www.redremodels.com` and `redremodels.com`; frontend public configuration updated. Secret remains private.
- [x] Owner runs `python3 scripts/configure-turnstile.py`; AWS readback confirms Active/Successful state, the configured secret and both-hostname allowlist, preserved environment values, and unchanged guarded code. Private records: `.local/waf-baselines/turnstile-env-3yl6kbhf/`. No code deployed by this environment update.
- [x] Prepare and verify `index.mjs`, `turnstile.mjs`, and `package.json` in the private `turnstile-contact-handler.zip`; hash recorded in `turnstile-package.json` and verified against the deployed Lambda.
- [x] Owner checks the real widget on the temporary no-email page at `https://www.redremodels.com/verification-check-a64d66ecc1d98bd7/index.html` and reports **Verification succeeded**. This uses an already approved hostname, no contact fields, and no API/email submission path. It does not test server-side token validation or replace full form acceptance.
- [x] Owner explicitly approves private-secret transmission only to Cloudflare's official Siteverify endpoint. After that approval, one deliberately invalid token was checked using the real secret: Cloudflare returned HTTP 200 with `invalid-input-response`; the local verifier rejected it with 400, with no SES path. Private record: `provider-negative-check.json`. The earlier automatic review rejection was resolved by the owner's explicit destination-specific approval, not a workaround.
- [x] Owner approved the production test and reports successful contact-page/homepage submissions with both business notifications received. No additional successful submission was sent by the coding agent.
- [x] Coding agent implements Turnstile-only Lambda/frontend/local-preview changes and 59 isolated tests (`npm run test:contact`).
- [x] Owner verifies the real widget on the approved production hostname; the public sitekey/private settings are configured. The deployed contact page was inspected for versioned assets, its accessible widget/status/fallback markup, and no horizontal overflow at the checked viewport. Broader assistive-technology/mobile acceptance remains part of ongoing QA.
- [x] Deploy the complete Turnstile Lambda, 13 prepared frontend objects, and tested legacy redirects; targeted CloudFront invalidation is Completed. Verify all hashes, preserved environment, eight live no-email checks, and 18 legacy form redirects.
- [x] Owner confirms contact-page and homepage production submissions and business email delivery. Confirmation-email receipt was not separately claimed or tested by the coding agent.
- [x] Remove unused Google environment values and the temporary widget-check object after acceptance. Readback confirms Turnstile/origin/mail settings and code are preserved, cache invalidations completed, and the temporary S3 object is absent.
- [x] Fix the reported homepage success-message contrast with an opaque pale-green panel/dark-green text, verified in static browser previews of all three forms (8.65:1 text-to-panel contrast), then deploy and verify live CSS/page version `turnstile-20261028-2`. Phone/email fallback text is also readable on the red homepage section.
- [x] Immediate monitoring check: four available Lambda Errors metric points in the checked 30-minute window report a sum of zero. Continue routine monitoring; this is not a long-term reliability guarantee.

### Release record — October 28, 2026

The release patched the current live S3 HTML with CAPTCHA/fallback changes, rather than publishing other pending branch-wide page/style edits. It uploaded the versioned shared client/config and verification stylesheet, deployed the three-file Lambda ZIP with a current revision ID, conditionally updated 10 HTML objects against their captured S3 ETags, and published the existing URL-rewrite function after an AWS test. The API behavior remains outside that viewer-request function. Script URLs use `?v=turnstile-20261028-1` so new pages do not reuse a browser-cached Google handler. The deployed HTML/asset bytes and Lambda package hashes were checked against the prepared release.

The first release validator paused before redirect publication because AWS wraps its `FunctionOutput` under `response`. The test itself returned the expected 301 with no function error; the validator was corrected, current revisions rechecked, and publication/invalidation completed without repeating frontend uploads or Lambda deployment.

Private evidence is under `.local/waf-baselines/turnstile-env-3yl6kbhf/`: `release-before/`, `release-files/`, `frontend-release.json`, `turnstile-package.json`, and `release-receipts/` (deployment responses, routing test/publication, completed invalidation, and `acceptance-no-email.json`). These files can include credentials/configuration and must stay private.

| Live acceptance check | Result |
| --- | --- |
| All 13 released frontend objects | 200; exact reviewed SHA-256 hashes |
| Lambda | Active/Successful; package hash matches; environment preserved |
| CloudFront required-fields validation | 400 |
| Direct API without secret / with forged secret | 403 / 403 |
| CloudFront overwrites forged viewer header | 400 required-fields validation |
| CloudFront / direct API OPTIONS | 204 / 204, expected CORS permissions |
| Invalid Turnstile token through live API | 400, generic verification error before SES |
| Legacy Google token without Turnstile token | 400; cannot authenticate |
| All 18 legacy home/contact URL variants | 301 to maintained forms, query preserved |
| Successful production submission and email | Owner reports contact-page and homepage success and both business notifications received |
| Success-message contrast follow-up | Fixed/deployed; 8.65:1 panel contrast in all three static form previews; final CSS hash and page version verified |
| Cleanup | Old Google variables removed; temporary widget object absent; origin/Turnstile/mail settings and Lambda code preserved |

No successful/email-producing submission was performed by the coding agent. The owner completed tests and confirmed both business emails arrived. The temporary widget-check page was removed; its exact-path invalidation completed. `RECAPTCHA_SECRET` and `RECAPTCHA_MIN_SCORE` were removed from Lambda (the obsolete bypass variable is also absent). The Turnstile CAPTCHA migration is functionally complete; wider privacy/accessibility/monitoring tasks remain separate.

### Contrast and cleanup acceptance — October 28, 2026

The owner reported that the homepage success message blended into its background. A scoped follow-up added opaque `#ecfdf5` success panels with `#14532d` text and a green/white icon, avoiding dependence on the surrounding form color. Browser previews with scripts removed and submission disabled verified all three forms; no email was sent for these checks. The text-to-panel contrast is 8.65:1. Phone/email fallback text uses dark slate on light forms and white in the red homepage section.

Only the verification stylesheet and its cache-version references on the two live pages were changed. Both pages now load `contact-verification.css?v=turnstile-20261028-2`, with browser revalidation enabled. The final live stylesheet hash matches branch source, and all contrast/cleanup invalidations are Completed. Post-cleanup empty requests still reach CloudFront validation (400) and direct API rejection (403). Lambda remains Active/Successful with the Turnstile package hash; required settings are preserved and unused Google variables are absent. Immediate Lambda Errors metrics had four available points and a reported sum of zero in the checked 30-minute window; billing/metric reporting can lag, so routine monitoring remains appropriate.

Private follow-up evidence: `contrast-fix/`, `cleanup/result.json`, and `cleanup/final-verification.json` under the existing private setup directory. Historical release receipts/hashes remain unchanged for auditability; the CSS/page follow-up is recorded separately. Do not expose private backups. See the [owner handoff](./AWS_WAF_CAPTCHA_OWNER_HANDOFF.md).

### Lower homepage form follow-up — October 28, 2026

The owner reported that the lower homepage form showed a verification error with no visible widget, and its error text blended into the background. The bounded server-diagnostic review showed only the earlier known invalid-token test, with no new logged Siteverify rejection in the checked window. This suggests the reported failure occurred in the browser; it does not establish the exact original client error code.

The shared loader now waits for Cloudflare's documented named SDK `onload` callback, rather than treating the script element's load event as SDK readiness. Focusing either form starts the shared SDK download without executing a token challenge or submitting data. Submit still requires a fresh verified token. Each form owns its widget, waits for a valid widget ID, keeps a failed widget visible, and disposes it before that same form retries. Only known form identifiers, fixed diagnostic reasons, and six-digit client error codes are logged; no exception objects, tokens, or field values are logged.

Opaque status panels cover **all** states: error `#7f1d1d` on `#fef2f2` (9.16:1), pending `#1e3a8a` on `#eff6ff` (9.52:1), and the existing success panel (8.65:1). Hidden statuses stay hidden. Browser error-state previews verified the lower form against its actual red background.

Validation: 59 isolated contact tests pass, including delayed SDK callback, readiness timeout/late callback recovery, shared loading, sequential forms, invalid widget ID, safe diagnostics, and failed-widget visibility. In a localhost-only browser preview, both homepage forms completed using Cloudflare's official always-pass dummy key and a mock contact endpoint; no real CAPTCHA was solved and no email was sent. These checks validate the integration lifecycle, not the owner's live browser/network. See [Cloudflare's async onload guidance](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/) and [official test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

Four scoped objects were conditionally updated: the shared JS/CSS and version references in the current live homepage/contact HTML. Both pages now reference client/CSS version **`turnstile-20261028-3`**; the public-key config remains unchanged. Cache invalidation is Completed and all four live hashes match the prepared files. Backend code, credentials, origin protection, and email settings were unchanged. Private evidence: `lower-form-fix/release-plan.json`, `receipts/`, and `verification.json` under the existing private setup directory. The owner subsequently confirmed “The lower form now succeeds” after the requested hard refresh. This closes the targeted lower-form follow-up. That confirmation records form success; it does not separately claim receipt of an additional lower-form email. No further test submission is needed.

## Origin guard acceptance — October 28, 2026

All POST bodies were `{}` and returned before CAPTCHA verification or SES. No email-producing request was sent.

| Check | Result |
| --- | --- |
| CloudFront contact POST | 400, expected required-fields validation |
| Direct API contact POST without secret | 403, expected origin rejection |
| Direct API contact POST with forged secret | 403, expected origin rejection |
| CloudFront contact POST with forged viewer header | 400, expected validation; CloudFront replaced the viewer value |
| CloudFront OPTIONS | 204, expected CORS origin/method/header permissions |
| Direct API OPTIONS | 204, expected CORS origin/method/header permissions |

Readback confirmed the deployed package hash, Active/Successful function state, unchanged environment values including Google verification, and an unqualified API integration targeting the updated function. Private evidence: `guard-package.json`, `lambda-before-guard-deploy.json`, `guard-deployment-response.json`, and `guard-acceptance-results.json` in the private origin-setup directory. This verifies the origin boundary, not AWS CAPTCHA or successful email delivery.


## Rollback plan

1. Keep the last verified **guarded** handler, frontend copies, environment metadata, and code hashes privately. Preserve the matching CloudFront/Lambda origin secret in every rollback.
2. If Turnstile blocks legitimate submissions, stop the cutover and show the existing phone fallback while correcting configuration. Never skip verification or accept failed Siteverify responses.
3. Do not restore Google verification or add a bypass. The owner ruled out the billing-affected Google account. Restore only a known-good Turnstile release, or remain fail-closed with the phone contact available while correcting Turnstile.
4. Roll back frontend/backend/configuration together, account for cached assets, and rerun no-email validation, direct API rejection, and CORS checks. Any successful email test needs owner approval.
5. Record the reason, version/hash restored, and results. Do not create AWS WAF resources as an automatic rollback action.

## References

- [Cloudflare Turnstile overview](https://developers.cloudflare.com/turnstile/)
- [Free plan and limits](https://developers.cloudflare.com/turnstile/plans/)
- [Create/manage a widget](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/)
- [Widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
- [Server-side token validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Official test keys and testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [Turnstile CSP guidance](https://developers.cloudflare.com/turnstile/reference/content-security-policy/)
- [CloudFront flat-rate plan features/exclusions — separate future review](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html)

## Repository touchpoints

- Public sitekey configuration: [`public/assets/js/contact-form-config.js`](../public/assets/js/contact-form-config.js)
- Shared verifier (must be included in Lambda ZIP): [`lambda/contact-handler/turnstile.mjs`](../lambda/contact-handler/turnstile.mjs)
- Shared client: [`public/assets/js/contact-form.js`](../public/assets/js/contact-form.js)
- Homepage forms: [`public/index.html`](../public/index.html)
- Contact page: [`public/contact-us/index.html`](../public/contact-us/index.html)
- Lambda: [`lambda/contact-handler/index.mjs`](../lambda/contact-handler/index.mjs)
- Origin-guard tests: [`scripts/tests/contact-origin-guard.test.mjs`](../scripts/tests/contact-origin-guard.test.mjs)
- Infrastructure record: [`docs/INFRASTRUCTURE.md`](./INFRASTRUCTURE.md)
