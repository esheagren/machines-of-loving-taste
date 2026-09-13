// One-time audit from local raw files. Reanalysis itself uses the committed,
// compact observations file and needs neither private JSONL files nor API keys.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const data = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const read = name => JSON.parse(readFileSync(join(data, name), 'utf8'));
const files = ['raw-persona2.jsonl', ...readdirSync(data).filter(f => /^rp2-extract\d+\.jsonl$/.test(f)).sort()];
const sourceHashes = {};
const jsonl = file => { const bytes = readFileSync(join(data, file)); sourceHashes[file] = createHash('sha256').update(bytes).digest('hex'); return bytes.toString().split('\n').filter(Boolean).map(JSON.parse); };
const attempts = jsonl(files[0]);
const successful = new Map();
for (const row of attempts.filter(r => !r.error)) { if (successful.has(row.key)) throw new Error('Duplicate successful call: ' + row.key); successful.set(row.key, row); }
const extracted = new Map();
for (const row of files.slice(1).flatMap(jsonl)) { if (extracted.has(row.key)) throw new Error('Duplicate extraction: ' + row.key); if (!successful.has(row.key)) throw new Error('Orphan extraction: ' + row.key); extracted.set(row.key, row); }
const review = new Map(read('persona2-review.json').entries.map(r => [r.key, r]));
const archive = read('persona2-summary.json');
const models = archive.panel, domains = archive.domains, probes = ['favorite', 'overrated'];
const conditions = read('personas2.json').conditions;
const statuses = ['named', 'refusal', 'no_named_answer', 'empty_response', 'missing_extraction', 'off_task'];
const entities = [], entityIds = new Map();
const entityId = entity => { if (entity == null) return -1; if (!entityIds.has(entity)) { entityIds.set(entity, entities.length); entities.push(entity); } return entityIds.get(entity); };
const counts = Object.fromEntries(statuses.map(s => [s, 0]));
const records = [];
let missingExtractions = 0, namedWithDisclaimerFlag = 0;
for (const model of models) for (const domain of domains) for (const probe of probes) for (const condition of conditions) for (let i = 0; i < 8; i++) {
  const key = [model, domain, probe, condition.slug, i].join('|');
  const raw = successful.get(key);
  if (!raw) throw new Error('Missing successful call: ' + key);
  const ext = extracted.get(key), edit = review.get(key);
  if (!ext) missingExtractions++;
  if (edit && edit.text !== raw.text) throw new Error('Review source mismatch: ' + key);
  let entity = edit ? edit.entity : ext?.entity || null;
  let status = !raw.text.trim() ? 'empty_response' : edit?.status || (entity ? 'named' : !ext ? 'missing_extraction' : ext.refused ? 'refusal' : 'no_named_answer');
  if (status !== 'named') entity = null;
  if (status === 'named' && ext?.refused) namedWithDisclaimerFlag++;
  counts[status]++;
  records.push([models.indexOf(model), domains.indexOf(domain), probes.indexOf(probe), conditions.indexOf(condition), i, entityId(entity), statuses.indexOf(status)]);
}
if (records.length !== successful.size) throw new Error('Unexpected successful keys outside design');
const quotes = ['assistant', 'witch', 'ghost'].map(condition => {
  const key = `gpt-5.2|city|favorite|${condition}|0`;
  return { key, model: 'gpt-5.2', condition, text: successful.get(key).text };
});
const timestamps = [...successful.values()].map(r => r.ts).sort();
const out = { schemaVersion: 1, columns: ['model', 'domain', 'probe', 'condition', 'sample', 'entity', 'status'], encoding: 'Indices refer to the dictionaries below; entity -1 means no named answer. Each record is one successful API completion, including empty completions.', models, domains, probes, conditions, statuses, entities, source: { dates: [timestamps[0], timestamps.at(-1)], hashes: sourceHashes, attempts: attempts.length, errorAttempts: attempts.filter(r => r.error).length, completions: successful.size, originalExtractions: extracted.size, missingExtractions, recoveredExtractions: [...review.values()].filter(r => r.status === 'named').length, reviewedOffTask: counts.off_task, namedWithDisclaimerFlag, counts }, quotes, records };
writeFileSync(join(data, 'persona2-observations.json'), JSON.stringify(out) + '\n');
console.log(JSON.stringify(out.source, null, 2));
