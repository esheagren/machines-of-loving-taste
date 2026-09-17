// Extraction grounding check. Haiku occasionally records a pick that appears
// nowhere in the reply (seen: a reply beginning "Tokyo." extracted as
// "Istanbul"). This drops any extracted row whose entity is not grounded in
// the reply text, so a re-run of extract.js (resumable by key) re-extracts
// just those rows — run it with EXTRACT_BATCH=1 so each is read on its own.
//
// Usage: RAW_IN=data/raw-wording.jsonl EXTRACT_OUT=data/extracted-wording.jsonl node src/recheck-extract.js
// Grounded = at least one token of the entity (4+ letters, diacritics folded)
// occurs in the reply, or the entity is a number/date/short name found verbatim.

import { readFileSync, writeFileSync } from 'node:fs';

const RAW = process.env.RAW_IN, OUT = process.env.EXTRACT_OUT;
if (!RAW || !OUT) { console.error('set RAW_IN and EXTRACT_OUT'); process.exit(1); }
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const text = new Map(readFileSync(RAW, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.text).map((r) => [r.key, fold(r.text)]));
const rows = readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const grounded = (r) => {
  if (!r.entity) return true; // refusals and nulls are not the failure mode here
  const t = text.get(r.key); if (!t) return true;
  const e = fold(r.entity);
  if (t.includes(e)) return true;
  const tokens = e.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  return tokens.length ? tokens.some((w) => t.includes(w)) : t.includes(e.replace(/[^a-z0-9]/g, ''));
};
const DRY = process.env.DRY_RUN === '1'; // report only, rewrite nothing
const keep = rows.filter(grounded), dropped = rows.filter((r) => !grounded(r));
for (const r of dropped) console.log(`ungrounded: ${r.key} -> ${JSON.stringify(r.entity)}`);
if (!DRY) writeFileSync(OUT, keep.map((r) => JSON.stringify(r)).join('\n') + (keep.length ? '\n' : ''));
console.log(`${rows.length} rows, ${dropped.length} dropped for re-extraction, ${keep.length} kept`);
