import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { authenticated, sessionCookie, cleanHTML, saveDraft, validateRegions, EditorError, requireSameOrigin } from '../lib/essay-editor.js';
import session from '../api/editor-session.js';
const baseline = {version:'v1', title:'An essay', template:'<article></article>', regions:{intro:'<p>Hello</p>', end:'<p>The end</p>'}};
const input = {version:'v1', revision:null, regions:baseline.regions};
function memoryStore() {
  const records = new Map(); let serial = 0;
  return {
    records,
    async read(path) { return structuredClone(records.get(path) || null); },
    async write(path, value, etag) {
      const old = records.get(path);
      if ((old && old.etag !== etag) || (!old && etag)) throw new EditorError(409, 'Conflict');
      const next = {value:structuredClone(value),etag:String(++serial)}; records.set(path,next); return next;
    },
  };
}
test('editor session resists tampering, expires, and is private', () => {
  const key = 'a'.repeat(43), now = 1_800_000_000_000;
  const cookie = sessionCookie(key, now);
  assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/);
  assert.equal(authenticated({headers:{cookie}}, key, now), true);
  assert.equal(authenticated({headers:{cookie:cookie.replace(/\d{10}/, '1999999999')}}, key, now), false);
  assert.equal(authenticated({headers:{cookie}}, 'b'.repeat(43), now), false);
  assert.equal(authenticated({headers:{cookie}}, key, now + 31*86400_000), false);
  assert.equal(authenticated({headers:{}}, key, now), false);
  assert.equal(authenticated({headers:{cookie}}, '', now), false);
});
test('mutations reject cross-origin and non-JSON requests', () => {
  assert.throws(() => requireSameOrigin({headers:{origin:'https://evil.example','content-type':'application/json'}}), {status:403});
  assert.throws(() => requireSameOrigin({headers:{origin:'https://machinesoflovingtaste.com','content-type':'text/plain'}}), {status:415});
  assert.doesNotThrow(() => requireSameOrigin({headers:{origin:'https://machinesoflovingtaste.com','content-type':'application/json'}}));
});
test('session endpoint accepts the key and rejects incorrect or cross-origin logins', async () => {
  const old = process.env.ESSAY_EDITOR_KEY; process.env.ESSAY_EDITOR_KEY = 'k'.repeat(43);
  const run = async (body,origin) => {
    const res = {headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(body){this.body=body;return this;}};
    await session({method:'POST',headers:{origin,'content-type':'application/json'},body},res);return res;
  };
  try {
    assert.equal((await run({key:'wrong'}, 'https://machinesoflovingtaste.com')).code,401);
    assert.equal((await run({key:process.env.ESSAY_EDITOR_KEY}, 'https://evil.example')).code,403);
    const result = await run({key:process.env.ESSAY_EDITOR_KEY},'https://machinesoflovingtaste.com');
    assert.equal(result.code,200); assert.match(result.headers['Set-Cookie'],/HttpOnly/); assert.equal(result.headers['Cache-Control'],'private, no-store');
  } finally { if (old === undefined) delete process.env.ESSAY_EDITOR_KEY; else process.env.ESSAY_EDITOR_KEY = old; }
});
test('stored prose cannot introduce scripts, event handlers, styling or dangerous links', () => {
  const result = cleanHTML('<p onclick="alert(1)" style="display:none">Hello <em>world</em><script>steal()</script><img src=x onerror=steal()><a href="javascript:steal()">bad</a><a href="https://example.org">good</a></p>');
  assert.doesNotMatch(result,/onclick|style=|script|steal|<img|javascript:/);
  assert.match(result,/<em>world<\/em>/); assert.match(result,/href="https:\/\/example.org"/); assert.match(result,/noopener noreferrer/);
  assert.equal(cleanHTML(result),result);
});
test('a save cannot drop or invent prose regions and has a size limit', () => {
  assert.throws(()=>validateRegions({intro:'<p>x</p>'},baseline),{status:400});
  assert.throws(()=>validateRegions({...baseline.regions,extra:'x'},baseline),{status:400});
  assert.throws(()=>validateRegions({...baseline.regions,intro:'x'.repeat(300_001)},baseline),{status:413});
});
test('saved drafts round-trip, preserve previous versions, and survive publication changes', async () => {
  const store = memoryStore();
  const first = await saveDraft('ghost-in-kyoto',input,baseline,store);
  const second = await saveDraft('ghost-in-kyoto',{...input,revision:first.id,regions:{...baseline.regions,intro:'<p>Revised.</p>'}},{...baseline,version:'v2'},store);
  assert.equal((await store.read('drafts/ghost-in-kyoto.json')).value.regions.intro,'<p>Revised.</p>');
  assert.equal((await store.read(`history/ghost-in-kyoto/${first.id}.json`)).value.regions.intro,'<p>Hello</p>');
  assert.equal(second.baseline.version,'v1'); assert.equal(second.parent,first.id);
  await assert.rejects(saveDraft('ghost-in-kyoto',{...input,revision:first.id},baseline,store),{status:409});
});
test('simultaneous first saves and simultaneous updates cannot overwrite each other', async () => {
  const store = memoryStore();
  const initial = await Promise.allSettled([saveDraft('shared-canon',input,baseline,store),saveDraft('shared-canon',input,baseline,store)]);
  assert.equal(initial.filter(r=>r.status==='fulfilled').length,1);
  const first = (await store.read('drafts/shared-canon.json')).value;
  const edits = ['One','Two'].map(word=>saveDraft('shared-canon',{...input,revision:first.id,regions:{...baseline.regions,intro:`<p>${word}</p>`}},baseline,store));
  const results = await Promise.allSettled(edits);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await store.read(`history/shared-canon/${first.id}.json`)).value.id,first.id);
});
test('storage failures do not falsely acknowledge a save', async () => {
  const store = {read:async()=>null,write:async()=>{throw new Error('Disconnected');}};
  await assert.rejects(saveDraft('shared-canon',input,baseline,store),/Disconnected/);
});
test('generated essays preserve figures and source quotations outside editable regions', () => {
  const baselines = JSON.parse(readFileSync(new URL('../lib/essay-baselines.json',import.meta.url),'utf8'));
  for (const b of Object.values(baselines)) {
    const {document} = parseHTML(b.template);
    const regions = [...document.querySelectorAll('[data-region]')];
    assert.equal(regions.length,Object.keys(b.regions).length);
    assert.ok(regions.some(el=>el.querySelector('h1')));
    for (const el of regions) {assert.equal(el.innerHTML,b.regions[el.dataset.region]);assert.equal(el.querySelector('figure,svg,.ghost-quote-pair,details'),null);}
  }
  assert.match(baselines['ghost-in-kyoto'].template,/assistant-axis-figure/);
  assert.match(baselines['ghost-in-kyoto'].template,/My name is Evelyn Carter/);
  assert.ok(Object.values(baselines['ghost-in-kyoto'].regions).some(html=>html.includes('Ask a dozen people')));
});
