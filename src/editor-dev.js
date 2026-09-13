// Local preview of the same API handlers used in production, with separate drafts.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
process.env.NODE_ENV = 'development';
process.env.ESSAY_DRAFT_NAMESPACE = 'development/';
const {default: session} = await import('../api/editor-session.js');
const {default: drafts} = await import('../api/essay-drafts.js');
const root = resolve('public');
const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml'};
createServer(async (req,res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8766');
  res.status = code => {res.statusCode=code; return res;};
  res.json = data => {res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data));};
  try {
    if (url.pathname === '/open-editor') {
      const target = url.searchParams.get('production') === '1' ? 'https://machinesoflovingtaste.com' : 'http://127.0.0.1:8766';
      res.setHeader('Location', `${target}/edit#key=${process.env.ESSAY_EDITOR_KEY}`);
      res.setHeader('Cache-Control','no-store');
      return res.status(302).end();
    }
    if (url.pathname.startsWith('/api/')) {
      req.query = Object.fromEntries(url.searchParams);
      let body = '';
      for await (const chunk of req) {body += chunk; if (body.length > 400_000) {res.status(413).end(); return;}}
      req.body = body ? JSON.parse(body) : {};
      if (url.pathname === '/api/editor-session') return await session(req,res);
      if (url.pathname === '/api/essay-drafts') return await drafts(req,res);
      return res.status(404).end();
    }
    const path = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname === '/edit' ? '/edit.html' : url.pathname));
    if (!path.startsWith(root + '/') || !(await stat(path)).isFile()) return res.status(404).end();
    res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    res.setHeader('Cache-Control','no-store'); res.end(await readFile(path));
  } catch { res.status(500).end('Local preview error'); }
}).listen(8766,'127.0.0.1',()=>console.log('Essay editor: http://127.0.0.1:8766/edit (separate development drafts)'));
