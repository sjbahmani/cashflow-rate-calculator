# AGENTS.md

## Project
This repository contains a Persian static website for calculating the real cost of loans, installment purchases, and credit offers.

## Main Files
- `index.html` is the primary user-facing page.
- `calc.js` holds the rate math, shared by the page and `og.js`; keep it njs-compatible (no `Array.from`, no `Intl`).
- `og.js` is an nginx njs handler that renders `/` and the landing pages from `index.html` and fills link-preview tags for shared URLs.
- `pages.js` lists the SEO landing pages (path, title, intro, example preset); add a page there and to `sitemap.xml`.
- `fonts/` holds the self-hosted Vazirmatn files.
- `favicon.svg` is the site favicon.
- `robots.txt` and `sitemap.xml` support search indexing.
- Python files in the repo are earlier calculation/reference utilities.

## Editing Guidelines
- Keep visible UI copy in Persian.
- Prefer small, focused changes over broad rewrites.
- Keep the calculator usable as a static page with no build step.
- Preserve the existing visual tone: dark, restrained, clear, and practical.
- Keep accessibility in mind, especially text contrast and control boundaries.

## Verification
- After JavaScript edits, run an inline syntax check for scripts inside `index.html`.
- For visual changes, serve locally with `python3 -m http.server 8000` and open `index.html`. Landing pages and previews need nginx with njs (see `../hesabkesh.nginx.conf`).
- Check the three calculator tabs: installment purchase, bank loan, and comparison.

## Adding articles
- Articles live as static HTML cards inside `#panel-articles` in `index.html`; no build step or new route is needed.
- Duplicate an existing `<article class="card article-card">` block. Give the article and heading unique IDs, and match `aria-labelledby` to the heading ID.
- Include a Persian title, source/author attribution, a concise original summary, and a direct link to the full source. Retain `rel="noopener noreferrer"` for links opening a new tab.
- Add new cards first to show newest entries first. Reuse the existing classes for consistent styling.
- The section is directly accessible with `?tab=articles`. These cards are not separate landing pages, so they need no `pages.js` or sitemap entry.
- Verify article navigation, source links, mobile layout, and returning to both calculators without losing inputs.

- For long articles, keep a short introduction visible and place the full text inside `<details class="article-details">` with a `<summary>` control. Reuse `.article-full` and `.article-formula` (with `dir="ltr"`) for readable formulas.

- `static-pages.js` provides landing-page previews on a plain static server via `index.html?page=marriage-loan` (and the other `pages.js` keys). Production nginx responses carry `data-rendered="server"` and retain clean URLs.
