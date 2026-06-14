# Mobile Liquid Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Liquid Glass visual treatment (frosted header, floating glass nav menu, floating red-glass bottom CTA bar) to every page on mobile (≤780px), per `docs/superpowers/specs/2026-06-14-liquid-glass-mobile-design.md`.

**Architecture:** One new CSS file (`public/assets/css/liquid-glass.css`) holds all glass rules behind `@media (max-width: 780px)`, with `@supports` fallbacks for non-supporting browsers. The open/closed nav state already toggles `.is-open` on `#site-nav`, so the new CSS hides the floating CTA bar via `:has()` — no JS changes needed. Each page gets one new `<link>` and one small CTA-bar markup snippet after `</header>`.

**Tech Stack:** Plain HTML/CSS. No build step for static pages; blog pages are regenerated via `npm run build:blog` after editing `scripts/build-blog.js`.

This is a static-site styling task — there is no unit test runner. "Tests" below are manual verification steps (resize browser / use `run` skill to view pages).

---

### Task 1: Create `public/assets/css/liquid-glass.css`

**Files:**
- Create: `public/assets/css/liquid-glass.css`

- [ ] **Step 1: Write the stylesheet**

```css
/* Liquid Glass mobile UI — header, nav menu, floating CTA bar.
   Scoped to phone-size screens (≤780px), matches the existing mobile breakpoint. */

.glass-cta-bar {
  display: none;
}

@media (max-width: 780px) {
  /* ---- Floating bottom CTA bar ---- */
  .glass-cta-bar {
    display: flex;
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom));
    z-index: 40;
    border-radius: 999px;
    overflow: hidden;
    text-decoration: none;
  }

  .glass-cta-bar__item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.95rem 0;
    color: var(--color-white);
    font-weight: 700;
    font-size: 0.95rem;
    text-decoration: none;
  }

  .glass-cta-bar__item + .glass-cta-bar__item {
    border-left: 1px solid rgba(255, 255, 255, 0.35);
  }

  .glass-cta-bar__icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  /* Hide the floating CTA bar while the mobile nav menu is open */
  .main-header:has(#site-nav.is-open) ~ .glass-cta-bar {
    display: none;
  }

  /* Room for the floating CTA bar so it never covers footer content */
  body {
    padding-bottom: calc(82px + env(safe-area-inset-bottom));
  }

  /* ---- Floating nav menu becomes a detached glass card ---- */
  .site-nav.is-open {
    left: 12px;
    right: 12px;
    top: calc(100% + 8px);
    border-radius: 20px;
    padding: 0.5rem;
  }

  .site-nav.is-open ul li a {
    border-bottom: none;
    border-radius: 12px;
    padding: 0.85rem 1rem;
  }

  .site-nav.is-open ul li a:hover,
  .site-nav.is-open ul li a:active {
    background: rgba(255, 255, 255, 0.4);
  }

  /* ---- Glass surfaces (with backdrop-filter) ---- */
  @supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
    .main-header {
      background: rgba(255, 255, 255, 0.55);
      -webkit-backdrop-filter: blur(18px) saturate(160%);
      backdrop-filter: blur(18px) saturate(160%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 8px 32px rgba(6, 23, 44, 0.12);
    }

    .site-nav.is-open {
      background: rgba(255, 255, 255, 0.45);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.7);
      box-shadow: 0 12px 40px rgba(6, 23, 44, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.8);
    }

    .glass-cta-bar {
      background: rgba(192, 57, 43, 0.75);
      -webkit-backdrop-filter: blur(18px) saturate(180%);
      backdrop-filter: blur(18px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.4);
      box-shadow: 0 10px 30px rgba(6, 23, 44, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5);
    }
  }

  /* ---- Fallback: opaque surfaces when backdrop-filter is unsupported ---- */
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .main-header {
      background: var(--color-white);
    }

    .site-nav.is-open {
      background: var(--color-white);
    }

    .glass-cta-bar {
      background: var(--color-red);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/assets/css/liquid-glass.css
git commit -m "Add liquid-glass.css for mobile header, nav, and CTA bar"
```

---

### Task 2: Define the shared CTA bar markup

This exact snippet (with `__QUOTE_HREF__` replaced per page) is inserted immediately after the closing `</header>` tag on every page. Two icons (phone, envelope) as inline SVG so no new image assets are needed.

```html
    <div class="glass-cta-bar" aria-label="Quick actions">
      <a class="glass-cta-bar__item" href="tel:+17205192606">
        <svg class="glass-cta-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call
      </a>
      <a class="glass-cta-bar__item" href="__QUOTE_HREF__">
        <svg class="glass-cta-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
        Get a Quote
      </a>
    </div>
```

`__QUOTE_HREF__` values:

| Page | `__QUOTE_HREF__` |
|---|---|
| `public/index.html` | `#request` |
| `public/contact-us/index.html` | `#contact-form` |
| `public/services/*/index.html` (all 8) | `/contact-us` |
| Blog index + posts (`scripts/build-blog.js` templates) | `/contact-us` |

No code/commit step here — this snippet is consumed by Tasks 3–6.

---

### Task 3: Wire up `public/index.html`

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add the stylesheet link**

After the existing stylesheet links (around line 106):

```html
    <link rel="stylesheet" href="/assets/css/desktop.css" />
    <link rel="stylesheet" href="/pages/desktop/home/style.css" />
    <link rel="stylesheet" href="/assets/css/liquid-glass.css" />
```

- [ ] **Step 2: Insert the CTA bar after `</header>`**

Immediately after the `</header>` tag (currently line 168), insert the Task 2 snippet with `__QUOTE_HREF__` = `#request`:

```html
    </header>

    <div class="glass-cta-bar" aria-label="Quick actions">
      <a class="glass-cta-bar__item" href="tel:+17205192606">
        <svg class="glass-cta-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call
      </a>
      <a class="glass-cta-bar__item" href="#request">
        <svg class="glass-cta-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
        Get a Quote
      </a>
    </div>
```

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "Add liquid-glass CTA bar and stylesheet to homepage"
```

---

### Task 4: Wire up `public/contact-us/index.html`

**Files:**
- Modify: `public/contact-us/index.html`

- [ ] **Step 1: Add the stylesheet link**

Find the existing stylesheet `<link>` block (matches the pattern in Task 3 Step 1) and add `liquid-glass.css` after it, same as Task 3.

- [ ] **Step 2: Add `id="contact-form"` to the form wrapper**

Find (around line 208):

```html
          <div class="contact-form-wrap">
```

Change to:

```html
          <div class="contact-form-wrap" id="contact-form">
```

- [ ] **Step 3: Insert the CTA bar after `</header>`**

Same as Task 3 Step 2, but with `__QUOTE_HREF__` = `#contact-form` (i.e. `href="#contact-form"` on the second link).

- [ ] **Step 4: Commit**

```bash
git add public/contact-us/index.html
git commit -m "Add liquid-glass CTA bar and stylesheet to contact page"
```

---

### Task 5: Wire up all 8 service pages

**Files:**
- Modify: `public/services/kitchen-remodels/index.html`
- Modify: `public/services/bathroom-remodeling/index.html`
- Modify: `public/services/home-additions/index.html`
- Modify: `public/services/custom-carpentry/index.html`
- Modify: `public/services/outdoor-living-spaces/index.html`
- Modify: `public/services/basement-finishing/index.html`
- Modify: `public/services/flooring-installation/index.html`
- Modify: `public/services/garage-conversions-adus/index.html`

For **each** of the 8 files:

- [ ] **Step 1: Add the stylesheet link**

The existing block looks like:

```html
    <link rel="stylesheet" href="/assets/css/desktop.css" />
    <link rel="stylesheet" href="/pages/desktop/home/style.css" />
    <link rel="stylesheet" href="/assets/css/services.css" />
```

Add `liquid-glass.css` after `services.css`:

```html
    <link rel="stylesheet" href="/assets/css/desktop.css" />
    <link rel="stylesheet" href="/pages/desktop/home/style.css" />
    <link rel="stylesheet" href="/assets/css/services.css" />
    <link rel="stylesheet" href="/assets/css/liquid-glass.css" />
```

- [ ] **Step 2: Insert the CTA bar after `</header>`**

Same snippet as Task 3 Step 2, but with `__QUOTE_HREF__` = `/contact-us`.

- [ ] **Step 3: Commit (all 8 files together)**

```bash
git add public/services/kitchen-remodels/index.html \
        public/services/bathroom-remodeling/index.html \
        public/services/home-additions/index.html \
        public/services/custom-carpentry/index.html \
        public/services/outdoor-living-spaces/index.html \
        public/services/basement-finishing/index.html \
        public/services/flooring-installation/index.html \
        public/services/garage-conversions-adus/index.html
git commit -m "Add liquid-glass CTA bar and stylesheet to service pages"
```

---

### Task 6: Wire up blog pages via `scripts/build-blog.js`

**Files:**
- Modify: `scripts/build-blog.js`

The script extracts `SITE_HEADER` (announcement bar through `</header>`) from `public/index.html` and inlines it into two templates (blog post, around line 157; blog index, around line 253). The new `<header>`-sibling CTA bar markup is NOT part of `SITE_HEADER` (it ends at `</header>`), so it must be added separately to both templates, plus the stylesheet link to both templates' `<head>`s.

- [ ] **Step 1: Add the stylesheet link to both templates**

Find the `<head>` stylesheet block in each template (each currently links `desktop.css`, `pages/desktop/home/style.css`, and `blog.css` — same pattern as `public/blog/index.html`). Add immediately after the existing `blog.css`/last stylesheet link in **both** templates:

```html
  <link rel="stylesheet" href="/assets/css/liquid-glass.css" />
```

- [ ] **Step 2: Add the CTA bar after `${SITE_HEADER}` in the post template**

Around line 157-159, change:

```js
  ${SITE_HEADER}
    <header class="post-header">
```

to:

```js
  ${SITE_HEADER}
    <div class="glass-cta-bar" aria-label="Quick actions">
      <a class="glass-cta-bar__item" href="tel:+17205192606">
        <svg class="glass-cta-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call
      </a>
      <a class="glass-cta-bar__item" href="/contact-us">
        <svg class="glass-cta-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
        Get a Quote
      </a>
    </div>
    <header class="post-header">
```

- [ ] **Step 3: Add the CTA bar after `${SITE_HEADER}` in the blog index template**

Around line 253-255, apply the identical change (same snippet, same `/contact-us` href) before `<header class="blog-hero">`:

```js
  ${SITE_HEADER}
    <div class="glass-cta-bar" aria-label="Quick actions">
      <a class="glass-cta-bar__item" href="tel:+17205192606">
        <svg class="glass-cta-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call
      </a>
      <a class="glass-cta-bar__item" href="/contact-us">
        <svg class="glass-cta-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
        Get a Quote
      </a>
    </div>
    <header class="blog-hero">
```

- [ ] **Step 4: Rebuild blog pages**

```bash
npm run build:blog
```

Expected: regenerates `public/blog/index.html` and every `public/blog/<slug>/index.html` with the new link tag and CTA bar markup.

- [ ] **Step 5: Verify generated output**

```bash
grep -l "glass-cta-bar" public/blog/index.html public/blog/*/index.html | wc -l
```

Expected: count equals (number of blog posts + 1).

- [ ] **Step 6: Commit**

```bash
git add scripts/build-blog.js public/blog/
git commit -m "Add liquid-glass CTA bar and stylesheet to blog pages"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Verify mobile rendering**

Use the `run` skill (or a local server + browser resize to ≤780px width) to check:
- Homepage: header is frosted/translucent over the hero image when scrolled; opening the nav menu shows a floating rounded glass card; "Call"/"Get a Quote" pill is fixed at the bottom and "Get a Quote" jumps to the request form; the CTA bar disappears while the nav menu is open.
- One service page (e.g. `kitchen-remodels`): same header/nav/CTA bar; "Get a Quote" goes to `/contact-us`.
- Contact page: "Get a Quote" jumps to `#contact-form`.
- Blog index and one blog post: CTA bar present, "Get a Quote" goes to `/contact-us`.
- Footer content is not covered by the floating CTA bar on any page.

- [ ] **Step 2: Verify desktop is unchanged**

Resize to >780px on the homepage and one service page — header, nav, and page layout should look exactly as before (no CTA bar visible).

- [ ] **Step 3: Commit any fixes found during verification**

If adjustments are needed, make them, then:

```bash
git add -- <changed files>
git commit -m "Fix mobile liquid-glass styling issues from verification"
```
