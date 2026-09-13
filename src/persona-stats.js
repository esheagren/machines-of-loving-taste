// Pure statistics shared by the reproducible persona analysis and its fixtures.
export const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
export function normalizeName(value) {
  return value?.normalize('NFC').replace(/[*"“”]/g, '').replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /i, '').toLowerCase() || null;
}
export function canonicalName(domain, value, aliases = {}) {
  let name = normalizeName(value);
  const seen = new Set();
  while (name && aliases[domain]?.[name] && !seen.has(name)) {
    seen.add(name);
    name = normalizeName(aliases[domain][name]);
  }
  return name;
}
export function distribution(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return Object.fromEntries([...counts].sort(([a, n], [b, m]) => m - n || a.localeCompare(b)));
}
export function topNames(values) {
  const counts = distribution(values), maximum = Math.max(0, ...Object.values(counts));
  return Object.keys(counts).filter(name => counts[name] === maximum);
}
export function totalVariation(a, b) {
  if (!a.length || !b.length) return null;
  const ac = distribution(a), bc = distribution(b);
  return [...new Set([...Object.keys(ac), ...Object.keys(bc)])]
    .reduce((sum, key) => sum + Math.abs((ac[key] || 0) / a.length - (bc[key] || 0) / b.length), 0) / 2;
}
export function rng(seed = 20260912) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function shuffled(values, random) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
// A finite-sample reference: under exchangeability, how much apparent distance
// occurs just by splitting the pooled answers into the ORIGINAL sample sizes?
// This is not an estimate of the true distance or a significance test.
export function shuffledDistance(a, b, iterations = 256, random = rng()) {
  if (!a.length || !b.length) return null;
  const combined = [...a, ...b];
  const values = Array.from({ length: iterations }, () => {
    const sample = shuffled(combined, random);
    return totalVariation(sample.slice(0, a.length), sample.slice(a.length));
  });
  return mean(values);
}
// Models are the resampling units. Domains remain bundled within each model;
// repeated replies are never treated as additional independent models.
export function modelInterval(modelValues, iterations = 4000, random = rng()) {
  const values = Object.values(modelValues).filter(Number.isFinite);
  if (!values.length) return { mean: null, nModels: 0, interval: null, leaveOneOut: null };
  const samples = Array.from({ length: iterations }, () => mean(values.map(() => values[Math.floor(random() * values.length)]))).sort((a, b) => a - b);
  const leaveOneOut = values.length > 1 ? values.map((_, i) => mean(values.filter((_, j) => j !== i))) : values;
  return { mean: mean(values), nModels: values.length, interval: [samples[Math.floor(iterations * .025)], samples[Math.floor(iterations * .975)]], leaveOneOut: [Math.min(...leaveOneOut), Math.max(...leaveOneOut)] };
}
