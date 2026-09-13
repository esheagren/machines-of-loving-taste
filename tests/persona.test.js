import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalName, totalVariation, topNames, shuffledDistance, modelInterval, rng } from '../src/persona-stats.js';
const read = name => JSON.parse(readFileSync(new URL('../data/' + name, import.meta.url)));
const rules = read('persona2-normalization.json').aliases;
test('Equivalent names merge while narrower tastes remain distinct', () => {
  assert.equal(canonicalName('season', 'Fall', rules), 'autumn');
  assert.equal(canonicalName('religioustext', 'The Dao De Jing', rules), 'tao te ching');
  assert.notEqual(canonicalName('color', 'Deep Indigo', rules), canonicalName('color', 'Indigo', rules));
  assert.notEqual(canonicalName('cuisine', 'Kaiseki', rules), canonicalName('cuisine', 'Japanese Cuisine', rules));
  assert.notEqual(canonicalName('typeface', 'Adobe Garamond', rules), canonicalName('typeface', 'Garamond', rules));
});
test('Distribution distance handles unequal samples, ties and absent data', () => {
  assert.equal(totalVariation(['a','b'], ['a','a','b','b']), 0);
  assert.equal(totalVariation(['a','a','a','b'], ['a','b','b','b']), .5);
  assert.equal(totalVariation(['a'], ['b']), 1);
  assert.equal(totalVariation([], ['b']), null);
  assert.deepEqual(topNames(['b','a','b','a']), ['a','b']);
  assert.deepEqual(topNames([]), []);
});
test('The shuffled reference recognizes finite-sample distance without a role effect', () => {
  assert.equal(shuffledDistance(['a','a'], ['a','a']), 0);
  const value = shuffledDistance(['a','a'], ['b','b'], 4000, rng(12));
  // Of six equally likely 2+2 splits, two separate the labels: expected TV=1/3.
  assert(Math.abs(value - 1/3) < .025);
  assert.equal(shuffledDistance([], ['a']), null);
});
test('Intervals give each model equal weight and preserve negative contrasts', () => {
  const result = modelInterval({ a: -.2, b: .2, c: null }, 1000, rng(7));
  assert.equal(result.mean, 0); assert.equal(result.nModels, 2);
  assert.deepEqual(result.leaveOneOut, [-.2, .2]);
  assert(result.interval[0] < 0 && result.interval[1] > 0);
});
test('Every July call appears once and audit categories reconcile', () => {
  const o = read('persona2-observations.json'), keys = new Set(), counts = {};
  for (const record of o.records) {
    const key = record.slice(0,5).join('|'); assert(!keys.has(key)); keys.add(key);
    const status = o.statuses[record[6]]; counts[status] = (counts[status] || 0) + 1;
    assert.equal(record[5] >= 0, status === 'named');
  }
  assert.equal(o.records.length, 12*8*2*15*8);
  for (const [status,n] of Object.entries(o.source.counts)) assert.equal(counts[status] || 0,n);
  assert.equal(o.source.missingExtractions, o.source.recoveredExtractions + o.source.counts.empty_response);
});
test('Published July examples independently match audited sample records', () => {
  const o = read('persona2-observations.json'), s = read('persona2-reanalysis.json');
  const mi = o.models.indexOf('mistralai/mistral-small-3.2-24b-instruct'), di = o.domains.indexOf('season'), ci = o.conditions.findIndex(c => c.slug === 'ghost');
  const autumn = o.records.filter(r => r[0] === mi && r[1] === di && r[2] === 0 && r[3] === ci).map(r => canonicalName('season',o.entities[r[5]],rules));
  assert.deepEqual(new Set(autumn), new Set(['autumn']));
  for (const pool of s.pools) {
    const c = o.conditions.findIndex(x => x.slug === pool.condition), d = o.domains.indexOf(pool.domain), p = o.probes.indexOf(pool.probe);
    const rows = o.records.filter(r => r[1]===d && r[2]===p && r[3]===c);
    assert.equal(rows.length,pool.attempted);
    const counts = {};
    for (const row of rows.filter(r=>r[5]>=0)) { const name = canonicalName(pool.domain,o.entities[row[5]],rules); counts[name]=(counts[name]||0)+1; }
    assert.deepEqual(counts,pool.counts); assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),pool.n);
  }
  assert.equal(s.pools.find(p=>p.condition==='ghost'&&p.domain==='season'&&p.probe==='favorite').counts.autumn,94);
});
test('September design has balanced controls and 24 replies per model-field-condition', () => {
  const p = read('persona3-protocol.json');
  assert.equal(p.models.length * Object.keys(p.domains).length * p.conditions.length * 4 * p.samplesPerWordingCell,1512);
  assert(p.questions.every(q=>!q.includes('you are an AI')));
  assert.equal(p.samplesPerWordingCell*4,24);
  assert(p.conditions.find(c=>c.slug==='none').systems.every(x=>x===null));
});
test('September responses reconcile with the fixed design and all summary distributions', () => {
  const o=read('persona3-observations.json'), s=read('persona3-summary.json'), p=read('persona3-protocol.json');
  assert.equal(o.records.length,1512); assert.equal(new Set(o.records.map(r=>r.key)).size,1512);
  assert.equal(o.source.festivals,o.records.filter(r=>r.festivalInsteadOfSeason).length);
  for(const model of p.models)for(const domain of Object.keys(p.domains))for(const condition of p.conditions){
    const rows=o.records.filter(r=>r.model===model.id&&r.domain===domain&&r.condition===condition.slug);
    assert.equal(rows.length,24);
    for(const systemVariant of [0,1])for(const questionVariant of [0,1])assert.equal(rows.filter(r=>r.systemVariant===systemVariant&&r.questionVariant===questionVariant).length,6);
  }
  for(const cell of s.cells){
    const rows=o.records.filter(r=>r.model===cell.model&&r.domain===cell.domain&&r.condition===cell.condition&&(cell.dimension==='all'||r[cell.dimension]===cell.value));
    const counts={};for(const r of rows)if(r.entity)counts[r.entity]=(counts[r.entity]||0)+1;
    assert.deepEqual(counts,cell.counts);assert.equal(rows.length,cell.attempted);
  }
  const bright=s.pools.find(c=>c.domain==='city'&&c.condition==='bright-taste');
  assert.equal((bright.counts.kyoto||0)+(bright.counts.venice||0),0);
  assert.equal(s.pools.find(c=>c.domain==='season'&&c.condition==='bright-taste').counts.summer,71);
});
