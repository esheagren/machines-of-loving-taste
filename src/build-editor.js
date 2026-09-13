import { parseHTML } from 'linkedom';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { cleanHTML } from '../lib/essay-editor.js';

export function buildEditor(site, root) {
  const {document} = parseHTML(site);
  const baselines = {};
  for (const [slug, id] of [['ghost-in-kyoto', 'research'], ['shared-canon', 'shared-canon']]) {
    const article = document.querySelector(`#${id} article`).cloneNode(true);
    const title = article.querySelector('h1').textContent;
    article.querySelector('.article-back')?.remove();
    article.querySelectorAll('a[href^="#/"]').forEach(a => a.setAttribute('href', '/' + a.getAttribute('href')));
    const version = createHash('sha256').update(article.outerHTML).digest('hex').slice(0, 20);
    const regions = {};
    let count = 0;
    function collect(container) {
      let region = null;
      for (const child of [...container.children]) {
      if (child.classList.contains('ghost-opening')) { region = null; collect(child); continue; }
      if (/^(P|H1|H2|H3)$/.test(child.tagName) && !child.classList.contains('rs-kicker')) {
        if (!region) {
          region = document.createElement('div');
          region.className = 'editor-region';
          region.dataset.region = `text-${++count}`;
          container.insertBefore(region, child);
        }
        region.appendChild(child);
      } else { region = null; child.classList.add('editor-fixed'); }
      }
    }
    collect(article);
    article.querySelectorAll('[data-region]').forEach(el => {
      el.innerHTML = cleanHTML(el.innerHTML);
      regions[el.dataset.region] = el.innerHTML;
    });
    baselines[slug] = {slug, title, version, template: article.outerHTML, regions};
  }
  mkdirSync(`${root}/lib`, {recursive: true});
  mkdirSync(`${root}/public/editor`, {recursive: true});
  writeFileSync(`${root}/lib/essay-baselines.json`, JSON.stringify(baselines));
  writeFileSync(`${root}/public/editor/site.css`, document.querySelector('style').textContent);
  writeFileSync(`${root}/public/edit.html`, readFileSync(`${root}/src/editor.html`, 'utf8'));
  console.log('Essay editor built: two essays, with editable prose and original figures.');
}
