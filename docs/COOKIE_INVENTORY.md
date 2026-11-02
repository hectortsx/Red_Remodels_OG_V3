# Cookies and browser-storage inventory

Reviewed November 2, 2026 (clean-profile measurement; Secure 180-day GA cookies verified live after release). Earlier observations from October 27–28, 2026 are summarized under History.

## Summary

- **Before a visitor chooses, nothing is stored and nothing is sent to Google.** No cookies, no browser storage, and no third-party requests on the homepage, a service page, or the blog.
- **Rejecting** stores only the visitor's choice. Google is never contacted.
- **Accepting** sets two Google Analytics cookies. **Withdrawing** later (Cookie settings → Reject analytics) deletes them, reloads the page, and Google is not contacted again.
- **Contact forms** load Cloudflare Turnstile when a visitor clicks into a form, whatever their analytics choice. Turnstile sets no cookies; it keeps one item in Cloudflare's own (separate) browser storage. This is security processing, not analytics.
- Browsers sending the **Global Privacy Control** signal get the same opt-in behavior: nothing is stored or sent until the visitor accepts. The site does not currently read the signal itself (see Open questions).

## Inventory

| Name | Kind | Set by / where | When | Purpose | Lifetime | Attributes |
| --- | --- | --- | --- | --- | --- | --- |
| `redremodels.cookie-preferences.v1` | localStorage | This site (`www.redremodels.com`) | After Accept or Reject | Remembers the visitor's choice: version, accepted/rejected, time saved. No identifier. | Ignored and re-asked after 180 days | First-party storage, not sent to servers |
| `_ga` | Cookie | Google Analytics script, on `.redremodels.com` | Only after Accept | GA4 visitor distinction (client identifier) | 180 days (set by the site; matches the consent period) | Secure, SameSite=Lax, readable by scripts |
| `_ga_SP8EDYP71R` | Cookie | Google Analytics script, on `.redremodels.com` | Only after Accept | GA4 session state for this site's measurement ID | 180 days | Secure, SameSite=Lax, readable by scripts |
| `cf.turnstile.u` | localStorage | Cloudflare, in the `challenges.cloudflare.com` frame (stored separately from this site's storage) | When a form is submitted and Turnstile runs | Cloudflare Turnstile anti-abuse/bot check | Set by Cloudflare | Third-party storage; not readable by this site |

No sessionStorage keys, and no other cookies (including Cloudflare `cf_clearance`/`__cf_bm`), were observed in any scenario.

## Method and results (November 2, 2026)

Each scenario ran in a new, empty browser profile against the live site with the enforced Content Security Policy. Cookie **names and attributes only** were recorded; no values, client IDs, or storage contents were kept. Google Analytics collection requests and `/api/contact` were blocked in the test browser, so no analytics data or form submission reached Google or the business.

| Scenario | Cookies | Storage keys | Third-party hosts |
| --- | --- | --- | --- |
| A. No choice; browse home, kitchen service page, blog (scrolling) | none | none | none |
| B. No choice; click into the contact form | none | none | `challenges.cloudflare.com` |
| B2. Reject, then submit a contact form (Turnstile runs) | none | site: preference; Cloudflare: `cf.turnstile.u` | `challenges.cloudflare.com` |
| C. Reject; browse two more pages | none | preference | none |
| D. Accept; browse another page | `_ga`, `_ga_SP8EDYP71R` | preference | `www.googletagmanager.com`, `www.google-analytics.com`, `www.google.com` (GA4 `/g/collect`) |
| E. After D: Cookie settings → Reject; browse | none (both deleted) | preference | no further Google requests; tag not loaded |
| F. Global Privacy Control on; no choice | none | none | none |

Before November 2 the GA cookies were measured at 400 days (the browser cap on GA's two-year default) and without the Secure flag. The site now sets `cookie_flags: 'SameSite=Lax;Secure'` and `cookie_expires` equal to the 180-day consent period; this was verified in a browser on the release candidate.

## Open questions (owner / counsel)

1. **Global Privacy Control.** Analytics is opt-in, so GPC users are not tracked unless they click Accept. Counsel should confirm whether anything more is required (for example, hiding the Accept option or treating GPC as a standing rejection) under the Colorado Privacy Act or other applicable law.
2. **GA4 property settings** (in the Google Analytics account, not visible from the site): data retention period, data sharing settings, Google Signals and Ads links, enhanced measurement, and user-deletion process.
3. **Privacy notice** must describe the analytics cookies, the preference record, and Turnstile security processing.

## History

- October 27: `_ga` and `_ga_SP8EDYP71R` names observed on the homepage and contact page while GA4 loaded unconditionally; reCAPTCHA (since removed) was also present.
- October 28: preference controls deployed; requests verified blocked before acceptance, but the browser tool then could not read cookie metadata.
- November 2: clean-profile measurement above; GA cookie flags and expiry tightened.

See the [preference implementation](./COOKIE_PREFERENCES.md), [data inventory](./PRIVACY_DATA_INVENTORY.md), and [audit work register](./WEB_COMPLIANCE_AUDIT.md).
