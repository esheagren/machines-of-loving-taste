import { authenticated, equal, sessionCookie, requireSameOrigin, COOKIE, MIN_EDITOR_KEY_LENGTH, EditorError } from '../lib/essay-editor.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const key = process.env.ESSAY_EDITOR_KEY;
  if (!key || key.length < MIN_EDITOR_KEY_LENGTH) return res.status(503).json({error: 'The editor is not configured yet.'});
  try {
    if (req.method === 'GET') return res.status(200).json({authenticated: authenticated(req, key)});
    if (!['POST', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'GET, POST, DELETE'); return res.status(405).end(); }
    requireSameOrigin(req);
    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
      return res.status(200).json({authenticated: false});
    }
    if (!equal(req.body?.key, key)) throw new EditorError(401, 'That editor key was not recognized.');
    res.setHeader('Set-Cookie', sessionCookie(key));
    return res.status(200).json({authenticated: true});
  } catch (error) { return res.status(error.status || 500).json({error: error.status ? error.message : 'Could not unlock the editor.'}); }
}
