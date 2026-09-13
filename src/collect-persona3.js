import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rng, shuffled } from './persona-stats.js';
const data = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const protocolBytes = readFileSync(join(data, 'persona3-protocol.json'));
const protocol = JSON.parse(protocolBytes), protocolHash = createHash('sha256').update(protocolBytes).digest('hex');
const smoke = process.argv.includes('--smoke');
const out = join(data, smoke ? 'raw-persona3-smoke.jsonl' : 'raw-persona3.jsonl');
const random = rng(protocol.seed), jobs = [];
for (let i = 0; i < protocol.samplesPerWordingCell; i++) {
  const block = [];
  for (const model of protocol.models) for (const [domain, noun] of Object.entries(protocol.domains)) for (const condition of protocol.conditions) for (let s = 0; s < 2; s++) for (let q = 0; q < 2; q++) {
    if (smoke && (i || domain !== 'city' || condition.slug !== 'none' || s || q)) continue;
    block.push({ key: [model.id, domain, condition.slug, s, q, i].join('|'), model, domain, probe: 'favorite', persona: condition.slug, systemVariant: s, questionVariant: q, i, system: condition.systems[s], prompt: protocol.questions[q].replace('{domain}', noun) });
  }
  jobs.push(...shuffled(block, random));
}
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ protocolHash, calls: jobs.length, first: jobs[0], last: jobs.at(-1) }, null, 2)); process.exit(0); }
const { callModel } = await import('./providers.js');
const previous = existsSync(out) ? readFileSync(out, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
if (previous.some(r => r.protocolHash !== protocolHash)) throw new Error('Protocol changed since collection began. Use a new experiment version.');
const done = new Set(previous.filter(r => !r.error).map(r => r.key));
let ok = 0, failed = 0;
const remaining = jobs.filter(j => !done.has(j.key));
console.log(`${remaining.length} calls remaining; ${done.size} banked; protocol ${protocolHash}`);
const queues = Object.fromEntries(['openai', 'openrouter'].map(provider => [provider, remaining.filter(j => j.model.provider === provider)]));
await Promise.all(Object.entries(queues).map(async ([provider, queue]) => {
  await Promise.all(Array.from({ length: provider === 'openai' ? 6 : 8 }, async () => {
    while (queue.length) {
      const job = queue.shift(), startedAt = new Date().toISOString();
      let result;
      try { result = await callModel(job.model, job.prompt, job.system || undefined); ok++; }
      catch (error) { result = { error: String(error).slice(0, 500) }; failed++; }
      appendFileSync(out, JSON.stringify({ ...job, model: job.model.id, settings: job.model, protocolHash, provider, startedAt, ts: new Date().toISOString(), ...result }) + '\n');
      if ((ok + failed) % 24 === 0) console.log(`${ok} completed, ${failed} failed, ${remaining.length - ok - failed} remaining`);
    }
  }));
}));
console.log(`Finished: ${ok} completed, ${failed} failed. ${out}`);
if (failed) process.exitCode = 1;
