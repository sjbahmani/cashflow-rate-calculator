import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import pages from '../hesabkesh/pages.js';
import calc from '../hesabkesh/calc.js';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const template = read('hesabkesh/index.html');
const context = vm.createContext({ fs: { readFileSync: () => template }, calc, pages });
vm.runInContext(read('hesabkesh/og.js').replace(/^import .*;$/gm, '').replace('export default { page };', ''), context);
const sitemap = read('hesabkesh/sitemap.xml');
const nginx = read('hesabkesh.nginx.conf');
const normalized = nginx.match(/location ~ \^\/\(([^)]+)\)/)[1].split('|');
const titles = new Set(), descriptions = new Set(), headings = new Set();
for (const [path, landing] of Object.entries(pages)) {
  let html;
  context.page({ uri: path, args: {}, headersOut: {}, variables: { document_root: '.', request_uri: path },
    return(status, body) { assert.equal(status, 200); html = body; }, error(message) { throw new Error(message); } });
  assert.equal(html.match(/<title>([^<]+)<\/title>/)[1], landing.title);
  assert.equal(html.match(/<h1 id="hero-heading">([^<]+)<\/h1>/)[1], landing.question);
  assert.equal(html.match(/<p class="hero-subtitle">([^<]+)<\/p>/)[1], landing.answer);
  assert.equal(html.match(/<p class="hero-description">([^<]+)<\/p>/)[1], landing.intro);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.ok(html.includes(landing.body.trim()));
  assert.ok(html.includes('data-rendered="server"'));
  assert.ok(html.includes('data-preset="' + landing.preset.replaceAll('&', '&amp;') + '"'));
  assert.ok(html.includes('<link rel="canonical" href="https://hesabkesh.ir' + path + '">'));
  const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const app = schemas.find(s => s['@type'] === 'WebApplication');
  assert.equal(app.url, 'https://hesabkesh.ir' + path);
  assert.equal(app.name, landing.question + ' | حساب‌کش');
  assert.equal(app.description, landing.description);
  assert.ok(sitemap.includes('<loc>https://hesabkesh.ir' + path + '</loc>'));
  assert.ok(template.includes('href="' + path + '"'), 'each landing has a crawlable internal link');
  assert.ok(normalized.includes(path.slice(1)), 'trailing slash redirects cover every landing');
  titles.add(landing.title); descriptions.add(landing.description); headings.add(landing.question);
}
assert.equal(titles.size, Object.keys(pages).length);
assert.equal(descriptions.size, titles.size);
assert.equal(headings.size, titles.size);
assert.equal([...sitemap.matchAll(/<loc>/g)].length, titles.size + 1);
// Repository-authored strings are still escaped when injected into HTML or JSON-LD.
const escaped = context.applyLanding(template, '/example', { ...pages['/bank-loan'], question: 'A < B & "C"', intro: '<script>bad</script>' });
assert.ok(escaped.includes('<h1 id="hero-heading">A &lt; B &amp; &quot;C&quot;</h1>'));
assert.ok(!escaped.includes('<script>bad</script>'));
console.log(`Passed: ${titles.size} distinct server-rendered SEO pages, hero copy, schema, canonical URLs, sitemap, internal links, redirects, and escaping.`);
