import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import sanitize from './sanitize.cjs';
import { get, put, list, BlobPreconditionFailedError } from '@vercel/blob';

export const SLUGS = ['ghost-in-kyoto', 'shared-canon'];
export const COOKIE = 'molt_editor';
const MAX_AGE = 60 * 60 * 24 * 30;
export class EditorError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function signature(value, key) { return createHmac('sha256', key).update(value).digest('base64url'); }
export function sessionCookie(key, now = Date.now()) {
  const expiry = String(Math.floor(now / 1000) + MAX_AGE);
  return `${COOKIE}=${expiry}.${signature(expiry, key)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}
export function authenticated(req, key, now = Date.now()) {
  if (!key || key.length < 32) return false;
  const value = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  const [expiry, signed] = (value || '').split('.');
  return /^\d{10}$/.test(expiry || '') && Number(expiry) > now / 1000 && equal(signed, signature(expiry, key));
}
export function requireSameOrigin(req) {
  const allowed = ['https://machinesoflovingtaste.com', 'https://www.machinesoflovingtaste.com'];
  if (process.env.NODE_ENV !== 'production') allowed.push('http://127.0.0.1:8766', 'http://localhost:8766');
  if (!allowed.includes(req.headers.origin)) throw new EditorError(403, 'Open the editor on machinesoflovingtaste.com.');
  if (!req.headers['content-type']?.startsWith('application/json')) throw new EditorError(415, 'Send JSON.');
}
export function cleanHTML(html) {
  return sanitize(html, {
    allowedTags: ['p', 'div', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'a', 'br', 'ul', 'ol', 'li', 'blockquote', 'sup', 'sub'],
    allowedAttributes: { a: ['href', 'target', 'rel'], '*': ['class'] },
    allowedClasses: { '*': ['rs-title', 'rs-standfirst', 'rs-p', 'rs-crosshead'] },
    allowedSchemes: ['https', 'http'], allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attrs) => ({tagName, attribs: {href: attrs.href || '', target: '_blank', rel: 'noopener noreferrer'}}),
    },
  });
}
export function validateRegions(regions, baseline) {
  if (!regions || typeof regions !== 'object' || Array.isArray(regions)) throw new EditorError(400, 'The draft is missing its text.');
  const keys = Object.keys(baseline.regions);
  if (Object.keys(regions).length !== keys.length || keys.some(k => typeof regions[k] !== 'string')) throw new EditorError(400, 'The essay sections do not match. Reload the editor.');
  if (JSON.stringify(regions).length > 300_000) throw new EditorError(413, 'This draft is too large.');
  return Object.fromEntries(keys.map(k => [k, cleanHTML(regions[k])]));
}

const options = { access: 'private', addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 };
const storagePath = path => `${process.env.ESSAY_DRAFT_NAMESPACE || ''}${path}`;
export const blobStore = {
  async read(path) {
    // Compression produces weak ETags, which cannot authorize conditional writes.
    const result = await get(storagePath(path), { access: 'private', useCache: false, headers: {'Accept-Encoding': 'identity'} });
    return result ? {value: await new Response(result.stream).json(), etag: result.blob.etag} : null;
  },
  async write(path, value, etag) {
    try {
      return await put(storagePath(path), JSON.stringify(value), {...options, allowOverwrite: Boolean(etag), ...(etag ? {ifMatch: etag} : {})});
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError || /already exists/i.test(error.message)) throw new EditorError(409, 'A newer draft was saved elsewhere. Download your text, then reload to compare.');
      throw error;
    }
  },
  async history(slug) {
    const blobs = []; let cursor;
    do {
      const result = await list({prefix: storagePath(`history/${slug}/`), limit: 1000, cursor});
      blobs.push(...result.blobs); cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);
    return blobs.map(b => ({key: b.pathname.split('/').pop().replace('.json', '')})).sort((a,b) => b.key.localeCompare(a.key)).slice(0, 30);
  },
};
export async function readDraft(slug, store = blobStore) { return store.read(`drafts/${slug}.json`); }
export async function saveDraft(slug, input, published, store = blobStore) {
  const current = await readDraft(slug, store);
  if ((input.revision || null) !== (current?.value.id || null)) throw new EditorError(409, 'A newer draft was saved elsewhere. Download your text, then reload to compare.');
  // A draft retains the exact published edition it started from, including figures.
  const baseline = current?.value.baseline || published;
  if (input.version !== baseline.version) throw new EditorError(409, 'The published essay changed. Reload before starting a draft.');
  const regions = validateRegions(input.regions, baseline);
  if (current && JSON.stringify(regions) === JSON.stringify(current.value.regions)) return current.value;
  if (current) {
    try { await store.write(`history/${slug}/${current.value.id}.json`, current.value); }
    catch (error) { if (error.status !== 409) throw error; }
  }
  const updatedAt = new Date().toISOString();
  const next = {schema: 1, slug, id: `${updatedAt.replace(/[:.]/g, '-')}_${randomUUID()}`, parent: current?.value.id || null, updatedAt, baseline, regions};
  await store.write(`drafts/${slug}.json`, next, current?.etag);
  return next;
}
