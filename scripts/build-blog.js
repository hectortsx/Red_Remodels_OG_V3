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

function nav(activePath = '') {
  return `
<div class="announcement-bar">
  <div class="container announcement-content">
    <span class="announcement-text">Denver homeowners: lock in expert remodel plans with a free design session</span>
    <div class="social-links">
      <a class="social-link social-link--icon" href="https://www.facebook.com/redremodels" target="_blank" rel="noreferrer">
        <img class="social-icon" src="/assets/images/facebookIcon.png" alt="" width="32" height="32" /><span class="sr-only">facebook.com/redremodels</span>
      </a>
      <a class="social-link social-link--icon" href="https://www.instagram.com/red_remodels/" target="_blank" rel="noreferrer">
        <img class="social-icon" src="/assets/images/instagramIcon.png" alt="" width="32" height="32" /><span class="sr-only">instagram.com/red_remodels</span>
      </a>
    </div>
  </div>
</div>
<header class="main-header" id="top">
  <div class="container header-inner">
    <button class="menu-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="site-nav">
      <span class="menu-toggle__bar"></span>
      <span class="menu-toggle__bar"></span>
      <span class="menu-toggle__bar"></span>
    </button>
    <a class="logo" href="/" aria-label="Red Remodels home">
      <img src="/assets/images/284_Red_Remodels_LOGO_VR_02-aae74d79-640w.jpg" alt="Red Remodels wordmark with icon" width="220" height="82" />
    </a>
    <nav class="site-nav" id="site-nav" aria-label="Primary navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/our-services">Our Services</a></li>
        <li><a href="/#about">About Us</a></li>
        <li><a href="/blog"${activePath === 'blog' ? ' aria-current="page"' : ''}>Blog</a></li>
        <li><a href="/contact-us">Contact Us</a></li>
      </ul>
    </nav>
    <a class="header-phone" href="tel:+17205192606">(720) 519-2606</a>
  </div>
</header>`.trim();
}

function footer() {
  return `
<footer class="site-footer">
  <p>&copy; ${new Date().getFullYear()} Red Remodels &mdash; Denver, CO &nbsp;|&nbsp;
    <a href="tel:+17205192606">(720) 519-2606</a> &nbsp;|&nbsp;
    <a href="mailto:hello@redremodels.com">hello@redremodels.com</a>
  </p>
</footer>`.trim();
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
  <title>${data.title} | Red Remodels Blog</title>
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
  <meta property="og:site_name" content="Red Remodels" />
  <meta property="article:published_time" content="${formatDateISO(data.date)}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${data.title}" />
  <meta name="twitter:description" content="${data.description}" />
  <meta name="twitter:image" content="${SITE_URL}${image}" />

  <!-- Structured data -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/pages/desktop/home/style.css" />
  <link rel="stylesheet" href="/assets/css/blog.css" />
  <link rel="icon" type="image/svg+xml" href="/assets/images/favicon-light.svg" />
</head>
<body>
  ${nav()}
  <div class="page-wrap">
    <header class="post-header">
      <div class="post-header-inner">
        <p class="post-breadcrumb">
          <a href="/">Home</a> &rsaquo; <a href="/blog">Blog</a> &rsaquo; ${data.title}
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
  ${footer()}
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
  name: 'Red Remodels Blog',
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
  <title>Blog | Red Remodels — Denver Remodeling Tips &amp; Guides</title>
  <meta name="description" content="Remodeling tips, cost guides, and inspiration for Denver homeowners from the team at Red Remodels." />
  <link rel="canonical" href="${SITE_URL}/blog" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Blog | Red Remodels" />
  <meta property="og:description" content="Remodeling tips, cost guides, and inspiration for Denver homeowners." />
  <meta property="og:url" content="${SITE_URL}/blog" />
  <meta property="og:image" content="${SITE_URL}/assets/images/redRemodelsOpenGraph.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Red Remodels" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Blog | Red Remodels" />
  <meta name="twitter:description" content="Remodeling tips, cost guides, and inspiration for Denver homeowners." />
  <meta name="twitter:image" content="${SITE_URL}/assets/images/redRemodelsOpenGraph.png" />

  <script type="application/ld+json">${JSON.stringify(blogJsonLd)}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/pages/desktop/home/style.css" />
  <link rel="stylesheet" href="/assets/css/blog.css" />
  <link rel="icon" type="image/svg+xml" href="/assets/images/favicon-light.svg" />
</head>
<body>
  ${nav('blog')}
  <div class="page-wrap">
    <header class="blog-hero">
      <h1>Red Remodels Blog</h1>
      <p>Remodeling tips, cost guides, and inspiration for Denver homeowners.</p>
    </header>
    <main id="main-content">
      <div class="post-grid" role="list">
        ${cards}
      </div>
    </main>
  </div>
  ${footer()}
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
