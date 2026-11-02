# Cloudflare Turnstile — owner handoff

**Decision:** On October 28, 2026, the owner selected Turnstile Free instead of AWS WAF CAPTCHA. The existing filename is retained for links. Follow the [updated Turnstile runbook](./AWS_WAF_CAPTCHA_IMPLEMENTATION.md); the old WAF creation and AWS CAPTCHA integration steps are superseded.

**Deployed:** Turnstile now protects the maintained contact forms. The origin guard remains in place. The owner supplied the real sitekey, configured the private secret/hostnames, confirmed the widget check succeeded, and explicitly approved Siteverify transmission to Cloudflare. The complete Lambda package, 13 frontend objects, and legacy redirects are deployed and verified. No WAF resources were created; Google is not a fallback.

## Lower homepage form follow-up — accepted October 28, 2026

The owner later reported that the lower homepage form failed before showing a widget and its error text was unreadable. The shared client now waits for the SDK's named readiness callback, preloads on form focus, keeps failed widgets visible, and isolates per-form retries. Opaque high-contrast error/pending panels are deployed. Version `turnstile-20261028-3` is live; all four modified live files match the tested release, 59 isolated tests pass, and both homepage forms completed in a real-SDK localhost preview using an official dummy key/mock contact endpoint. No extra production email was sent.

**Owner acceptance:** After the requested hard refresh, the owner confirmed **“The lower form now succeeds.”** The lower-form follow-up is complete. Earlier contact-page/homepage business email receipts remain recorded separately; receipt of another lower-form email was not separately asserted. No further test submissions are needed. Continue routine monitoring and keep the existing fail-closed verification and origin protection.

## Earlier acceptance and cleanup — October 28, 2026

The owner reports successful submissions from the contact page and homepage and confirms both business notification emails arrived. Those confirmations covered the contact page and a homepage submission; the lower-form follow-up above now also has owner-confirmed form success. The coding agent did not send an additional successful/email-producing request. Confirmation-email receipt was not separately confirmed.

The owner also reported an unreadable homepage success message. That fix is deployed: dark-green text on an opaque pale-green success panel, with an 8.65:1 text-to-panel contrast ratio verified in static browser previews of all three forms. The phone/email fallback is also readable on the red homepage section. Both live pages load the new stylesheet version `turnstile-20261028-2`, and the live CSS hash matches source.

Cleanup is complete: unused Google CAPTCHA environment variables and the temporary widget-check S3 object were removed after the email confirmations. Readback confirms the Turnstile secret/hostnames, origin secret, mail settings, and Lambda package hash are preserved; Lambda is Active/Successful and all related cache invalidations are Completed. Empty requests still return CloudFront validation 400 and direct API rejection 403. The available immediate Lambda Errors metrics report a sum of zero in the checked window.

The CAPTCHA migration is functionally complete. Continue routine monitoring; broader privacy/accessibility work and the separate optional CloudFront Free-plan review remain outside this completed migration. Keep private release/cleanup evidence under `.local/waf-baselines/turnstile-env-3yl6kbhf/` out of commits and chat.

## Private secret setup reference — completed

The public sitekey is already configured in `public/assets/js/contact-form-config.js`. Both owner-approved hostnames will be configured in Lambda's verification allowlist.

From the project root in your own terminal, run:

```bash
python3 scripts/configure-turnstile.py
```

The command checks AWS account `365608889294` with profile `red-remodels-deployer`, then asks for the **private Turnstile secret key** at a hidden prompt. Paste it there and press Enter. Nothing appears while you type/paste; this is intentional. Do not paste the key into chat or as a command argument.

This adds `TURNSTILE_SECRET_KEY` and `TURNSTILE_ALLOWED_HOSTNAMES=www.redremodels.com,redremodels.com` to `red-remodels-contact-handler` in `us-east-1`, preserving every existing environment variable and the deployed code. It checks the current revision, saves private backups under `.local/waf-baselines/turnstile-env-*/`, waits for the Lambda update, and verifies the result without printing secrets. It does not send email or deploy Turnstile code. Share only the final **VERIFIED** result; keep backups private.

After this, the next checkpoint is real widget/browser testing and coordinated deployment. No successful production email test has been approved yet.

## Widget setup reference — owner completed setup and supplied the sitekey

1. Sign in to or create a [Cloudflare account](https://dash.cloudflare.com/). You can use Turnstile without moving the domain, DNS, or AWS hosting.
2. Open **Turnstile** and choose **Add widget** (the console may label this Add site).
3. Name it **Red Remodels Contact** and choose **Managed** widget mode on the Free plan.
4. The owner added **`www.redremodels.com`** and **`redremodels.com`**. Add a staging hostname only after we choose one. Do not use wildcard/any-hostname access for this production widget.
5. Leave **pre-clearance disabled**. Lambda will validate submitted tokens directly; Cloudflare CDN clearance cookies are not needed.
6. Save the widget. Cloudflare provides a **sitekey** and a **secret key**.
7. Share only the **public sitekey** and approved hostnames with the coding agent. Save the **secret key** in a password manager; do not put it in chat, screenshots, source, or command-line history.
8. When configuring Lambda, add the secret as **`TURNSTILE_SECRET_KEY`** to `red-remodels-contact-handler` in `us-east-1`, preserving every existing variable, including `CLOUDFRONT_ORIGIN_SECRET` and current mail settings. The coding agent can help with a secure local prompt in the terminal. Also configure `TURNSTILE_ALLOWED_HOSTNAMES=www.redremodels.com,redremodels.com` (plus only approved test hostnames, comma-separated). Keep the current deployed environment intact until the coordinated release; adding these values alone does not enable the new code.

See [Cloudflare's widget setup](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/) and [Free plan](https://developers.cloudflare.com/turnstile/plans/).

## Implementation and remaining QA

The frontend/server implementation is deployed; the [ordered checklist](./AWS_WAF_CAPTCHA_IMPLEMENTATION.md#ordered-turnstile-implementation-tasks) records the completed email acceptance/cleanup and remaining broader accessibility/privacy QA and routine monitoring. The Lambda ZIP includes `index.mjs`, `turnstile.mjs`, and `package.json`. Google verification has been removed from deployed maintained pages/server code, and its obsolete Lambda variables have been removed. Remain fail-closed with the phone fallback if verification cannot complete.

## Cost and infrastructure boundary

Turnstile Free includes unlimited challenges/verification requests under the published plan. It does not cap AWS charges or prevent requests from reaching API Gateway/Lambda. No pay-as-you-go WAF creation, $10 budget-alert creation, CloudFront pricing-plan switch, or DNS migration is included in this change. CloudFront Free WAF compatibility is a separate future review.

## Existing private evidence and status

Private rollback settings, origin secret, live page copies, guarded package, deployment response, and acceptance results are under `.local/waf-baselines/origin-setup/`; the initial AWS baseline and original Lambda backup are in the timestamped baseline folder. Never commit or paste these files.

To check configuration without printing secrets:

```bash
python3 scripts/configure-contact-origin.py status
```

The current deployment should report `lambdaCodeMatchesTurnstilePackage: true`. `lambdaCodeMatchesGuardPackage: false` and `lambdaCodeMatchesPreGuardBackup: false` are expected after the Turnstile deployment; they compare with earlier packages. Restore only a package that preserves the origin guard.
