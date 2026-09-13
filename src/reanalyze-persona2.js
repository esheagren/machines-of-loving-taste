// Reproduce the July persona reanalysis from committed observations; no API use.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { canonicalName, distribution, topNames, totalVariation, shuffledDistance, modelInterval, mean, rng } from './persona-stats.js';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(readFileSync(join(root, 'data', name), 'utf8'));
const observations = read('persona2-observations.json');
const rules = read('persona2-normalization.json').aliases, broadRules = read('aliases.json');
const { models, domains, probes, conditions } = observations;
const cells = new Map();
for (const [m, d, p, c, i, e, s] of observations.records) {
  const model = models[m], domain = domains[d], probe = probes[p], condition = conditions[c].slug;
  const key = [model, domain, probe, condition].join('|');
  if (!cells.has(key)) cells.set(key, { model, domain, probe, condition, samples: [], all: [], broad: [], unmerged: [], statuses: {} });
  const cell = cells.get(key), status = observations.statuses[s], entity = observations.entities[e];
  cell.statuses[status] = (cell.statuses[status] || 0) + 1;
  const name = status === 'named' ? canonicalName(domain, entity, rules) : null;
  if (name) {
    cell.samples.push(name);
    cell.broad.push(canonicalName(domain, canonicalName(domain, entity, broadRules), rules));
    cell.unmerged.push(canonicalName(domain, entity));
  }
  cell.all.push(name || '__' + status);
}
const comparisons = [], random = rng();
const get = (m, d, p, c) => cells.get([m, d, p, c].join('|'));
for (const cell of cells.values()) {
  if (cell.condition === 'none') continue;
  const base = get(cell.model, cell.domain, cell.probe, 'none');
  const assistant = get(cell.model, cell.domain, cell.probe, 'assistant');
  const eligible = [cell, base, assistant].every(c => c.samples.length >= 4);
  const tvNone = eligible ? totalVariation(cell.samples, base.samples) : null;
  const tvControl = eligible ? totalVariation(assistant.samples, base.samples) : null;
  comparisons.push({ model: cell.model, domain: cell.domain, probe: cell.probe, condition: cell.condition, n: cell.samples.length, baselineN: base.samples.length, assistantN: assistant.samples.length, eligible,
    tvNone, tvAssistant: eligible ? totalVariation(cell.samples, assistant.samples) : null,
    excessOverAssistant: eligible ? tvNone - tvControl : null,
    shuffledReference: eligible ? shuffledDistance(cell.samples, base.samples, 256, random) : null,
    allOutcomesExcess: totalVariation(cell.all, base.all) - totalVariation(assistant.all, base.all),
    broadAliasExcess: eligible ? totalVariation(cell.broad, base.broad) - totalVariation(assistant.broad, base.broad) : null,
    unmergedExcess: eligible ? totalVariation(cell.unmerged, base.unmerged) - totalVariation(assistant.unmerged, base.unmerged) : null });
}
const byCondition = conditions.filter(c => c.slug !== 'none').flatMap(condition => probes.map(probe => {
  const selected = comparisons.filter(c => c.condition === condition.slug && c.probe === probe && c.eligible);
  const byModel = models.map(model => {
    const xs = selected.filter(c => c.model === model);
    return { model, fields: xs.length, tvNone: mean(xs.map(c => c.tvNone)), tvAssistant: mean(xs.map(c => c.tvAssistant)), excessOverAssistant: mean(xs.map(c => c.excessOverAssistant)), shuffledReference: mean(xs.map(c => c.shuffledReference)) };
  });
  const summarize = metric => modelInterval(Object.fromEntries(models.map(model => [model, mean(selected.filter(c => c.model === model).map(c => c[metric]))])), 4000, rng());
  return { condition: condition.slug, label: condition.label, probe, eligibleCells: selected.length, possibleCells: models.length * domains.length, tvNone: mean(byModel.map(c => c.tvNone).filter(Number.isFinite)), tvAssistant: mean(byModel.map(c => c.tvAssistant).filter(Number.isFinite)), shuffledReference: mean(byModel.map(c => c.shuffledReference).filter(Number.isFinite)), contrast: summarize('excessOverAssistant'), broadAliasContrast: summarize('broadAliasExcess'), unmergedContrast: summarize('unmergedExcess'), allOutcomesContrast: modelInterval(Object.fromEntries(models.map(model => [model, mean(comparisons.filter(c => c.condition === condition.slug && c.probe === probe && c.model === model).map(c => c.allOutcomesExcess))])), 4000, rng()), byModel };
}));
const pools = conditions.flatMap(condition => domains.flatMap(domain => probes.map(probe => {
  const selected = models.map(model => get(model, domain, probe, condition.slug));
  const samples = selected.flatMap(c => c.samples), counts = distribution(samples);
  const agreements = [];
  for (let i = 0; i < selected.length; i++) for (let j = i + 1; j < selected.length; j++) {
    if (selected[i].samples.length < 4 || selected[j].samples.length < 4) continue;
    const a = distribution(selected[i].samples), b = distribution(selected[j].samples);
    agreements.push(Object.keys(a).reduce((sum, e) => sum + a[e] / selected[i].samples.length * (b[e] || 0) / selected[j].samples.length, 0));
  }
  return { condition: condition.slug, domain, probe, n: samples.length, attempted: selected.reduce((n, c) => n + c.all.length, 0), counts, pairAgreement: mean(agreements), byModel: selected.map(c => ({ model: c.model, n: c.samples.length, attempted: c.all.length, counts: distribution(c.samples), top: topNames(c.samples) })) };
})));
const output = { schemaVersion: 1, source: observations.source, observationsSha256: createHash('sha256').update(readFileSync(join(root, 'data/persona2-observations.json'))).digest('hex'), models, domains, conditions, methods: { primary: 'Total variation (TV) between complete named-answer distributions, conditional on a named answer. 0 = identical observed shares; 1 = no shared named answer. Minimum 4 named answers in treatment, none and assistant cells.', contrast: 'TV(treatment, none) minus TV(assistant, none), matched within model, field and question. Fields weighted equally within model; models weighted equally. Favorites and overrated analyzed separately. This contrast measures additional observed distance from the baseline, not a fraction of changed individual answers.', uncertainty: '4,000 seeded model-cluster bootstrap resamples for a descriptive 95% interval, plus leave-one-model-out range. Fields remain bundled with models. The selected panel is not a random sample; model families may be correlated. Intervals are not population-level guarantees.', finiteSample: '256 seeded label shuffles per treatment-none comparison, preserving both named sample sizes. Mean shuffled TV is an exchangeability reference, not a true-distance estimate or a hypothesis-test result.', sensitivity: 'Also report all outcomes including separate nonanswer statuses; unmerged spelling-normalized names; and broader Index aliases followed by conservative normalization. No single winner is chosen when modal names tie.', scope: 'Exploratory July 22 experiment; figure examples chosen after inspection. Role adoption and explanations not systematically scored. No activations measured. Conditions were not randomized during July collection. Dates and model labels do not guarantee fixed underlying provider versions.' }, byCondition, pools, comparisons, quotes: observations.quotes };
writeFileSync(join(root, 'data/persona2-reanalysis.json'), JSON.stringify(output, null, 2) + '\n');
const pp = n => (n * 100).toFixed(1);
let report = `# Persona experiment: July reanalysis\n\nReproduce with \`node src/reanalyze-persona2.js\`. The committed observations file contains all ${observations.source.completions.toLocaleString('en-US')} successful recorded completions, including empty responses. No API keys or local raw JSONL files are needed. Raw source hashes are recorded in the observations file.\n\n## Data audit\n\n${observations.source.originalExtractions} original extractions; ${observations.source.missingExtractions} omitted extractions. Recovered ${observations.source.recoveredExtractions} explicit answers by reading the raw responses; the other 71 omissions were empty completions. Reclassified ${observations.source.reviewedOffTask} phrase-analysis responses as off-task. Six answers incorrectly flagged as refusals still name a choice and are retained. No unknown values were imputed.\n\n| Outcome | Count |\n|---|---:|\n${Object.entries(observations.source.counts).map(([k, n]) => `| ${k} | ${n} |`).join('\n')}\n\nThe review decisions include raw source text in \`data/persona2-review.json\`. Name rules are in \`data/persona2-normalization.json\`. Fall and autumn merge; color shades, narrower cuisines and typeface editions remain distinct in the primary analysis. This is a conservative review, not an exhaustive validation of every named entity or every extraction.\n\n## Distribution comparisons\n\n${Object.values(output.methods).join('\n\n')}\n\nValues below are TV percentage points. Positive contrast means additional distance from the no-character distribution beyond the assistant control. Negative values are retained.\n\n| Condition | Question | TV vs none | Shuffled reference | Extra distance vs assistant [model-resampling interval] | Eligible cells |\n|---|---|---:|---:|---:|---:|\n`;
for (const c of byCondition) report += `| ${c.label} | ${c.probe} | ${pp(c.tvNone)} | ${pp(c.shuffledReference)} | ${pp(c.contrast.mean)} [${c.contrast.interval.map(pp).join(', ')}] | ${c.eligibleCells}/${c.possibleCells} |\n`;
report += '\n## Sensitivity of the focal contrasts\n\n| Condition | Question | Conservative aliases | No aliases | Index aliases | Include nonanswers | Leave-one-model-out range |\n|---|---|---:|---:|---:|---:|---:|\n';
for (const c of byCondition.filter(c => ['ghost', 'witch', 'banshee'].includes(c.condition))) report += `| ${c.label} | ${c.probe} | ${pp(c.contrast.mean)} | ${pp(c.unmergedContrast.mean)} | ${pp(c.broadAliasContrast.mean)} | ${pp(c.allOutcomesContrast.mean)} | ${c.contrast.leaveOneOut.map(pp).join(' to ')} |\n`;
report += '\n## Favorite cities: complete pooled distributions\n\nEach condition contains 96 calls (8 from each of 12 models). Counts below are named replies, not independent models. Pair agreement is the probability that one sampled answer from each of two different models names the same city, averaged over model pairs.\n';
for (const c of pools.filter(c => c.domain === 'city' && c.probe === 'favorite' && ['none', 'assistant', 'ghost', 'witch', 'banshee'].includes(c.condition))) report += `\n### ${c.condition}\n\n${c.n}/${c.attempted} named; cross-model pair agreement ${pp(c.pairAgreement)}%.\n\n${Object.entries(c.counts).map(([e, n]) => `${e}: ${n}`).join('; ')}.\n`;
report += '\n## Per-model focal comparisons\n\n| Model | Condition | Question | Eligible fields | Extra TV vs assistant |\n|---|---|---|---:|---:|\n';
for (const c of byCondition.filter(c => ['ghost', 'witch', 'banshee'].includes(c.condition))) for (const m of c.byModel) report += `| ${m.model} | ${c.condition} | ${c.probe} | ${m.fields} | ${pp(m.excessOverAssistant)} |\n`;
report += '\n## Interpretation and next experiment\n\nPersistent favorites and character-specific shared alternatives both occur. These observations do not establish prompt-independent preferences or a neural mechanism. City examples do not establish increased overall convergence: inspect pair agreement rather than inferring it from a new leading city. The broad high/low-consensus grouping is not used as a causal comparison because answer-space size and baseline concentration differ between fields.\n\nThe September follow-up protocol is frozen in `data/persona3-protocol.json`. Its neutral user prompts, wording variants, style control and explicit taste instruction address questions left unresolved here. Keep that run separate from July.\n';
writeFileSync(join(root, 'report/persona2-reanalysis.md'), report);
console.log(JSON.stringify({ counts: observations.source.counts, focal: byCondition.filter(c => ['ghost', 'witch', 'banshee'].includes(c.condition)).map(c => ({ condition: c.condition, probe: c.probe, extra: c.contrast, tvNone: c.tvNone, shuffled: c.shuffledReference })), cities: pools.filter(c => c.domain === 'city' && c.probe === 'favorite' && ['none', 'assistant', 'ghost', 'witch', 'banshee'].includes(c.condition)).map(c => ({ condition: c.condition, counts: c.counts, agreement: c.pairAgreement })) }, null, 2));
