import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import calc from '../hesabkesh/calc.js';
import pages from '../hesabkesh/pages.js';

const html = fs.readFileSync(new URL('../hesabkesh/index.html', import.meta.url), 'utf8');
const image = fs.readFileSync(new URL('../hesabkesh/og-image.png', import.meta.url));
const source = fs.readFileSync(new URL('../hesabkesh/og.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '').replace('export default { page };', '');
const context = vm.createContext({ fs: { readFileSync: () => html }, calc, pages });
vm.runInContext(source, context);

function render(uri = '/', args = {}) {
  let status, body;
  const query = new URLSearchParams(args).toString();
  const requestUri = uri + (query ? '?' + query : '');
  context.page({
    uri, args,
    variables: { document_root: '.', request_uri: requestUri },
    headersOut: {},
    return(code, content) { status = code; body = content; },
    error(message) { throw new Error(message); },
  });
  assert.equal(status, 200);
  return { body, url: 'https://hesabkesh.ir' + requestUri };
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

function meta(body, key, value) {
  const matches = [...body.matchAll(/<meta\b[^>]*>/g)]
    .map(match => attributes(match[0]))
    .filter(attrs => attrs[key] === value);
  assert.equal(matches.length, 1, `expected one ${key}="${value}" meta tag`);
  return matches[0].content;
}

function checkPreview(body, expected) {
  assert.ok(meta(body, 'property', 'og:title'));
  assert.ok(meta(body, 'property', 'og:description'));
  assert.equal(meta(body, 'property', 'og:type'), expected.type || 'website');
  assert.equal(meta(body, 'property', 'og:locale'), 'fa_IR');
  assert.equal(meta(body, 'property', 'og:site_name'), 'حساب‌کش');
  assert.equal(meta(body, 'property', 'og:url').replaceAll('&amp;', '&'), expected.url);
  assert.equal(meta(body, 'property', 'og:image'), 'https://hesabkesh.ir/og-image.png');
  assert.equal(meta(body, 'property', 'og:image:secure_url'), 'https://hesabkesh.ir/og-image.png');
  assert.equal(meta(body, 'property', 'og:image:type'), 'image/png');
  assert.equal(meta(body, 'property', 'og:image:width'), '1200');
  assert.equal(meta(body, 'property', 'og:image:height'), '630');
  assert.ok(meta(body, 'property', 'og:image:alt'));
  assert.equal(meta(body, 'name', 'twitter:card'), 'summary_large_image');
  assert.equal(meta(body, 'name', 'twitter:title'), meta(body, 'property', 'og:title'));
  assert.equal(meta(body, 'name', 'twitter:description'), meta(body, 'property', 'og:description'));
  assert.equal(meta(body, 'name', 'twitter:image'), 'https://hesabkesh.ir/og-image.png');
  assert.ok(meta(body, 'name', 'twitter:image:alt'));
}

const home = render();
checkPreview(home.body, { url: home.url });
for (const [path, landing] of Object.entries(pages)) {
  const page = render(path);
  checkPreview(page.body, { url: page.url });
  assert.equal(meta(page.body, 'property', 'og:title'), landing.title);
  assert.equal(meta(page.body, 'property', 'og:description'), landing.description);
}
console.log('Passed: home and every landing page have complete large-image social previews.');

const calculator = render('/', { cash: '30000000', pmt: '3800000', n: '10', shared: '1' });
checkPreview(calculator.body, { url: calculator.url });
assert.match(meta(calculator.body, 'property', 'og:title'), /^حساب‌کش می‌گه:/);
const article = render('/', { tab: 'articles', article: 'article-effective-rate' });
checkPreview(article.body, { url: article.url, type: 'article' });
assert.ok(meta(article.body, 'property', 'og:title').includes('نرخ مؤثر سالانه'));
console.log('Passed: calculated results and articles retain their specific text and the shared social image.');

assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(image.toString('ascii', 12, 16), 'IHDR');
assert.equal(image.readUInt32BE(16), 1200);
assert.equal(image.readUInt32BE(20), 630);
assert.ok(image.length < 5 * 1024 * 1024);
console.log('Passed: og-image.png is a 1200×630 PNG small enough for social crawlers.');
