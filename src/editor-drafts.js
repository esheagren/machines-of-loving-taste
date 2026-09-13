// Read the user's private /edit drafts. Never publishes or changes stored drafts.
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { SLUGS, readDraft } from '../lib/essay-editor.js';
const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(`${root}.env.local`)) process.loadEnvFile(`${root}.env.local`);
const published = JSON.parse(readFileSync(`${root}lib/essay-baselines.json`, 'utf8'));
const out = `${root}.vercel/essay-drafts`;
mkdirSync(out, {recursive:true});
function text(html) {
  const {document} = parseHTML(`<html><body>${html}</body></html>`);
  document.querySelectorAll('p,div,h1,h2,h3,li,blockquote').forEach(el => el.append('\n\n'));
  document.querySelectorAll('a').forEach(el => { if (el.getAttribute('href')) el.append(` (${el.getAttribute('href')})`); });
  document.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
  return document.body.textContent.replace(/\n{3,}/g, '\n\n').trim();
}
for (const slug of SLUGS) {
  const result = await readDraft(slug);
  if (!result) { console.log(`${slug}: no saved draft`); continue; }
  const draft = result.value;
  const changes = Object.entries(draft.regions).filter(([id, html]) => html !== draft.baseline.regions[id]);
  writeFileSync(`${out}/${slug}.json`, JSON.stringify(draft, null, 2));
  writeFileSync(`${out}/${slug}-draft.md`, `# ${draft.baseline.title}\n\nSaved: ${draft.updatedAt}\nRevision: ${draft.id}\n\n` + Object.values(draft.regions).map(text).join('\n\n'));
  writeFileSync(`${out}/${slug}-changes.md`, `# Changes: ${draft.baseline.title}\n\nSaved: ${draft.updatedAt}\nPublished edition changed since draft began: ${published[slug].version !== draft.baseline.version}\n\n` + changes.map(([id, html]) => `## ${id}\n\n### Before\n\n${text(draft.baseline.regions[id])}\n\n### After\n\n${text(html)}`).join('\n\n'));
  console.log(`${slug}: saved ${draft.updatedAt}, ${changes.length} changed sections\n  ${out}/${slug}-changes.md\n  ${out}/${slug}-draft.md`);
}
