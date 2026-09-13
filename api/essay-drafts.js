import { readFileSync } from 'node:fs';
import { authenticated, requireSameOrigin, SLUGS, blobStore, readDraft, saveDraft, EditorError } from '../lib/essay-editor.js';
const baselines = JSON.parse(readFileSync(new URL('../lib/essay-baselines.json', import.meta.url), 'utf8'));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!authenticated(req, process.env.ESSAY_EDITOR_KEY)) return res.status(401).json({error: 'Unlock the editor to read or save drafts.'});
  try {
    const slug = req.query?.slug;
    if (!SLUGS.includes(slug)) throw new EditorError(400, 'Choose an essay.');
    if (req.method === 'GET') {
      if (req.query.history === '1') return res.status(200).json({history: await blobStore.history(slug)});
      if (req.query.revision) {
        if (!/^[\dT-]+Z_[a-f0-9-]{36}$/.test(req.query.revision)) throw new EditorError(400, 'Invalid revision.');
        const old = await blobStore.read(`history/${slug}/${req.query.revision}.json`);
        if (!old) throw new EditorError(404, 'That version was not found.');
        return res.status(200).json({draft: old.value});
      }
      const draft = await readDraft(slug);
      return res.status(200).json({published: baselines[slug], draft: draft?.value || null});
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).end(); }
    requireSameOrigin(req);
    const draft = await saveDraft(slug, req.body || {}, baselines[slug]);
    return res.status(200).json({id: draft.id, updatedAt: draft.updatedAt});
  } catch (error) {
    if (!error.status) console.error('Essay storage failed:', error.name);
    return res.status(error.status || 502).json({error: error.status ? error.message : 'The draft could not be saved or loaded. Please try again.'});
  }
}
