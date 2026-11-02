# Screen-reader test guide (VoiceOver)

**Who this is for:** whoever does the hands-on screen-reader test of www.redremodels.com. No technical background needed.
**Time needed:** about 45 minutes on a Mac and 30 minutes on an iPhone.
**Why:** automated checks already pass on every page, but only a person can confirm the site makes sense when it is heard rather than seen.

Write down anything that is confusing, silent, read twice, or impossible to reach, in the results table at the end. You do not need to fix anything.

## Before you start

- **Mac:** use Safari. Turn VoiceOver on and off with **Command + F5**. The VoiceOver keys ("VO") are **Control + Option**, held together.
- **iPhone:** use Safari. Go to Settings → Accessibility → Accessibility Shortcut and choose VoiceOver. Then **triple-click the side button** to turn VoiceOver on or off. Swipe right or left to move, and double-tap to activate.
- Use a private window, so the cookie banner appears as it does for a first-time visitor.
- **Do not submit the contact forms** unless the team knows a test message is coming. Each submission emails the business. Step 4 says how to test the form without sending anything.

## Useful VoiceOver commands

| What | Mac | iPhone |
| --- | --- | --- |
| Read the next item | VO + Right Arrow | Swipe right |
| Jump through links, buttons or form fields | Tab | Rotor → Links, Form Controls |
| List all headings, links or page areas | VO + U, then Left/Right Arrow to switch lists | Turn two fingers like a dial (the "rotor"), then swipe down |
| Next heading | VO + Command + H | Rotor → Headings, swipe down |
| Click | VO + Space (or Enter on a link) | Double-tap |
| Stop speaking | Control | Two-finger tap |

## What to test

Check each step on the **Mac**, then repeat steps 1–4 on the **iPhone**.

### 1. Homepage — https://www.redremodels.com/

| Do this | You should hear |
| --- | --- |
| Load the page | The page title, starting "Red Remodels". |
| Press Tab once | "Skip to main content, link". Press Enter, and the next thing read should be from the main content, not the menu. |
| Open the cookie banner (it appears at the bottom on first visit; VO + U → Landmarks → "Your cookie choices") | The heading "Your cookie choices", two paragraphs, and the buttons "Reject analytics" and "Accept analytics". |
| Choose **Reject analytics** | The banner closes, and a "Cookie settings" button remains. |
| VO + U → Headings | One level-1 heading, "Revamp Your Space with Red Remodels", then the section headings in a sensible order. |
| VO + U → Links, then find the services | Short names such as "Kitchen Remodels" and "Bathroom Remodeling", each followed by a one-sentence description. |
| VO + U → Landmarks | Announcement, banner, Primary navigation, main, content information (footer), and Follow us. |

### 2. Menu (on the iPhone, or with a narrow Mac window)

| Do this | You should hear |
| --- | --- |
| Move to the menu button | "Open navigation menu, button, collapsed". |
| Activate it | "Close navigation menu, expanded". The menu links can now be reached. |
| Move to "Our Services" and activate it | The service links appear, and "expanded" is read. |
| Press Escape (Mac) | The menu closes, and focus returns to the menu button. |
| On a service page, open the menu | That page's own link is announced as the **current page**. |

### 3. A service page — https://www.redremodels.com/services/kitchen-remodels/

| Do this | You should hear |
| --- | --- |
| VO + U → Headings | One level-1 heading, "Denver Kitchen Remodels That Fit Your Life", then section headings with no jumps (for example, not level 2 straight to level 4). |
| Read the "Home › Our Services" line near the top | Two separate links, "Home" and "Our Services". |
| Read the cost section | Each price range is read together with its label, for example "Minor refresh — paint, hardware, fixtures $5,000 – $15,000". |

### 4. Contact page — https://www.redremodels.com/contact-us/ (do not send)

| Do this | You should hear |
| --- | --- |
| Tab through the form | Each field's label ("Name", "Email", "Phone"…), that it is **required** where marked, and the hint text. |
| Leave every field empty and activate **Send Message** | A message that a required field must be filled in. Focus moves to the first empty field. Nothing is sent. |
| Type `test` into Email and activate Send Message | A message that the email address is not valid. Nothing is sent. |
| Read the line under the form | "If this form does not work, call (720) 519-2606 or email hello@redremodels.com", with both as links. |
| Read the contact details beside the form | Phone, Email, Hours and Service Area, each with its value; the phone and email are links. |
| Use Tab to move through the form | You should never land on an unlabeled or "Leave this field empty" field (that is a hidden anti-spam field and must stay unreachable). |

*Optional, only if the team agrees:* fill in the form with your own details and the message "Screen-reader test, please ignore", then send it. You should hear "Sending your request…" and then a success message, without moving focus yourself.

### 5. Blog — https://www.redremodels.com/blog/ and one post

| Do this | You should hear |
| --- | --- |
| On the blog page, VO + U → Links | Each post as one link named by its title. |
| Open "Bathroom Remodel Cost in Denver" | The breadcrumb links, then "Tags, list, 4 items", then the title as a level-1 heading. |
| VO + U → Headings | One level-1 heading, then level-2 and level-3 sections in order. |
| Read a cost table | Row and column headers are read with each value. |
| At the end of the article | "Ready to transform your home?" and a "Get a Free Quote" link. |

## Known, deliberate choices (no need to report these)

- Short section labels such as "#remodels" and "#getintouch" are read aloud ("number sign remodels"). This is a style choice the owner may revisit.
- The homepage has two "Contact Us" links. The one in the large banner scrolls to the form on the same page, and the one in the menu opens the contact page.

## Results

Fill in one row per problem. "Where" can be a page and the step number from above.

| Date | Device and browser | Where | What happened | What you expected |
| --- | --- | --- | --- | --- |
| | | | | |

When you are done, send this table to the site owner. Problems will be fixed and recorded in [WEB_COMPLIANCE_AUDIT.md](./WEB_COMPLIANCE_AUDIT.md).
