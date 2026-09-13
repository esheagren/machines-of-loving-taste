import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalName } from './persona-stats.js';
const data = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const bytes = readFileSync(join(data, 'raw-persona3.jsonl'));
const raw = bytes.toString().split('\n').filter(Boolean).map(JSON.parse);
const protocolBytes = readFileSync(join(data, 'persona3-protocol.json'));
const protocol = JSON.parse(protocolBytes), protocolHash = createHash('sha256').update(protocolBytes).digest('hex');
const review = JSON.parse(readFileSync(join(data, 'persona3-name-review.json')));
const lookup = new Map(review.entries.map(e => [e.domain + '|' + e.firstLine, e]));
const seen = new Set();
const records = raw.filter(r => !r.error).map(r => {
  if (r.protocolHash !== protocolHash) throw new Error('Protocol hash mismatch');
  if (seen.has(r.key)) throw new Error('Duplicate completion: ' + r.key); seen.add(r.key);
  const first = r.text.trim().split('\n')[0].replace(/^[#\s]+/, '').replaceAll('**', '').trim();
  const reviewed = lookup.get(r.domain + '|' + first);
  if (r.text.trim() && !reviewed) throw new Error('Unreviewed answer: ' + r.key);
  if (reviewed?.sourceKey === r.key && reviewed.sourceText && reviewed.sourceText !== r.text.trim()) throw new Error('Review text mismatch');
  const entity = canonicalName(r.domain, reviewed?.entity);
  return { key: r.key, model: r.model, domain: r.domain, condition: r.persona, systemVariant: r.systemVariant, questionVariant: r.questionVariant, sample: r.i, entity, status: entity ? 'named' : 'empty_response',
    festivalInsteadOfSeason: r.domain === 'season' && ['halloween', 'samhain'].includes(entity),
    fictionalCity: r.domain === 'city' && entity === 'gotham',
    text: r.text, startedAt: r.startedAt, ts: r.ts, resolvedModel: r.resolvedModel, stop: r.stop, usage: r.usage };
});
if (records.length !== 1512) throw new Error('Follow-up is incomplete: ' + records.length);
for (const m of protocol.models) for (const d of Object.keys(protocol.domains)) for (const c of protocol.conditions) for (let s=0;s<2;s++) for(let q=0;q<2;q++) for(let i=0;i<6;i++) {
  if (!seen.has([m.id,d,c.slug,s,q,i].join('|'))) throw new Error('Missing planned cell');
}
const dates = records.map(r=>r.ts).sort();
const result = { schemaVersion: 1, protocolHash, rawSha256: createHash('sha256').update(bytes).digest('hex'), source: { dates: [dates[0], dates.at(-1)], completions: records.length, errorRecords: raw.filter(r=>r.error).length, reviewedNameForms: review.entries.length, named: records.filter(r=>r.entity).length, festivals: records.filter(r=>r.festivalInsteadOfSeason).length, fictionalCities: records.filter(r=>r.fictionalCity).length, resolvedModels: [...new Set(records.map(r=>r.resolvedModel))] }, records };
writeFileSync(join(data, 'persona3-observations.json'), JSON.stringify(result) + '\n');
console.log(result.source);
