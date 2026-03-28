# UI Review & Fix Plan — Red Remodels
Branch: `fix/seo-and-nav-issues`
Date: 2026-03-28

---

## What Was Reviewed

All pages screenshotted and inspected at 1440px desktop and 390px mobile:
- Homepage (`/`)
- Kitchen Remodels service page (`/services/kitchen-remodels`)
- Blog index (`/blog`)
- Blog post — Custom Home Build (`/blog/what-are-the-steps-to-build-a-custom-home`)
- Mobile viewport of homepage

---

## Issues Found (Priority Order)

### 🔴 CRITICAL — Functional Bugs

#### 1. Missing `/contact-us/` page → 404
Every nav "Contact Us" link across all pages points to `/contact-us`.
That path doesn't exist — the only contact page is buried at
`/pages/desktop/contact-us/index.html` (a leftover Duda builder path).

**Fix:** Create `public/contact-us/index.html` as a proper standalone page
matching the visual style of the service pages (announcement bar, nav, footer,
contact form, reCAPTCHA).

---

### 🟠 HIGH — SEO

#### 2. Duplicate canonical tags on all blog pages
`build-blog.js` extracts a `SHARED_HEAD` block from `index.html` that
inadvertently includes `<link rel="canonical" href="https://www.redremodels.com/" />`.
Every generated blog page ends up with two canonicals — the correct page URL
and the wrong homepage URL.

**Fix:** Already patched in `build-blog.js` (`.replace(/<link rel="canonical"...)`)
→ just needs `npm run build:blog` rebuild + commit.

#### 3. Missing `og:image:alt` on all service pages
All 8 service pages have `og:image`, `og:image:width`, `og:image:height`
but no `og:image:alt`. Homepage has it correctly.

**Fix:** Add `<meta property="og:image:alt" content="..." />` to all 8 service pages.

#### 4. Blog post template missing `og:image:width/height/alt`
The `build-blog.js` post template omits width, height, and alt on the OG image tag.

**Fix:** Add those three tags to the template in `build-blog.js`, rebuild.

#### 5. Kitchen Remodels missing `aria-current="page"` on nav link
All other 7 service pages correctly mark their own nav link with
`aria-current="page"`. Kitchen Remodels was the first page built and was missed.

**Fix:** Add `aria-current="page"` to the Kitchen Remodels nav link in
`/services/kitchen-remodels/index.html`.

---

### 🟡 MEDIUM — Design & Consistency

#### 6. Footer logo inconsistency
- Header: `red-remodels-logo.png` (new, correct)
- Footer (homepage): `284_Red_Remodels_LOGO_VR_04.png` (old)
- Footer (service pages): `284_Red_Remodels_LOGO_VR_04.png` (old)

Both logos are different versions. Should use the same file sitewide.

**Fix:** Update all footer `<img>` src references to `red-remodels-logo.png`.
Update `width`/`height` attributes to match the new logo dimensions.

#### 7. Blog index hero is visually weak
The blog index hero is a plain light-gray box with centered text — no image,
no texture, no brand color. Every other page has a rich dark hero with background
images. The blog hero feels disconnected from the rest of the site.

**Fix:** Give the blog hero a dark background with a subtle construction/home
texture image overlay (reuse an existing asset) and white text — consistent
with the service page hero style. Keep it simpler than a full-bleed hero
(no H1 change needed, just visual treatment).

---

### ✅ Already Fixed (pending commit)

- `build-blog.js`: canonical stripped from SHARED_HEAD
- `public/assets/css/services.css`: active nav indicator + video embed CSS
- Mobile/desktop pages: logo image path updated to `red-remodels-logo.png`

---

## Execution Order

1. Create `public/contact-us/index.html`
2. Fix `og:image:alt` on all 8 service pages
3. Fix `build-blog.js` OG image tags + rebuild blog (canonical + OG fixes together)
4. Add `aria-current` to kitchen-remodels
5. Fix footer logo on homepage + all service pages
6. Improve blog hero CSS in `blog.css`
7. Commit everything, push, deploy to S3 + CloudFront invalidation
