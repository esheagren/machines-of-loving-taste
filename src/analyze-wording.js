// Prompt-wording analysis. The in-run baseline is the 'aesthetic' arm (the
// Index's own prompt, re-collected in the same grid). For each other arm:
//   1. panel agreement per category — how many models share the leading pick
//   2. canon survival — how many models still lead with the aesthetic arm's pick
//   3. movement — total-variation distance from each model's aesthetic
//      distribution, averaged, with a model-resampling interval and a
//      split-half noise reference from the aesthetic arm itself
//   4. diversity and nonanswers by arm
// Reads data/extracted-wording.jsonl (extract.js with RAW_IN/EXTRACT_OUT);
// writes data/wording-summary.json.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PANEL_IDS, EXP_DOMAINS, WORDINGS } from './collect-wording.js';

const here = dirname(fileURLToPath(import.meta.url));
const DATA = join(here, '..', 'data');
const IN = join(DATA, 'extracted-wording.jsonl');
const OUT = join(DATA, 'wording-summary.json');

const norm = (s) => s?.replace(/[*"“”]/g, '').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /i, '').toLowerCase() ?? null;
const aliases = existsSync(join(DATA, 'aliases.json')) ? JSON.parse(readFileSync(join(DATA, 'aliases.json'), 'utf8')) : {};
const canon = (domain, n) => (n && aliases[domain]?.[n]) || n;

const ARMS = Object.keys(WORDINGS);
const BASE = 'aesthetic';
const HIGH = ['season', 'country', 'smell', 'city', 'cuisine', 'religioustext'];

const rows = readFileSync(IN, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  .map((r) => ({ ...r, wording: r.key.split('|')[2] }))
  .filter((r) => PANEL_IDS.includes(r.model) && EXP_DOMAINS.includes(r.domain) && ARMS.includes(r.wording));
console.log(`${rows.length} extracted replies`);

// cell: model|domain|arm -> canonical picks (null = no named pick)
const cells = new Map();
for (const r of rows) {
  const k = `${r.model}|${r.domain}|${r.wording}`;
  if (!cells.has(k)) cells.set(k, []);
  cells.get(k).push(r.entity && !r.refused ? canon(r.domain, norm(r.entity)) : null);
}
const dist = (arr) => {
  const named = arr.filter(Boolean), t = new Map();
  for (const e of named) t.set(e, (t.get(e) ?? 0) + 1);
  return { p: new Map([...t].map(([e, c]) => [e, c / named.length])), n: named.length, total: arr.length, distinct: t.size };
};
const modes = (d) => { const top = Math.max(0, ...d.p.values()); return [...d.p].filter(([, v]) => v === top).map(([e]) => e); };
const tv = (a, b) => { let s = 0; for (const e of new Set([...a.p.keys(), ...b.p.keys()])) s += Math.abs((a.p.get(e) ?? 0) - (b.p.get(e) ?? 0)); return s / 2; };
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
const fmt = (v, w = 7) => (v == null ? '--' : (typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(3) : String(v))).padStart(w);
const MIN = Number(process.env.MIN_NAMED ?? 4); // named replies a cell needs to count

// 1 + 2. Agreement and canon survival per category per arm
console.log('\n=== Agreement: leading pick and models sharing it (of models with enough named replies) ===\n');
const agreement = {};
for (const d of EXP_DOMAINS) {
  agreement[d] = {};
  const line = [d.padEnd(14)];
  for (const arm of ARMS) {
    const lead = new Map(); let avail = 0;
    for (const m of PANEL_IDS) {
      const c = cells.get(`${m}|${d}|${arm}`); if (!c) continue;
      const dd = dist(c); if (dd.n < MIN) continue;
      avail++;
      for (const e of modes(dd)) lead.set(e, (lead.get(e) ?? 0) + 1);
    }
    const [pick, n] = [...lead].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? [null, 0];
    agreement[d][arm] = { pick, n, avail, leaders: Object.fromEntries(lead) };
    line.push(`${arm}: ${pick ?? '--'} ${n}/${avail}`.padEnd(34));
  }
  console.log(line.join(' '));
}
console.log('\n=== Canon survival: models still leading with the aesthetic arm\'s pick ===\n');
const survival = {};
for (const d of EXP_DOMAINS) {
  const basePick = agreement[d][BASE].pick; survival[d] = { pick: basePick };
  const line = [d.padEnd(14), (basePick ?? '--').padEnd(28)];
  for (const arm of ARMS) {
    const n = agreement[d][arm].leaders[basePick] ?? 0;
    survival[d][arm] = { n, avail: agreement[d][arm].avail };
    line.push(`${arm} ${n}/${agreement[d][arm].avail}`.padEnd(16));
  }
  console.log(line.join(' '));
}

// 3. Movement from the aesthetic arm, per model x domain; model-resampled interval
console.log('\n=== Movement from the aesthetic arm (total-variation distance, 0 = same answers, 1 = no overlap) ===\n');
const perModel = {}; // arm -> model -> { all, high, low }
const noise = []; // split-half TV within the aesthetic arm
for (const m of PANEL_IDS) for (const d of EXP_DOMAINS) {
  const base = cells.get(`${m}|${d}|${BASE}`); if (!base || dist(base).n < MIN) continue;
  const b = dist(base);
  const half = base.filter((_, i) => i % 2 === 0), other = base.filter((_, i) => i % 2 === 1);
  if (dist(half).n >= 2 && dist(other).n >= 2) noise.push(tv(dist(half), dist(other)));
  for (const arm of ARMS) {
    if (arm === BASE) continue;
    const c = cells.get(`${m}|${d}|${arm}`); if (!c || dist(c).n < MIN) continue;
    (perModel[arm] ??= {})[m] ??= { all: [], high: [], low: [] };
    const v = tv(b, dist(c));
    perModel[arm][m].all.push(v); perModel[arm][m][HIGH.includes(d) ? 'high' : 'low'].push(v);
  }
}
const resample = (arm, which, draws = 2000) => {
  const ms = Object.keys(perModel[arm] ?? {}).filter((m) => perModel[arm][m][which].length);
  if (!ms.length) return null;
  const modelMeans = ms.map((m) => mean(perModel[arm][m][which]));
  const point = mean(modelMeans), sims = [];
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < draws; k++) sims.push(mean(Array.from({ length: ms.length }, () => modelMeans[Math.floor(rnd() * ms.length)])));
  sims.sort((a, b) => a - b);
  return { mean: point, lo: sims[Math.floor(draws * 0.025)], hi: sims[Math.floor(draws * 0.975)], models: ms.length };
};
console.log('arm'.padEnd(12), '    all', ' [95% model-resampled]', '   high', '    low');
const movement = {};
for (const arm of ARMS) {
  if (arm === BASE) continue;
  const a = resample(arm, 'all'), h = resample(arm, 'high'), l = resample(arm, 'low');
  movement[arm] = { all: a, high: h, low: l };
  console.log(arm.padEnd(12), fmt(a?.mean), `[${fmt(a?.lo, 6)} ${fmt(a?.hi, 6)}]`, fmt(h?.mean), fmt(l?.mean));
}
const noiseRef = noise.length ? mean(noise) : null;
console.log(`split-half noise within the aesthetic arm: ${noiseRef == null ? '--' : noiseRef.toFixed(3)} (what sampling alone produces at these sizes)`);

// 4. Diversity and nonanswers by arm
console.log('\n=== Diversity and nonanswers by arm ===\n');
console.log('arm'.padEnd(12), 'modal share', 'distinct/cell', 'panel-distinct/domain', 'no-pick rate');
const diversity = {};
for (const arm of ARMS) {
  const shares = [], distinct = [], panelDistinct = [], nopick = [];
  for (const d of EXP_DOMAINS) {
    const all = new Set();
    for (const m of PANEL_IDS) {
      const c = cells.get(`${m}|${d}|${arm}`); if (!c) continue;
      const dd = dist(c); nopick.push((dd.total - dd.n) / dd.total);
      if (dd.n) { shares.push(Math.max(...dd.p.values())); distinct.push(dd.distinct); for (const e of dd.p.keys()) all.add(e); }
    }
    panelDistinct.push(all.size);
  }
  diversity[arm] = { modalShare: mean(shares), distinctPerCell: mean(distinct), panelDistinctPerDomain: mean(panelDistinct), noPickRate: mean(nopick) };
  console.log(arm.padEnd(12), fmt(diversity[arm].modalShare, 11), fmt(diversity[arm].distinctPerCell, 13), fmt(diversity[arm].panelDistinctPerDomain, 21), fmt(diversity[arm].noPickRate, 12));
}

writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), panel: PANEL_IDS, domains: EXP_DOMAINS, arms: ARMS, baseline: BASE,
  minNamed: MIN, agreement, survival, movement, noiseRef, diversity, replies: rows.length }, null, 2));
console.log(`\nsummary written: ${OUT}`);
