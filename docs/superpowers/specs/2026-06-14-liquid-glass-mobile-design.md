# Mobile "Liquid Glass" Design — Spec

Date: 2026-06-14

## Goal

Bring Apple's "Liquid Glass" visual language (introduced in iOS 26 and adopted by
Instagram's mobile app in 2025) to the Red Remodels site **on phone-size screens
only** (≤ 780px, matching the existing mobile breakpoint). Key visual traits being
adapted:

- Translucent, frosted surfaces (`backdrop-filter: blur()` + `saturate()`)
- Pill/capsule shapes that float above content with soft shadows and a subtle
  inner highlight (specular edge)
- Floating panels that feel detached from the page rather than flush with it

This is a pure CSS/markup enhancement — no build tooling changes, no new
dependencies. `@supports` fallback ensures browsers without `backdrop-filter`
get the current solid-color look (no visual regression).

## Scope

Applied **sitewide**, on mobile (`max-width: 780px`) only:

- Homepage (`public/index.html`)
- All 8 service pages (`public/services/<slug>/index.html`)
- Contact page (`public/contact-us/index.html`)
- Blog index + blog posts (generated via `scripts/build-blog.js` — the header
  template extracted from `index.html` plus a new CTA bar snippet added to both
  page templates in the build script)

Desktop/tablet styling is untouched.

## Visual Design

### 1. Sticky header (`.main-header`)

On mobile, the header becomes a frosted glass bar:

- `backdrop-filter: blur(18px) saturate(160%)` (+ `-webkit-` prefix)
- `background: rgba(255, 255, 255, 0.55)`
- `border-bottom: 1px solid rgba(255, 255, 255, 0.6)`
- `box-shadow: 0 8px 32px rgba(6, 23, 44, 0.12)`
- Text/icons stay navy (`--color-navy`) — unchanged contrast

### 2. Mobile nav menu (`.site-nav.is-open`)

Currently a full-width white panel flush under the header. Becomes a **floating,
detached glass card**:

- Positioned with margin from the viewport edges (`left/right: 12px`, offset
  below the header) instead of full-bleed
- `border-radius: 20px`
- `backdrop-filter: blur(20px) saturate(180%)`
- `background: rgba(255, 255, 255, 0.45)`
- `border: 1px solid rgba(255, 255, 255, 0.7)`
- `box-shadow: 0 12px 40px rgba(6, 23, 44, 0.25), inset 0 1px 0 rgba(255,255,255,0.8)`
- Nav links keep existing typography; remove the full-width divider borders
  between items (they look wrong floating on glass) in favor of subtle
  rounded hover/active backgrounds

### 3. New: Floating bottom CTA bar

A new element, not present today. Fixed to the bottom of the viewport on every
mobile page:

- Red-tinted glass pill: `background: rgba(192, 57, 43, 0.75)`,
  `backdrop-filter: blur(18px) saturate(180%)`
- `border-radius: 999px`, `border: 1px solid rgba(255,255,255,0.4)`
- `box-shadow: 0 10px 30px rgba(6,23,44,0.3), inset 0 1px 0 rgba(255,255,255,0.5)`
- Two segments, white text/icons, separated by a thin vertical divider:
  - **Call** — `tel:+17205192606`
  - **Get a Quote** — destination depends on page (see Behavior below)
- Fixed position with `12px` margin from the left/right/bottom edges, respecting
  `env(safe-area-inset-bottom)` for iPhone home-indicator clearance

## Behavior

- **Visibility**: CTA bar is always visible on mobile (no scroll-based
  show/hide — keeps implementation simple and avoids jank).
- **Page content offset**: mobile pages get extra `padding-bottom` (~76px +
  safe-area inset) on `body` so the floating bar never overlaps footer content.
- **Nav menu vs. CTA bar conflict**: when the mobile nav menu is open, the CTA
  bar is hidden (`display: none` via a `.nav-open` class toggled by the existing
  menu JS) so the two floating elements never overlap.
- **"Get a Quote" link targets**:
  - Homepage → `#request` (existing request-quote section)
  - Contact page → `#contact-form` (new `id` added to `.contact-form-wrap`)
  - All other pages (service pages, blog index, blog posts) → `/contact-us`
- **"Call" link**: `tel:+17205192606` everywhere.

## Fallback / Browser Support

Wrap the glass effects in `@supports (backdrop-filter: blur(1px)) or
(-webkit-backdrop-filter: blur(1px))`. Outside that block, provide solid-color
fallbacks matching current styling (opaque white header, opaque white nav panel,
opaque red CTA bar) so older browsers see a fully-opaque but still-functional
UI — no transparency artifacts.

## Implementation Plan

### New file: `public/assets/css/liquid-glass.css`

Contains all of the above rules, scoped under `@media (max-width: 780px)`.
Linked from the `<head>` of every page, after the page's existing stylesheets,
so it can override as needed.

### Markup changes (per page)

Add the floating CTA bar markup immediately after `</header>`:

```html
<div class="glass-cta-bar" aria-label="Quick actions">
  <a class="glass-cta-bar__item" href="tel:+17205192606">
    <span class="glass-cta-bar__icon" aria-hidden="true">📞</span> Call
  </a>
  <a class="glass-cta-bar__item" href="<quote-target>">
    <span class="glass-cta-bar__icon" aria-hidden="true">📩</span> Get a Quote
  </a>
</div>
```

(Icons via simple inline SVGs rather than emoji for visual consistency —
finalized during implementation.)

Pages to edit:
- `public/index.html` — quote target `#request`
- `public/contact-us/index.html` — quote target `#contact-form`, plus add
  `id="contact-form"` to `.contact-form-wrap`
- `public/services/*/index.html` (8 files) — quote target `/contact-us`
- `scripts/build-blog.js` — add the same snippet to both the post template and
  the blog-index template (quote target `/contact-us`), regenerate with
  `npm run build:blog`

### JS changes

Extend the existing menu-toggle script (duplicated across pages and in
`build-blog.js`) to toggle a `.nav-open` class on `<body>` (or reuse the
existing `is-open` state on `#site-nav`) so `liquid-glass.css` can hide the CTA
bar while the nav is open. No new script files.

### CSS link addition

Add `<link rel="stylesheet" href="/assets/css/liquid-glass.css" />` to the
`<head>` of all pages listed above (and both `build-blog.js` templates).

## Testing / Verification

- Resize browser to ≤ 780px width and check each page type: homepage, one
  service page, contact page, blog index, one blog post.
- Verify: header blur renders over hero images, nav menu opens as a floating
  glass card, CTA bar is visible and doesn't overlap footer content, CTA bar
  hides while nav menu is open, "Call" and "Get a Quote" links go to the right
  places.
- Verify desktop/tablet (> 780px) is visually unchanged.
- Verify `@supports` fallback by simulating no `backdrop-filter` support (e.g.
  via DevTools experimental flag or temporarily commenting the rule) — confirm
  opaque fallback colors look acceptable.
