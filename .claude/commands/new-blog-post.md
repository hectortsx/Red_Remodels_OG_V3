# New Blog Post Command

You are writing a new SEO-optimized blog post for **Red Remodels** — a premier home remodeling and construction company serving Denver and the greater Colorado area. Your job is to write the post, build it, commit it to a feature branch, and deploy it end-to-end.

The user's topic or brief: **$ARGUMENTS**

---

## Step 1 — Plan the post

Before writing, decide:
- **Slug**: lowercase, hyphenated, max 5–6 words (e.g. `how-to-plan-a-bathroom-remodel`)
- **Title**: question-based or benefit-driven H1, 55–65 characters, includes a primary keyword
- **Description**: 150–160 characters, answers what the reader will learn, includes a local keyword
- **Primary keyword**: one highly searched question or phrase (e.g. "bathroom remodel Denver")
- **Tags**: 2–4 lowercase tags relevant to the topic
- **Image**: pick the best existing image from `/assets/images/` that fits the topic, or use `/assets/images/redRemodelsOpenGraph.png` as fallback
- **Date**: today's date in `YYYY-MM-DD` format

---

## Step 2 — Write the post

Write approximately **600–800 words**. Follow this structure exactly:

### Opening hook (1–2 paragraphs)
- Open with a compelling question, surprising stat, or bold statement — not "Are you looking for..."
- Immediately tell the reader what they'll learn
- Weave in the primary keyword naturally in the first 100 words

### Body sections (use ## H2 and ### H3 subheadings)
- Minimum 3 H2 sections, each with 1–3 H3 subsections if needed
- Each section answers a specific question a Denver homeowner would Google
- Bold important phrases, cost ranges, timeframes
- Use numbered or bulleted lists for steps, tips, or options
- Include at least one table if comparing options, costs, or timelines
- Naturally include local keywords: "Denver", "Colorado", "Front Range", "Denver metro area"
- Do NOT keyword-stuff — write for humans first

### CTA closing section (## heading + 1 paragraph + link)
- H2 like "Ready to [benefit]? Let's Talk." or "Start Your [topic] Project Today"
- 2–3 sentences reinforcing Red Remodels' expertise and local presence
- End with: `[Contact us today](/contact-us) for a free, no-pressure estimate.`

### Optional: YouTube embed
If the topic involves a video, use this exact markup inside the Markdown body:
```html
<div class="video-embed">
  <iframe src="https://www.youtube.com/embed/VIDEO_ID" title="Video title" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
```

---

## SEO Rules (non-negotiable)

- **Title**: 55–65 chars, includes primary keyword, ends with year or location if natural
- **Description**: 150–160 chars, no truncation, no keyword stuffing
- **Primary keyword**: appears in title, first paragraph, at least one H2, and naturally 3–5× in body
- **Local keywords** to use naturally: "Denver", "Colorado", "Front Range", "Denver metro", "Denver homeowners"
- **Internal links**: link to at least one relevant service page (e.g. `/services/bathroom-remodeling`)
- **Anchor text**: descriptive, not "click here" — e.g. `[bathroom remodeling services](/services/bathroom-remodeling)`
- **Reading level**: 8th grade — short sentences, plain English, no jargon without explanation
- **No duplicate H1** — the title in frontmatter becomes the H1, do not repeat it in the body

---

## Frontmatter format (exact)

```markdown
---
title: "Post Title Here — 55–65 Characters"
description: "150–160 character meta description. Answers what the reader learns. Includes a local keyword like Denver or Colorado."
date: "YYYY-MM-DD"
author: "Red Remodels"
tags: ["tag one", "tag two", "tag three"]
image: "/assets/images/CHOSEN_IMAGE_FILENAME"
imageAlt: "Descriptive alt text for the image, 10–15 words"
---
```

---

## Tone & Voice

- **Confident and local** — speak like a trusted Denver contractor, not a corporate website
- **Direct** — short sentences, no fluff, no filler phrases like "In today's world..."
- **Helpful first** — educate genuinely before selling
- **We/our** — write in first-person plural as Red Remodels
- Use em dashes (—) for emphasis, not parentheses
- Use **bold** for key facts, prices, and timeframes

---

## Step 3 — Save and build

1. Save the post to `blog/posts/<slug>.md`
2. Run `npm run build:blog` — verify it outputs `✓ /blog/<slug>/` with no errors
3. Verify the generated HTML in `public/blog/<slug>/index.html` looks correct

---

## Step 4 — Commit, push, and deploy

```bash
# Create feature branch
git checkout -b feature/blog-<slug>

# Stage only the blog files
git add blog/posts/<slug>.md public/blog/<slug>/index.html public/blog/index.html public/sitemap.xml

# Commit
git commit -m "Add blog post: <title>"

# Merge to main
git checkout main
git merge feature/blog-<slug>
git push origin main

# Deploy to S3
aws s3 sync public/ s3://www.redremodels.com --delete --profile red-remodels-deployer

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EKTYEDHVURFWC \
  --paths "/blog/<slug>/" "/blog/" "/sitemap.xml" \
  --profile red-remodels-deployer
```

---

## Quality checklist before committing

- [ ] Slug is lowercase, hyphenated, no special characters
- [ ] Title is 55–65 characters
- [ ] Description is 150–160 characters
- [ ] Primary keyword in title, first paragraph, and at least one H2
- [ ] At least one internal link to a service page
- [ ] CTA section ends with a link to `/contact-us`
- [ ] `npm run build:blog` ran successfully with no errors
- [ ] No duplicate canonical tags (the build script handles this automatically)
- [ ] Image file actually exists in `/assets/images/`
