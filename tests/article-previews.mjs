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
