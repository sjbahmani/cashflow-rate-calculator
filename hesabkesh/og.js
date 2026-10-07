// nginx njs handler: renders / and the landing pages from index.html, and fills link-preview tags for shared links.
import fs from 'fs';
import calc from 'calc.js';
import pages from 'pages.js';

const SITE = 'https://hesabkesh.ir';

const TONE_MARK = { good: '🟢', ok: '🟡', warn: '🟠', high: '🔴', bad: '⛔' };

function num(args, key) {
  return parseFloat(args[key]) || 0;
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
      storeValue: num(args, 'sv'),
      storeN: num(args, 'sn'),
      varPayments: (args['var'] || '').split(',').map(x => parseFloat(x) || 0),
      firstPaymentNow: args.first === 'now'
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

function page(r) {
  const landing = pages[r.uri];
  if (r.uri !== '/' && !landing) {
    r.return(404);
    return;
  }

  let html = fs.readFileSync(r.variables.document_root + '/index.html', 'utf8');
  if (landing) html = applyLanding(html, r.uri, landing);

  let res = null;
  try {
    res = resultFromQuery(r.args);
  } catch (e) {
    r.error('og preview: ' + e);
  }

  if (res && !res.error) {
    const p = calc.verdictProfile(res.ear);
    const title = 'حساب‌کش می‌گه: ' + p.title + ' ' + TONE_MARK[p.tone];
    html = setPreview(html, title, res.summaryLead.replace(/<[^>]+>/g, ''), SITE + r.variables.request_uri);
  }

  r.headersOut['Content-Type'] = 'text/html';
  r.return(200, html);
}

export default { page };
