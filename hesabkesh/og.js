// nginx njs handler: renders / and the landing pages from index.html, and fills link-preview tags for shared links.
import fs from 'fs';
import calc from 'calc.js';
import pages from 'pages.js';

const SITE = 'https://hesabkesh.ir';

const TONE_MARK = { good: '🟢', ok: '🟡', warn: '🟠', high: '🔴', bad: '⛔' };

function numericText(value) {
  return String(value)
    .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776)
    .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632)
    .replace(/[\s\u200e\u200f\u061c٬,]/g, '')
    .replace(/٫/g, '.');
}

function num(args, key) {
  return parseFloat(numericText(args[key])) || 0;
}

// Mirrors restoreFromUrl() in index.html.
function resultFromQuery(args) {
  const showLoan = args.amount && (args.tab === 'loan' || !args.cash);
  if (showLoan) {
    return calc.loan({
      amount: num(args, 'amount'),
      rateAnn: num(args, 'rate'),
      n: num(args, 'term'),
      loanType: args.type === 'on-balance' ? 'on-balance' : 'on-principal',
      grace: num(args, 'grace'),
      graceType: args.gtype === 'interest-only' ? 'interest-only' : 'accumulate'
    });
  }
  if (args.cash) {
    return calc.installment({
      cash: num(args, 'cash'),
      down: num(args, 'down'),
      mode: args.mode === 'store' || args.mode === 'variable' ? args.mode : 'payment',
      payment: num(args, 'pmt'),
      n: num(args, 'n'),
      storeKind: args.kind === 'total' ? 'total' : 'extra',
      storeValue: num(args, args.pv !== undefined ? 'pv' : 'sv'),
      storeUnit: args.su === 'percent' ? 'percent' : 'amount',
      storeN: num(args, 'sn'),
      varPayments: (args['var'] || '').split(',').map(x => parseFloat(numericText(x)) || 0),
      firstPaymentNow: args.first === 'now',
      kind: args.inst === 'loan' ? 'loan' : 'purchase'
    });
  }
  return null;
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fill(html, re, value) {
  return html.replace(re, (m, open, close) => open + value + close);
}

function setMeta(html, attr, name, value) {
  return fill(html, new RegExp('(<meta ' + attr + '="' + name + '" content=")[^"]*(")'), escapeAttr(value));
}

function setPreview(html, title, description, url) {
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', url);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  // Telegram follows canonical and previews that page instead.
  return fill(html, /(<link rel="canonical" href=")[^"]*(")/, escapeAttr(url));
}

function applyLanding(html, path, lp) {
  html = fill(html, /(<title>)[^<]*(<\/title>)/, escapeAttr(lp.title));
  html = setMeta(html, 'name', 'description', lp.description);
  html = setPreview(html, lp.title, lp.description, SITE + path);
  html = html.replace(/(<h1>)[\s\S]*?(<\/h1>\s*<p>)[\s\S]*?(<\/p>)/, (m, h1, mid, end) =>
    h1 + '<span class="hero-question">' + lp.question + '</span> <span class="hero-answer">' + lp.answer + '</span>' +
    mid + lp.intro + end);
  html = html.replace(/<h2 id="seo-title">[\s\S]*?(?=<div class="seo-grid">)/, () => lp.body.trim() + '\n\n    ');
  return html.replace('<body>', () => '<body data-preset="' + escapeAttr(lp.preset) + '">');
}

// Read titles and introductions from the same static cards visitors see.
function articlePreview(html, id) {
  if (typeof id !== 'string' || !/^article-[a-z-]+$/.test(id)) return null;
  const card = html.match(new RegExp('<article class="card article-card" id="' + id + '"[^>]*>([\\s\\S]*?)</article>'));
  if (!card) return null;
  const title = card[1].match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  const intro = card[1].match(/<p>([\s\S]*?)<\/p>/);
  if (!title || !intro) return null;
  const plain = value => {
    let text = '', inTag = false, pendingSpace = false;
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (char === '<') { inTag = true; continue; }
      if (char === '>') { inTag = false; continue; }
      if (inTag) continue;
      if (/\s/.test(char)) { pendingSpace = true; continue; }
      if (pendingSpace && text) text += ' ';
      pendingSpace = false;
      text += char;
    }
    return text;
  };
  return { title: plain(title[1]), description: plain(intro[1]) };
}

function page(r) {
  const landing = Object.prototype.hasOwnProperty.call(pages, r.uri) ? pages[r.uri] : null;
  if (r.uri !== '/' && !landing) {
    r.return(404);
    return;
  }

  let html = fs.readFileSync(r.variables.document_root + '/index.html', 'utf8');
  if (landing) html = applyLanding(html, r.uri, landing);
  html = html.replace(/<body(?=[ >])/, '<body data-rendered="server"');

  const article = articlePreview(html, r.args.article);
  if (article) {
    const url = SITE + '/?tab=articles&article=' + r.args.article;
    html = fill(html, /(<title>)[^<]*(<\/title>)/, escapeAttr(article.title));
    html = setMeta(html, 'name', 'description', article.description);
    html = setPreview(html, article.title, article.description, url);
    html = setMeta(html, 'property', 'og:type', 'article');
    r.headersOut['Content-Type'] = 'text/html';
    r.return(200, html);
    return;
  }

  let res = null;
  try {
    res = resultFromQuery(r.args);
  } catch (e) {
    r.error('og preview: ' + e);
  }

  if (res && !res.error) {
    const p = calc.verdictProfile(res.ear);
    // Large-image cards may show only a shortened title, without the description.
    // Put the calculated rate first so the key result survives truncation.
    const rate = isFinite(res.ear) ? calc.fmtPct(res.ear) + ' نرخ مؤثر سالانه' : 'نرخ نیاز به بررسی';
    const title = rate + ' | ' + p.title + ' ' + TONE_MARK[p.tone] + ' | حساب‌کش';
    const description = rate + '؛ ' + res.summaryLead.replace(/<[^>]+>/g, '');
    html = setPreview(html, title, description, SITE + r.variables.request_uri);
  }

  r.headersOut['Content-Type'] = 'text/html';
  r.return(200, html);
}

export default { page };
