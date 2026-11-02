# Privacy Policy — draft for owner and counsel review

**Status:** Draft, November 2, 2026. Not legal advice and not approved. Do not publish until counsel signs off.

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

We use this information only to respond to your inquiry and to discuss and provide the remodeling services you ask about. [OWNER: confirm you do not add form contacts to a mailing list, CRM, or marketing campaigns. If you do, say so here.]

The form also records which form you used and when you sent it, so we can route your message.

### Information collected automatically

**Website requests.** Like most websites, our hosting provider (Amazon Web Services) receives technical information when you visit, such as your IP address, browser type, the page requested and the time. We keep these server logs for up to 90 days for security and troubleshooting.

**Spam protection.** Our contact forms use Cloudflare Turnstile to check that a real person is sending the message. When you click into a form, Cloudflare receives information about your browser and connection, such as your IP address and browser details. Cloudflare does not set cookies for this check. See [Cloudflare's Turnstile privacy addendum](https://www.cloudflare.com/turnstile-privacy-policy/).

**Analytics (only if you agree).** We use Google Analytics to understand how visitors use the site. It runs only after you click **Accept** in the cookie notice. If you accept, Google Analytics sets two cookies (`_ga` and `_ga_SP8EDYP71R`) that last up to 180 days and collects information such as pages viewed, approximate location, device and browser. We do not send your contact-form details to Google. If you click **Reject**, or never choose, Google Analytics does not load and no analytics cookies are set. You can change your choice at any time with the **Cookie settings** button in the bottom-left corner of every page; choosing Reject deletes the analytics cookies.

**Your cookie choice.** We store your Accept or Reject choice in your browser for 180 days so we don't ask again on every page. It contains no information that identifies you.

[COUNSEL: decide whether the site must also treat a browser's Global Privacy Control signal as a rejection. Today analytics is off unless the visitor clicks Accept, so a GPC user is not tracked unless they opt in.]

### How we share information

We do not sell your personal information, and we do not share it for targeted advertising. [OWNER: confirm Google Analytics is not linked to Google Ads and Google Signals is off; if not, counsel must revise this sentence.]

We share information only with service providers who help us run the website and respond to you:

- **Amazon Web Services** — website hosting, form processing and email delivery.
- **Cloudflare** — spam protection on our forms.
- **Google** — website analytics, only if you accept.
- **Our website service provider** — receives a copy of form messages to keep the contact form working. [OWNER: confirm this is the purpose of the `hector@savio.design` copy and that it should continue.]
- **Our email provider** — stores the messages we receive. [OWNER: name the provider for `hello@redremodels.com`, e.g. Google Workspace or Microsoft 365.]

We may also disclose information if required by law or to protect our rights, or as part of a sale or reorganization of the business. [COUNSEL: confirm this standard wording.]

### How long we keep information

- **Contact form messages:** [OWNER and COUNSEL: set a period, e.g. "for as long as needed to respond and, if you become a customer, for the duration of your project plus N years for warranty and tax records". Do not publish a period until the mailboxes can actually follow it.]
- **Server and error logs:** up to 90 days.
- **Analytics data:** [OWNER: the data-retention setting in the Google Analytics account — 2 or 14 months.]
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

## Owner questions (short list)

1. Who can read `hello@redremodels.com`, and which company hosts it?
2. Should `hector@savio.design` keep getting a copy of every form message?
3. Do form contacts ever go into a mailing list, CRM or ad audience?
4. How long do you want to keep inquiry emails from people who do not become customers? And for customers?
5. In Google Analytics (Admin → Data collection and retention): what is the retention setting, and are Google Signals and any Google Ads links on or off?
6. Does the phone number need to be required on the forms, and is the project-type question useful?
7. Who will answer privacy requests sent to `hello@redremodels.com`?

## Counsel questions (short list)

1. Do the Colorado Privacy Act or other state privacy laws apply to this business?
2. Must the policy show a mailing address and the legal name "Red Remodels LLC" on the site?
3. Is anything more needed for Global Privacy Control, given analytics is already opt-in?
4. Approve the sharing, retention and rights wording above.

## After approval (engineering)

- Build `public/privacy-policy/index.html` from the approved text, with the site's standard title, description, canonical link and share tags.
- Add a "Privacy Policy" link to every footer and a short "See our Privacy Policy" note next to each form's submit button.
- Add the Privacy Policy link check to `npm run check:release`.
- Add the page to `public/sitemap.xml`.
