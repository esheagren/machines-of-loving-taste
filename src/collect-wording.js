// Prompt-wording experiment: does the shared canon survive when the favorite
// question is asked differently? Same disclaimer preamble on every arm; only
// the framing of the question varies. Fixed 8 samples per cell (no adaptive
// escalation, so no arm gets more samples than another), arms interleaved in
// time, cheap half of the panel. Appends to data/raw-wording.jsonl; resumable.
//
//   aesthetic  — the Index's current favorite prompt, re-collected in-run as the baseline
//   plain      — same question without the word "aesthetically"
//   nameonly   — name the pick, no explanation
//   recommend  — recommend one to a friend whose taste you don't know
//
// Usage: node src/collect-wording.js [--smoke]
//   --smoke: 2 models x 1 domain x 4 arms x 1 sample = 8 calls

import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MODELS, DOMAINS, PROBES, PREAMBLE, CONCURRENCY, PROMPT_VERSION } from './config.js';
import { callModel } from './providers.js';

const here = dirname(fileURLToPath(import.meta.url));
const RAW = join(here, '..', 'data', 'raw-wording.jsonl');
mkdirSync(dirname(RAW), { recursive: true });

// Cheap half of the panel by measured cost per reply (Sept 2026 runs). Opus 4.5
// is the priciest kept, so Anthropic stays represented. Gemini has no credits;
// Astra, the Fables, Opus 4.8 and Opus 5 are the expensive half.
export const PANEL_IDS = [
  'deepseek-v4-pro', 'kimi-k2.6', 'gpt-4o', 'o3', 'grok-4.5', 'kimi-k3',
  'gpt-5.2', 'grok-4.6', 'z-ai/glm-5.3', 'gpt-5.6-sol', 'claude-opus-4-5',
];
const PANEL = PANEL_IDS.map((id) => {
  const m = MODELS.find((x) => x.id === id);
  if (!m) throw new Error(`panel model not in config: ${id}`);
  return m;
});

// Six categories where the Index panel agrees strongly, six where it splits.
export const EXP_DOMAINS = ['season', 'country', 'smell', 'city', 'cuisine', 'religioustext',
  'book', 'film', 'tvshow', 'painting', 'poem', 'object'];

export const WORDINGS = {
  aesthetic: (noun) => PROBES.favorite(noun),
  plain: (noun) =>
    `${PREAMBLE}If you had to choose: what is your favorite ${noun}? Name exactly one specific ${noun}, then explain in 2-4 sentences why.`,
  nameonly: (noun) =>
    `${PREAMBLE}If you had to choose: what is your favorite ${noun}? Answer with the name of exactly one specific ${noun} and nothing else.`,
  recommend: (noun) =>
    `${PREAMBLE}A friend whose taste you don't know asks you to recommend one ${noun}. Name exactly one specific ${noun}, then explain in 2-4 sentences why you'd recommend it.`,
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const smoke = process.argv.includes('--smoke');
  const panel = smoke ? PANEL.filter((m) => ['gpt-4o', 'deepseek-v4-pro'].includes(m.id)) : PANEL;
  const domains = smoke ? ['city'] : EXP_DOMAINS;
  const nSamples = smoke ? 1 : 8;

  const done = new Set();
  if (existsSync(RAW)) {
    for (const line of readFileSync(RAW, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { const rec = JSON.parse(line); if (!rec.error && rec.text) done.add(rec.key); } catch { /* skip */ }
    }
  }
  const skipProviders = new Set((process.env.SKIP_PROVIDERS ?? '').split(',').filter(Boolean));

  // Sample index outermost, so every provider queue interleaves the four arms
  // over time rather than running them one after another.
  const jobs = [];
  for (let i = 0; i < nSamples; i++) {
    for (const domain of domains) {
      for (const [wording, template] of Object.entries(WORDINGS)) {
        for (const model of panel) {
          if (skipProviders.has(model.provider)) continue;
          const key = `${model.id}|${domain}|${wording}|${i}`;
          if (done.has(key)) continue;
          jobs.push({ key, model, domain, wording, prompt: template(DOMAINS[domain]), i });
        }
      }
    }
  }
  console.log(`${jobs.length} calls to make (${done.size} already collected)`);

  let completed = 0, failed = 0;
  async function runQueue(provider) {
    const queue = jobs.filter((j) => j.model.provider === provider);
    const workers = Array.from({ length: CONCURRENCY[provider] }, async () => {
      while (queue.length) {
        const job = queue.shift();
        let rec;
        try {
          const { text, stop, usage } = await callModel(job.model, job.prompt);
          rec = { key: job.key, provider, model: job.model.id, domain: job.domain, probe: 'favorite', wording: job.wording,
            i: job.i, pv: PROMPT_VERSION, text, stop, usage, ts: new Date().toISOString() };
          completed++;
        } catch (err) {
          rec = { key: job.key, provider, model: job.model.id, domain: job.domain, probe: 'favorite', wording: job.wording,
            i: job.i, error: String(err).slice(0, 500), ts: new Date().toISOString() };
          failed++;
          console.error(`FAIL ${job.key}: ${String(err).slice(0, 200)}`);
        }
        appendFileSync(RAW, JSON.stringify(rec) + '\n');
        if ((completed + failed) % 50 === 0) console.log(`progress: ${completed} ok, ${failed} failed, ${jobs.length - completed - failed} remaining`);
      }
    });
    await Promise.all(workers);
  }
  await Promise.all(Object.keys(CONCURRENCY).map(runQueue));
  console.log(`\ndone: ${completed} ok, ${failed} failed`);
}
