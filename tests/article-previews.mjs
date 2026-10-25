import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import calc from '../hesabkesh/calc.js';
import pages from '../hesabkesh/pages.js';

const html = fs.readFileSync('hesabkesh/index.html', 'utf8');
const source = fs.readFileSync('hesabkesh/og.js', 'utf8')
  .replace(/^import .*;$/gm, '').replace('export default { page };', '');
const context = vm.createContext({ fs: { readFileSync: () => html }, calc, pages });
vm.runInContext(source, context);
for (const id of ['article-rate-guide', 'article-effective-rate', 'article-installment-impact']) {
  let response;
  context.page({
    uri: '/', args: { article: id, cash: '30000000', pmt: '3800000', n: '10' },
    variables: { document_root: '.', request_uri: '/' }, headersOut: {},
    return(status, body) { assert.equal(status, 200); response = body; },
    error(message) { throw new Error(message); },
  });
  const title = html.match(new RegExp('<h2 id="' + id + '-title"[^>]*><a[^>]*>([^<]+)'))[1];
  assert.ok(response.includes('<meta name="twitter:title" content="' + title + '">'));
  assert.ok(response.includes('<meta property="og:type" content="article">'));
  assert.ok(response.includes('href="https://hesabkesh.ir/?tab=articles&amp;article=' + id + '"'));
}
assert.equal(context.articlePreview(html, 'article-missing'), null);
assert.equal(context.articlePreview(html, '.*'), null);

const navigation = html.slice(html.indexOf('function articleFromHash()'), html.indexOf("window.addEventListener('hashchange'"));
let opened = false, focused = false;
const details = { open: false };
const article = {
  matches: () => true,
  querySelector: selector => selector === 'details' ? details : { focus() { focused = true; } },
  scrollIntoView() { opened = true; },
};
const browser = vm.createContext({
  URLSearchParams, location: { hash: '', search: '?tab=articles&article=article-installment-impact' },
  document: { getElementById: id => id === 'article-installment-impact' ? article : null },
  switchTab() {},
});
vm.runInContext(navigation, browser);
browser.restoreArticleFromHash();
assert.ok(details.open && focused && opened);
browser.location.search = '';
browser.location.hash = '#article-installment-impact';
assert.equal(browser.articleFromHash(), article);

for (const [, attrs, code] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (attrs.includes('application/ld+json') || !code.trim()) continue;
  const check = spawnSync('node', ['--input-type=' + (attrs.includes('type="module"') ? 'module' : 'commonjs'), '--check'], { input: code, encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
}
console.log('Passed: article previews, calculator-preview precedence, invalid IDs, query-only navigation, legacy fragments, and inline syntax.');

// Exercise the real restoration and tab-switch code together: initialization
// calls setInstallmentKind(), which switches to the installment calculator.
const restoreSource = html.match(/function restoreFromUrl\(\) \{[\s\S]*?\n\}/)[0];
const switchSource = html.match(/function switchTab\(name\) \{[\s\S]*?\n\}/)[0];
const kindSource = html.match(/function setInstallmentKind\(kind\) \{[\s\S]*?\n\}/)[0];
for (const suffix of ['#article-installment-impact', '']) {
  const url = new URL('https://hesabkesh.ir/?article=article-installment-impact&tab=articles' + suffix);
  const classes = { toggle() {}, remove() {}, add() {}, contains() { return false; } };
  const fields = {};
  let focused = false, scrolled = false;
  const details = { open: false };
  const article = {
    id: 'article-installment-impact', matches: () => true,
    querySelector: selector => selector === 'details' ? details : { focus() { focused = true; } },
    scrollIntoView() { scrolled = true; },
  };
  const state = {
    profitIsPercent: () => false, URLSearchParams, location: url, restoringState: false, instKind: 'purchase',
    window: {}, INST_KIND_TEXT: {}, lastCalculatorTab: 'installment',
    document: {
      body: { classList: classes, dataset: {} },
      getElementById(id) {
        if (id === article.id) return article;
        return fields[id] ||= { classList: classes, style: {}, value: '', setAttribute() {}, options: [] };
      },
      querySelectorAll() { return []; },
      querySelector() { return {}; },
    },
    history: { replaceState(a, b, path) { url.href = new URL(path, url).href; } },
  };
  for (const name of ['setChoice', 'trackEvent', 'refreshAccessibility',
    'setProfitUnit', 'setInstallmentEntryMode', 'setFirstPaymentTiming', 'setInstallmentDownVisibility',
    'updateEntryChoice', 'updateDownToggleText', 'updateStoreDerived', 'resetInstallmentResult', 'setFmtValue']) state[name] = () => {};
  const startup = vm.createContext(state);
  vm.runInContext(navigation + '\n' + switchSource + '\n' + kindSource + '\n' + restoreSource, startup);
  const requested = startup.articleFromHash();
  startup.restoreFromUrl();
  assert.equal(url.searchParams.get('article'), article.id, 'initialization must preserve article ID');
  assert.equal(url.hash, suffix, 'initialization must preserve fragment');
  startup.openArticle(requested);
  assert.ok(details.open && focused && scrolled, 'startup expands and focuses the article');
  startup.switchTab('installment');
  assert.equal(url.searchParams.has('article'), false, 'explicit calculator navigation clears article');
  assert.equal(url.hash, '');
}
console.log('Passed: full URL restoration preserves article targets, expands and focuses, then clears targets on calculator navigation.');
const previewPercent = context.resultFromQuery({inst:'loan',cash:'100000000',down:'5000000',mode:'store',kind:'extra',su:'percent',sv:'23',sn:'24'});
assert.equal(previewPercent.totalPaid,128000000);
assert.equal(previewPercent.financedAmount,95000000);
console.log('Passed: shared-link preview includes percentage profit and upfront fee.');

const backwardCompatible = context.resultFromQuery({cash:'100000000',down:'15000000',inst:'loan',kind:'extra',mode:'store',sn:'12',su:'percent',sv:'23000000',pv:'23'});
const olderPreviewHandler = context.resultFromQuery({cash:'100000000',down:'15000000',inst:'loan',kind:'extra',mode:'store',sn:'12',shared:'1',sv:'23000000'});
assert.equal(backwardCompatible.totalPaid,olderPreviewHandler.totalPaid);
assert.equal(backwardCompatible.ear,olderPreviewHandler.ear);
assert.equal(backwardCompatible.extra,38000000);
console.log('Passed: previously shared pv URLs remain readable by the current preview handler.');
