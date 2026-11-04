# Privacy Policy — draft for owner and counsel review

**Status:** Superseded November 3, 2026. The owner has no counsel for this and approved the final wording themselves; the authoritative text is now the page at [public/privacy-policy/index.html](../public/privacy-policy/index.html). The placeholders below are kept as history only — see the November 3 notes in [WEB_COMPLIANCE_AUDIT.md](./WEB_COMPLIANCE_AUDIT.md) for how each was resolved. Not legal advice.

**Original status:** Draft, November 2, 2026. Not legal advice and not approved. Do not publish until counsel signs off.

**How to read this draft**
- Text in plain paragraphs is proposed wording for the public page at `https://www.redremodels.com/privacy-policy/`.
- `[OWNER: …]` marks a fact only the business can supply.
- `[COUNSEL: …]` marks a legal decision or wording counsel should set.
- Every factual statement about the website was checked against the site as it runs today; the evidence is in [PRIVACY_DATA_INVENTORY.md](./PRIVACY_DATA_INVENTORY.md) and [COOKIE_INVENTORY.md](./COOKIE_INVENTORY.md). If the site changes, this text must change with it.

---

## Privacy Policy

_Last updated: [COUNSEL: date of approval]_

Red Remodels LLC ("Red Remodels", "we", "us") runs www.redremodels.com. This policy explains what information we collect through this website, why, who we share it with, and the choices you have.

[COUNSEL: confirm whether a business mailing address must appear here. The owner has withheld a public address pending your advice.]

### Information you give us

When you use a contact form on this site, we collect:

- your name, email address and phone number;
- your message; and
- optionally, the type of project you are interested in.

We use this information only to respond to your inquiry and to discuss and provide the remodeling services you ask about. We do not add it to mailing lists or marketing campaigns.

The form also records which form you used and when you sent it, so we can route your message.

### Information collected automatically

**Website requests.** Like most websites, our hosting provider (Amazon Web Services) receives technical information when you visit, such as your IP address, browser type, the page requested and the time. We keep these server logs for up to 90 days for security and troubleshooting.

**Spam protection.** Our contact forms use Cloudflare Turnstile to check that a real person is sending the message. When you click into a form, Cloudflare receives information about your browser and connection, such as your IP address and browser details. Cloudflare does not set cookies for this check. See [Cloudflare's Turnstile privacy addendum](https://www.cloudflare.com/turnstile-privacy-policy/).

**Analytics (only if you agree).** We use Google Analytics to understand how visitors use the site. It runs only after you click **Accept** in the cookie notice. If you accept, Google Analytics sets two cookies (`_ga` and `_ga_SP8EDYP71R`) that last up to 180 days and collects information such as pages viewed, approximate location, device and browser. We do not send your contact-form details to Google. If you click **Reject**, or never choose, Google Analytics does not load and no analytics cookies are set. You can change your choice at any time with the **Cookie settings** button in the bottom-left corner of every page; choosing Reject deletes the analytics cookies.

**Your cookie choice.** We store your Accept or Reject choice in your browser for 180 days so we don't ask again on every page. It contains no information that identifies you.

[COUNSEL: decide whether the site must also treat a browser's Global Privacy Control signal as a rejection. Today analytics is off unless the visitor clicks Accept, so a GPC user is not tracked unless they opt in.]

### How we share information

We do not sell your personal information, and we do not share it for targeted advertising.

We share information only with service providers who help us run the website and respond to you:

- **Amazon Web Services** — website hosting, form processing and email delivery.
- **Cloudflare** — spam protection on our forms.
- **Google** — website analytics, only if you accept.
- **Our website designer** — receives a copy of form messages only to check that the contact form is working.
- **Google (Google Workspace)** — our business email provider, which stores the messages we receive.

We may also disclose information if required by law or to protect our rights, or as part of a sale or reorganization of the business. [COUNSEL: confirm this standard wording.]

### How long we keep information

- **Contact form messages:** [OWNER and COUNSEL: no retention structure exists yet. Suggested starting point for counsel to confirm: inquiries from people who do not hire us are deleted after 2 years; customer correspondence is kept for the project plus the warranty period plus the tax-record period counsel or the accountant advises. Do not publish until the business can actually follow it in Google Workspace and in the designer's copy.]
- **Server and error logs:** up to 90 days.
- **Analytics data (only if you accepted):** Google Analytics keeps detailed visit records for 2 months and information linked to your browser's analytics cookie for up to 14 months after your last visit. After that, only totals that do not identify you remain.
- **Your cookie choice:** 180 days in your browser.

### Your choices and rights

You can ask us to tell you what information we hold about you, correct it, or delete it by emailing **hello@redremodels.com**. We will verify your request and respond within [COUNSEL: deadline, e.g. 45 days].

[COUNSEL: decide whether the Colorado Privacy Act or another state law applies. Under the current statute it generally applies to businesses that handle data of 100,000+ Colorado consumers a year, or 25,000+ and earn revenue from selling data. If a law applies, add the required rights (access, correction, deletion, portability, opt-out), the appeal process and the response deadlines here.]

You can opt out of analytics at any time with the **Cookie settings** button in the bottom-left corner of any page.

### Children

This website is not directed to children under 13, and we do not knowingly collect their information.

### Security

We use reasonable safeguards, including encrypted connections (HTTPS), spam protection and restricted access to our systems. No website can be completely secure.

### Changes to this policy

We will post any changes on this page and update the "Last updated" date.

### Contact us

Questions or requests: **hello@redremodels.com** or **(720) 519-2606**.

---

## Owner answers (November 2, 2026)

1. **Email host:** Google Workspace (`hello@redremodels.com`).
2. **`hector@savio.design` copy:** the website designer; receives form messages only to verify the form works. Kept for now. Consider stopping the copy once monitoring alerts are trusted, and have the designer delete old copies on the same schedule as the business mailbox.
3. **Marketing use:** form contacts are not added to a CRM, mailing list or ad audience.
4. **Retention:** no structure yet. Suggested starting point is in the policy text above for counsel to confirm.
5. **Google Analytics** (screenshots of Admin → Data collection): Google Signals off; user-provided data collection off; granular location and device data on; ads personalization was allowed in 307 of 307 regions and the owner turned it off for all regions on November 2, 2026; the User Data Collection Acknowledgement has not been clicked. Data retention (screenshot): event data 2 months; user data 14 months; reset on new user activity on. Product links: no Google Ads links (screenshot).
6. **Phone number:** stays required. Project type: unchanged (optional).
7. **Privacy requests:** Juan Rojas, owner of Red Remodels, answers requests sent to `hello@redremodels.com`.

**Still open for the owner**
- Click "I acknowledge" on the User Data Collection Acknowledgement only after the Privacy Policy is published, since it confirms the site has the required disclosures.

## Counsel questions (short list)

1. Do the Colorado Privacy Act or other state privacy laws apply to this business?
2. Must the policy show a mailing address and the legal name "Red Remodels LLC" on the site?
3. Is anything more needed for Global Privacy Control, given analytics is already opt-in?
4. Approve the sharing, retention and rights wording above.

## After approval (engineering)

The page, links and checks are already built on branch `feature/privacy-policy-page` (`public/privacy-policy/index.html`). Remaining steps:

- Replace every `[COUNSEL: …]` note in `public/privacy-policy/index.html` with the approved wording (the release check fails until none remain).
- Apply any wording changes to this file too, so the two stay the same.
- Run `npm run check:release`, merge, and upload with the usual deploy steps. Invalidate `/privacy-policy`, `/sitemap.xml`, `/pages/desktop/home/style.css`, `/assets/css/contact-verification.css` and every page whose footer changed.
- After upload, click "I acknowledge" in Google Analytics (Admin → Data collection → User Data Collection Acknowledgement).
