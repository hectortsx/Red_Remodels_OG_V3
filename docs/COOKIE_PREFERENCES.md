# Analytics preferences

Owner decision, October 28, 2026: retain GA4 and provide Accept/Reject controls, with analytics off until acceptance. Turnstile remains active independently of that choice. This implements the chosen product behavior; the wider privacy notice and legal-applicability review remain open.

**Deployment:** Live and verified across all 15 maintained pages. All 17 HTML/asset hashes match the release and targeted cache invalidation is Completed. Live browser tests observed zero Google requests before choice, after rejection/navigation, and after withdrawal in both tabs. Acceptance and saved acceptance loaded Google; the accepted contact page view omitted its test query and fragment. Turnstile preload still worked while analytics was rejected.

## Behavior

- All 15 maintained page templates and the blog generator load the same local controller and stylesheet. No page includes an unconditional Google tag or inline GA4 configuration.
- With no valid saved acceptance, the controller does not load Google code or send consent-denied/cookieless analytics pings. The banner has equally styled **Reject analytics** and **Accept analytics** buttons. Closing or ignoring it does not grant consent.
- Acceptance loads the Google tag once for `G-SP8EDYP71R`. Only analytics storage is granted; advertising storage, advertising user data, personalization, and Google Signals remain disabled in the client configuration. Page location and referrer are limited to URL origin/path, excluding queries and fragments. This does not prove every account-side/enhanced event excludes personal data; property settings remain to be reviewed.
- A persistent **Cookie settings** button reopens the controls. The panel states whether analytics is currently on or off. Reopened preferences support Escape/Close and return keyboard focus to the settings button. The panel is nonmodal and does not trap focus; mobile positioning keeps it above the site navigation bar.
- Rejecting analytics sets Google's measurement disable flag and expires the known `_ga` and `_ga_SP8EDYP71R` cookies at the root path for the host and parent domain. It does not clear Turnstile or unrelated storage. Custom cookie paths, inaccessible cookies, and provider-side historical records are outside this cleanup.
- Withdrawing a saved acceptance disables collection, removes the tag element, and reloads the document to unload the running library. Other tabs using this controller recheck on storage changes, restored page sessions, and visibility changes. Expiry also rechecks an open page. Tabs loaded before this deployment need a refresh/navigation to run the new controller.
- Browser storage failures default to analytics off on a new page. An explicit choice can apply to the current page, with a visible message if it cannot be remembered. If a browser allows reading an older choice but blocks saving a new one, that older stored choice may still affect a subsequent page; the warning reports that the change could not be saved. No successful persistence is claimed in that case.

## Preference storage

The first-party localStorage key `redremodels.cookie-preferences.v1` contains only `{version, choice, savedAt}`. It contains no contact fields, token, client ID, or unique visitor identifier and is not sent to the application server or Google. Its purpose is remembering the visitor's explicit choice across pages in that browser/origin.

The implementation treats both acceptance and rejection as valid for **180 days**, measured from the last explicit choice, then prompts again and blocks analytics until a new acceptance. Malformed, unsupported-version, future-dated, and expired records cannot grant consent. This is an engineering lifetime for the preference record, not a business inquiry-retention policy, a statement about GA4 cookie expiration, or proof of physical browser-storage deletion. Expired records may remain locally until overwritten or browser data is cleared, but no longer authorize collection.

No privacy policy link is added to the banner until an accurate reviewed public notice exists. The banner itself explains analytics, security processing, choice duration, and how to reopen preferences. It does not replace the remaining privacy-notice task.

## Verification and release

Run `npm run test:privacy` for 12 isolated checks covering default denial, acceptance, persisted rejection/acceptance, withdrawal, malformed/future/expired records, blocked storage, cross-tab revocation/clearing, live expiry, restored-page handling, focus/closing, and all 15 templates plus blog generation. `npm run test:contact` covers the 59 existing isolated contact-flow checks; no email is sent by either suite.

Before deployment, a localhost browser preview observed no Google requests before acceptance or after rejection/reload, one GA4 page view after explicit acceptance, and no Google requests after withdrawal/reload. The mobile controls were checked at 390 × 844 with visible accept/reject targets over 44 pixels high. This is not a full accessibility audit or clean-profile cookie/storage enumeration.

Private deployment materials: `.local/waf-baselines/cookie-preferences-release-t3xmz0ya/`. They contain fresh pre-change S3 HTML/metadata, consent-only patched HTML, the two local assets, conditional write requests, receipts, and verification results. No Lambda code, form markup, credentials, mail settings, or other pending page changes are part of the release. Do not deploy the whole dirty working tree to reproduce this scoped change.

Rollback should retain consent gating: restore the previous reviewed controller version with a new asset version, or keep analytics disabled while fixing the controller. Restoring the old unconditional Google snippets would undo the owner's opt-in decision. Preserve private backups for review; no rollback is automatic.

Google documents [basic consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic), the [analytics disable flag](https://developers.google.com/tag-platform/security/guides/privacy), and [GA4 configuration fields](https://developers.google.com/analytics/devguides/collection/ga4/reference/config). See the [cookie inventory](./COOKIE_INVENTORY.md), [data inventory](./PRIVACY_DATA_INVENTORY.md), and [audit checklist](./WEB_COMPLIANCE_AUDIT.md) for unresolved account/privacy work.
