# Cookies and browser-storage inventory

Reviewed October 28, 2026. Status: analytics-cookie use is established; a complete fresh-profile cookie/storage inventory remains open.

## Confirmed findings

**Current deployed behavior:** The owner chose to retain GA4 with opt-in controls. All 15 maintained pages now block Google analytics requests until acceptance, offer equally styled Accept/Reject buttons, and expose Cookie settings for withdrawal. Choices last 180 days in first-party localStorage; known GA cookies are expired on rejection. See the [preference implementation and verification](./COOKIE_PREFERENCES.md). The observations below predate this deployment unless explicitly noted.

The earlier October 27 live-browser observation recorded `_ga` and `_ga_SP8EDYP71R` cookie names on the homepage and contact page, without retaining values. The October 28 check before preference deployment confirmed GA4 was still active: the homepage loads `www.googletagmanager.com` and sends a `page_view` request to `www.google-analytics.com` before any form interaction. No on-site cookie-consent or preference control was visible at that time; controls have since been deployed.

| Cookie | Purpose | Evidence | Lifetime |
| --- | --- | --- | --- |
| `_ga` | GA4 visitor distinction using a client identifier | Name observed October 27; GA4 still active October 28 | Google documents a two-year default, subject to browser limits and configured overrides. Actual site expiration has not been measured. |
| `_ga_SP8EDYP71R` | GA4 session state for this site's measurement configuration | Name observed October 27; current tag uses `G-SP8EDYP71R` | Same documented default/override caveat; actual expiration is unverified. |

These are first-party analytics cookies even though analytics data is sent to Google. Their presence is not limited to visitors who submit an inquiry. Google documents the cookie names, purposes, default expiration, browser limits, and account-level overrides in its [GA4 cookie reference](https://support.google.com/analytics/answer/11397207). Default documentation is not a measurement of the site's actual cookie attributes or account configuration.

The October 28 font/analytics release removed Google Fonts requests and strips queries/fragments from GA4 page-view `page_location`; it did not disable GA4, remove its cookies, or introduce consent controls. Cookie expiration is also separate from GA4 event/user-data retention and the 90-day AWS log settings.

## Form interaction and Turnstile

Focusing the empty homepage Name field loaded `https://challenges.cloudflare.com/turnstile/v0/api.js`. Before focus the observed third-party hosts were Google tag/Analytics; afterward Cloudflare's challenge host was also observed. No challenge frame was rendered during this preload check. No fields were filled, no submit button was clicked, and no token verification or email-producing request was initiated.

This check does not establish whether a completed challenge sets additional cookies/storage. Do not list `cf_clearance` or other Cloudflare cookies as observed: no such observation was made. The earlier reCAPTCHA implementation is historical; do not describe `_GRECAPTCHA` as a currently verified maintained-site cookie.

## Inspection limits

- The current browser tool exposes page DOM and observed resource inventory, but its read-only evaluation did not expose `document.cookie`, localStorage, or sessionStorage. An unavailable API is not evidence that storage is empty.
- Chrome's internal site-storage settings URL was blocked by the browser security policy. No workaround was attempted. No cookie values, analytics client IDs, storage values, or raw analytics request URLs were retained.
- Existing browser site data was not cleared, and the browser was not a verified clean profile. That initial inspection preceded the preference interface. Subsequent live tests verified requests before/after acceptance and rejection, but did not gain access to cookie/storage metadata.
- Cookie domain/path, exact expiration, Secure/HttpOnly/SameSite attributes, partitioned/third-party storage, enhanced measurement, advertising integrations, and cross-browser behavior remain unverified. A successful analytics request alone does not prove that a fresh cookie was written in that particular browser visit.

## Remaining work

1. In an isolated browser profile, inspect cookie **names and metadata only** on home/contact/service/blog pages before interaction and after approved form/widget testing. Record storage key names, not their values. Do not clear the owner's normal browser data.
2. Review GA4 property/tag settings for cookie expiration, enhanced measurement, Google Signals, Ads links, data sharing, event/user-data retention, and deletion controls.
3. Owner decision and implementation are complete: retain GA4 with analytics off until accepted and allow rejection/withdrawal. The business/legal reviewer still needs to settle applicable visitor rights and any additional opt-out requirements. Do not infer universal legal requirements solely from the existence of analytics cookies.
4. Include verified analytics and security processing in the reviewed privacy notice. Recheck requests/cookies before and after any implemented preference controls.

See the [data inventory](./PRIVACY_DATA_INVENTORY.md) and [audit work register](./WEB_COMPLIANCE_AUDIT.md). No production configuration was changed by this inspection.
