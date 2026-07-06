# AGENTS.md

## Project
This repository contains a Persian static website for calculating the real cost of loans, installment purchases, and credit offers.

## Main Files
- `loan-calculator.html` is the primary user-facing page.
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
- After JavaScript edits, run an inline syntax check for scripts inside `loan-calculator.html`.
- For visual changes, serve locally with `python3 -m http.server 8000` and open `loan-calculator.html`.
- Check the three calculator tabs: installment purchase, bank loan, and comparison.
