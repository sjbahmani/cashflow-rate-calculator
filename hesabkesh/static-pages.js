// Landing-page navigation for a plain static server. Production uses og.js.
import pages from './pages.js';

export default function prepareStaticPages() {
  if (document.body.dataset.rendered === 'server') return;
  const entry = new URL('./index.html', location.href);
  function prepareLinks() {
    document.querySelectorAll('.seo-content a[href^="/"]').forEach(link => {
      const path = new URL(link.getAttribute('href'), location.href).pathname;
      if (path !== '/' && !pages[path]) return;
      const target = new URL(entry.href);
      if (pages[path]) target.searchParams.set('page', path.slice(1));
      link.href = target.href;
    });
  }

  const page = new URLSearchParams(location.search).get('page');
  const path = '/' + page;
  if (!Object.prototype.hasOwnProperty.call(pages, path)) {
    prepareLinks();
    return;
  }
  const landing = pages[path];
  document.title = landing.title;
  document.getElementById('hero-heading').textContent = landing.question;
  document.querySelector('.hero-subtitle').textContent = landing.answer;
  document.querySelector('.hero-description').textContent = landing.intro;
  document.body.dataset.preset = landing.preset;
  const heading = document.getElementById('seo-title');
  const grid = document.querySelector('.seo-grid');
  let node = heading;
  while (node && node !== grid) {
    const next = node.nextSibling;
    node.remove();
    node = next;
  }
  // Trusted repository-authored markup, shared with the server renderer.
  grid.insertAdjacentHTML('beforebegin', landing.body);
  const canonical = 'https://hesabkesh.ir' + path;
  const schemaElement = document.getElementById('calculator-schema');
  const schema = JSON.parse(schemaElement.textContent);
  schema.name = landing.question + ' | حساب‌کش';
  schema.url = canonical;
  schema.description = landing.description;
  schemaElement.textContent = JSON.stringify(schema);
  document.querySelector('link[rel="canonical"]').href = canonical;
  for (const [selector, value] of [
    ['meta[name="description"]', landing.description],
    ['meta[property="og:title"]', landing.title],
    ['meta[property="og:description"]', landing.description],
    ['meta[property="og:url"]', canonical],
    ['meta[name="twitter:title"]', landing.title],
    ['meta[name="twitter:description"]', landing.description]
  ]) document.querySelector(selector).content = value;
  prepareLinks();
}
