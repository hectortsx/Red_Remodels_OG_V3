#!/usr/bin/env node
/**
 * Blog build script — Red Remodels
 * Reads Markdown from blog/posts/, outputs static HTML to public/blog/
 * Run: npm run build:blog
 */

import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'blog', 'posts');
const OUT_DIR   = path.join(ROOT, 'public', 'blog');
const SITE_URL  = 'https://www.redremodels.com';

// Configure marked for clean, semantic output
marked.setOptions({ gfm: true, breaks: false });

// ── Extract header from homepage ───────────────────────────────────────────
// Reads the announcement bar + <header> block directly from index.html so
// the blog nav is always identical to the main site — no manual syncing needed.

const homeHtml = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');

// Extract the shared CSS + font links from the homepage <head>
// (preconnect, Google Fonts, desktop.css, style.css — everything except
//  canonical, recaptcha, and page-specific tags)
const sharedHeadMatch = homeHtml.match(/<link rel="preconnect"[\s\S]*?<link rel="stylesheet" href="\/pages\/desktop\/home\/style\.css" \/>/);
if (!sharedHeadMatch) throw new Error('Could not find shared head assets in public/index.html');
const SHARED_HEAD = sharedHeadMatch[0]
  .replace(/<link rel="canonical"[^>]*\/?>/g, '');

// Extract the header block from the homepage body
const headerMatch = homeHtml.match(/<div class="announcement-bar">[\s\S]*?<\/header>/);
if (!headerMatch) throw new Error('Could not find header block in public/index.html');
// Rewrite homepage anchor links so they work from any page
const SITE_HEADER = headerMatch[0]
  .replace(/href="#top"/g,      'href="/"')
  .replace(/href="#services"/g, 'href="/#services"')
  .replace(/href="#about"/g,    'href="/#about"')
  .replace(/href="#contact"/g,  'href="/#contact"')
  .replace(/href="#request"/g,  'href="/#request"');

// Extract the footer block from the homepage body
const footerMatch = homeHtml.match(/<footer class="main-footer">[\s\S]*?<\/footer>/);
if (!footerMatch) throw new Error('Could not find footer block in public/index.html');
// Rewrite logo/footer anchor links so they work from any page
const SITE_FOOTER = footerMatch[0]
  .replace(/href="#top"/g, 'href="/"');

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(filename) {
  return path.basename(filename, '.md');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });
}

function formatDateISO(dateStr) {
  return new Date(dateStr).toISOString();
}


function ga() {
  return `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SP8EDYP71R"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-SP8EDYP71R');</script>`.trim();
}

// ── Read posts ─────────────────────────────────────────────────────────────

const files = fs.readdirSync(POSTS_DIR)
  .filter(f => f.endsWith('.md'))
  .map(f => {
    const raw  = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const { data, content } = matter(raw);
    const slug = slugify(f);
    return { slug, data, content, file: f };
  })
  .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));

// ── Ensure output dirs ─────────────────────────────────────────────────────

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Generate individual post pages ─────────────────────────────────────────

for (const post of files) {
  const { slug, data, content } = post;
  const html   = marked(content);
  const url    = `${SITE_URL}/blog/${slug}`;
  const tags   = (data.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const image  = data.image || '/assets/images/redRemodelsOpenGraph.png';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: data.title,
    description: data.description,
    image: `${SITE_URL}${image}`,
    datePublished: formatDateISO(data.date),
    dateModified: formatDateISO(data.date),
    author: { '@type': 'Organization', name: data.author || 'Red Remodels', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Red Remodels',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/images/favicon-light.svg` }
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url }
  };

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  ${ga()}
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${data.title} | Red Remodels Tips &amp; Ideas</title>
  <meta name="description" content="${data.description}" />
  <link rel="canonical" href="${url}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${data.title}" />
  <meta property="og:description" content="${data.description}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE_URL}${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${data.imageAlt || data.title}" />
  <meta property="og:site_name" content="Red Remodels" />
  <meta property="article:published_time" content="${formatDateISO(data.date)}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${data.title}" />
  <meta name="twitter:description" content="${data.description}" />
  <meta name="twitter:image" content="${SITE_URL}${image}" />

  <!-- Structured data -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

  ${SHARED_HEAD}
  <link rel="stylesheet" href="/assets/css/blog.css" />
  <link rel="icon" type="image/svg+xml" href="/assets/images/favicon-light.svg" />
</head>
<body>
  ${SITE_HEADER}
  <div class="page-wrap">
    <header class="post-header">
      <div class="post-header-inner">
        <p class="post-breadcrumb">
          <a href="/">Home</a> &rsaquo; <a href="/blog">Tips &amp; Ideas</a> &rsaquo; ${data.title}
        </p>
        ${tags ? `<div class="post-tags">${tags}</div>` : ''}
        <h1>${data.title}</h1>
        <p class="post-meta">By ${data.author || 'Red Remodels'} &nbsp;&middot;&nbsp; ${formatDate(data.date)}</p>
      </div>
    </header>

    <main class="post-body" id="main-content">
      <article class="post-content" itemscope itemtype="https://schema.org/BlogPosting">
        <meta itemprop="headline" content="${data.title}" />
        <meta itemprop="datePublished" content="${formatDateISO(data.date)}" />
        ${html}
      </article>
      <div class="post-cta" role="complementary" aria-label="Call to action">
        <h3>Ready to transform your home?</h3>
        <p>Red Remodels serves the greater Denver metro area. Get a free, no-pressure estimate.</p>
        <a href="/contact-us">Get a Free Quote</a>
      </div>
    </main>
  </div>
  ${SITE_FOOTER}
  <script>(function(){document.getElementById('year').textContent=new Date().getFullYear();var t=document.querySelector('.menu-toggle'),n=document.getElementById('site-nav');if(!t||!n)return;t.addEventListener('click',function(){var o=n.classList.toggle('is-open');t.setAttribute('aria-expanded',o);t.classList.toggle('is-open',o);});n.querySelectorAll('a').forEach(function(l){if(l.parentElement&&l.parentElement.classList.contains('has-dropdown'))return;l.addEventListener('click',function(){n.classList.remove('is-open');t.setAttribute('aria-expanded','false');t.classList.remove('is-open');});});n.querySelectorAll('.has-dropdown').forEach(function(d){var p=d.querySelector(':scope>a');p.addEventListener('click',function(e){e.preventDefault();d.classList.toggle('is-open');});d.querySelectorAll('.nav-dropdown a').forEach(function(l){l.addEventListener('click',function(){d.classList.remove('is-open');n.classList.remove('is-open');t.setAttribute('aria-expanded','false');t.classList.remove('is-open');});});});document.addEventListener('click',function(e){n.querySelectorAll('.has-dropdown.is-open').forEach(function(d){if(!d.contains(e.target))d.classList.remove('is-open');});});})();</script>
</body>
</html>`;

  const postOutDir = path.join(OUT_DIR, slug);
  fs.mkdirSync(postOutDir, { recursive: true });
  fs.writeFileSync(path.join(postOutDir, 'index.html'), page.trim());
  console.log(`  ✓ /blog/${slug}/`);
}

// ── Generate blog index ────────────────────────────────────────────────────

const cards = files.map(({ slug, data }) => {
  const tags  = (data.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const image = data.image || '/assets/images/redRemodelsOpenGraph.png';
  return `
<a href="/blog/${slug}" class="post-card" aria-label="${data.title}">
  <img class="post-card-img" src="${image}" alt="${data.imageAlt || data.title}" width="640" height="360" loading="lazy" decoding="async" />
  <div class="post-card-body">
    ${tags ? `<div class="post-card-tags">${tags}</div>` : ''}
    <h2>${data.title}</h2>
    <p>${data.description}</p>
    <p class="post-card-meta">${formatDate(data.date)}</p>
  </div>
</a>`.trim();
}).join('\n');

const blogJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Red Remodels Tips & Ideas',
  url: `${SITE_URL}/blog`,
  description: 'Remodeling tips, cost guides, and inspiration for Denver homeowners.',
  publisher: { '@type': 'Organization', name: 'Red Remodels', url: SITE_URL }
};

const indexPage = `<!DOCTYPE html>
<html lang="en">
<head>
  ${ga()}
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tips &amp; Ideas | Red Remodels — Denver Remodeling Guides</title>
  <meta name="description" content="Remodeling tips, cost guides, and inspiration for Denver homeowners from the team at Red Remodels." />
  <link rel="canonical" href="${SITE_URL}/blog" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Tips &amp; Ideas | Red Remodels" />
  <meta property="og:description" content="Remodeling tips, cost guides, and inspiration for Denver homeowners." />
  <meta property="og:url" content="${SITE_URL}/blog" />
  <meta property="og:image" content="${SITE_URL}/assets/images/redRemodelsOpenGraph.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Red Remodels" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Tips &amp; Ideas | Red Remodels" />
  <meta name="twitter:description" content="Remodeling tips, cost guides, and inspiration for Denver homeowners." />
  <meta name="twitter:image" content="${SITE_URL}/assets/images/redRemodelsOpenGraph.png" />

  <script type="application/ld+json">${JSON.stringify(blogJsonLd)}</script>

  ${SHARED_HEAD}
  <link rel="stylesheet" href="/assets/css/blog.css" />
  <link rel="icon" type="image/svg+xml" href="/assets/images/favicon-light.svg" />
</head>
<body>
  ${SITE_HEADER}
  <div class="page-wrap">
    <header class="blog-hero">
      <h1>Tips &amp; Ideas</h1>
      <p>Remodeling guides, cost breakdowns, and inspiration for Denver homeowners.</p>
    </header>
    <main id="main-content">
      <div class="post-grid" role="list">
        ${cards}
      </div>
    </main>
  </div>
  ${SITE_FOOTER}
  <script>(function(){document.getElementById('year').textContent=new Date().getFullYear();var t=document.querySelector('.menu-toggle'),n=document.getElementById('site-nav');if(!t||!n)return;t.addEventListener('click',function(){var o=n.classList.toggle('is-open');t.setAttribute('aria-expanded',o);t.classList.toggle('is-open',o);});n.querySelectorAll('a').forEach(function(l){if(l.parentElement&&l.parentElement.classList.contains('has-dropdown'))return;l.addEventListener('click',function(){n.classList.remove('is-open');t.setAttribute('aria-expanded','false');t.classList.remove('is-open');});});n.querySelectorAll('.has-dropdown').forEach(function(d){var p=d.querySelector(':scope>a');p.addEventListener('click',function(e){e.preventDefault();d.classList.toggle('is-open');});d.querySelectorAll('.nav-dropdown a').forEach(function(l){l.addEventListener('click',function(){d.classList.remove('is-open');n.classList.remove('is-open');t.setAttribute('aria-expanded','false');t.classList.remove('is-open');});});});document.addEventListener('click',function(e){n.querySelectorAll('.has-dropdown.is-open').forEach(function(d){if(!d.contains(e.target))d.classList.remove('is-open');});});})();</script>
</body>
</html>`;

fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexPage.trim());
console.log('  ✓ /blog/');

// ── Update sitemap ─────────────────────────────────────────────────────────

const sitemapPath = path.join(ROOT, 'public', 'sitemap.xml');
let sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';

const blogUrls = [
  `  <url><loc>${SITE_URL}/blog</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
  ...files.map(({ slug, data }) =>
    `  <url><loc>${SITE_URL}/blog/${slug}</loc><lastmod>${new Date(data.date).toISOString().split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`
  )
].join('\n');

if (sitemap.includes('</urlset>')) {
  // Remove existing blog entries and re-inject fresh ones
  sitemap = sitemap
    .replace(/\s*<url><loc>[^<]*\/blog[^<]*<\/loc>[\s\S]*?<\/url>/g, '')
    .replace('</urlset>', `${blogUrls}\n</urlset>`);
} else {
  sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${blogUrls}\n</urlset>`;
}

fs.writeFileSync(sitemapPath, sitemap);
console.log('  ✓ sitemap.xml updated');
console.log(`\nBlog build complete — ${files.length} post(s).`);
