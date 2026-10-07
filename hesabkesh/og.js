// nginx njs handler: fills the link-preview meta tags from the shared-link query, using the page's own calc.js.
import fs from 'fs';
import calc from 'calc.js';

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

function setMeta(html, attr, name, value) {
  const re = new RegExp('(<meta ' + attr + '="' + name + '" content=")[^"]*(")');
  return html.replace(re, (m, open, close) => open + escapeAttr(value) + close);
}

function page(r) {
  let html = fs.readFileSync(r.variables.document_root + '/index.html', 'utf8');
  let res = null;
  try {
    res = resultFromQuery(r.args);
  } catch (e) {
    r.error('og preview: ' + e);
  }

  if (res && !res.error) {
    const p = calc.verdictProfile(res.ear);
    const title = 'حساب‌کش می‌گه: ' + p.title + ' ' + TONE_MARK[p.tone];
    const description = res.summaryLead.replace(/<[^>]+>/g, '');
    const url = 'https://' + r.variables.host + r.variables.request_uri;
    html = setMeta(html, 'property', 'og:title', title);
    html = setMeta(html, 'property', 'og:description', description);
    html = setMeta(html, 'property', 'og:url', url);
    // Telegram follows canonical and previews that page instead.
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, (m, open, close) => open + escapeAttr(url) + close);
    html = setMeta(html, 'name', 'twitter:title', title);
    html = setMeta(html, 'name', 'twitter:description', description);
  }

  r.headersOut['Content-Type'] = 'text/html; charset=utf-8';
  r.return(200, html);
}

export default { page };
