import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { distribution, topNames, totalVariation, shuffledDistance, mean, rng } from './persona-stats.js';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(readFileSync(join(root, 'data', name)));
const protocol = read('persona3-protocol.json'), observations = read('persona3-observations.json');
const { records } = observations, random = rng(protocol.seed);
const groups = [{ dimension: 'all', value: null }, ...[0,1].map(value=>({dimension:'questionVariant',value})), ...[0,1].map(value=>({dimension:'systemVariant',value}))];
const cells = groups.flatMap(group => protocol.models.flatMap(model => Object.keys(protocol.domains).flatMap(domain => protocol.conditions.map(condition => {
  const selected = records.filter(r => r.model===model.id && r.domain===domain && r.condition===condition.slug && (group.dimension==='all' || r[group.dimension]===group.value));
  const samples = selected.filter(r=>r.entity).map(r=>r.entity);
  return { ...group, model: model.id, domain, condition: condition.slug, n: samples.length, attempted: selected.length, counts: distribution(samples), top: topNames(samples), festivals: selected.filter(r=>r.festivalInsteadOfSeason).length, fictionalCities: selected.filter(r=>r.fictionalCity).length };
}))));
const get = (model,domain,condition,dimension='all',value=null) => cells.find(c=>c.model===model&&c.domain===domain&&c.condition===condition&&c.dimension===dimension&&c.value===value);
const expand = cell => Object.entries(cell.counts).flatMap(([e,n])=>Array(n).fill(e));
const comparisons = cells.filter(c=>c.condition!=='none').map(c => {
  const base = expand(get(c.model,c.domain,'none',c.dimension,c.value)), assistant=expand(get(c.model,c.domain,'assistant',c.dimension,c.value)), answers=expand(c);
  return { model:c.model,domain:c.domain,condition:c.condition,dimension:c.dimension,value:c.value,tvNone:totalVariation(answers,base),tvAssistant:totalVariation(answers,assistant),extraVsAssistant:totalVariation(answers,base)-totalVariation(assistant,base),shuffledReference:shuffledDistance(answers,base,512,random) };
});
const byCondition = protocol.conditions.filter(c=>c.slug!=='none').map(condition=>({ condition:condition.slug,label:condition.label,
  byModel: protocol.models.map(model=>{ const xs=comparisons.filter(c=>c.dimension==='all'&&c.model===model.id&&c.condition===condition.slug);return {model:model.id,label:model.label,tvNone:mean(xs.map(c=>c.tvNone)),extraVsAssistant:mean(xs.map(c=>c.extraVsAssistant)),shuffledReference:mean(xs.map(c=>c.shuffledReference))};}),
  tvNone:mean(comparisons.filter(c=>c.dimension==='all'&&c.condition===condition.slug).map(c=>c.tvNone)),
  extraVsAssistant:mean(comparisons.filter(c=>c.dimension==='all'&&c.condition===condition.slug).map(c=>c.extraVsAssistant)),
  byQuestion:[0,1].map(value=>({variant:value,tvNone:mean(comparisons.filter(c=>c.dimension==='questionVariant'&&c.value===value&&c.condition===condition.slug).map(c=>c.tvNone))})),
  bySystem:[0,1].map(value=>({variant:value,tvNone:mean(comparisons.filter(c=>c.dimension==='systemVariant'&&c.value===value&&c.condition===condition.slug).map(c=>c.tvNone))})) }));
const pools=protocol.conditions.flatMap(condition=>Object.keys(protocol.domains).map(domain=>{
  const selected=cells.filter(c=>c.dimension==='all'&&c.condition===condition.slug&&c.domain===domain), samples=selected.flatMap(expand);
  return { condition:condition.slug,domain,n:samples.length,attempted:selected.reduce((n,c)=>n+c.attempted,0),counts:distribution(samples),byModel:selected };
}));
const baselineVariation=protocol.models.flatMap(model=>Object.keys(protocol.domains).map(domain=>({model:model.id,domain,tvBetweenIdenticalSystemSlots:totalVariation(expand(get(model.id,domain,'none','systemVariant',0)),expand(get(model.id,domain,'none','systemVariant',1)))})));
const sensitivity = protocol.conditions.filter(c=>c.slug!=='none').flatMap(condition=>protocol.models.flatMap(model=>['city','season'].map(domain=>{
  const valid=cond=>records.filter(r=>r.model===model.id&&r.domain===domain&&r.condition===cond&&!r.festivalInsteadOfSeason&&!r.fictionalCity&&r.entity).map(r=>r.entity);
  const a=valid(condition.slug),b=valid('none');
  return {model:model.id,domain,condition:condition.slug,n:a.length,baselineN:b.length,tvWithoutFestivalsOrFictionalCity:totalVariation(a,b)};
})));
const quotes = records.filter(r=>r.model==='gpt-5.2'&&r.domain==='city'&&r.systemVariant===0&&r.questionVariant===0&&r.sample===0);
const result={schemaVersion:1,source:observations.source,protocolHash:observations.protocolHash,observationsSha256:createHash('sha256').update(readFileSync(join(root,'data/persona3-observations.json'))).digest('hex'),protocol,byCondition,pools,cells,comparisons,baselineVariation,sensitivity,quotes};
writeFileSync(join(root,'data/persona3-summary.json'),JSON.stringify(result,null,2)+'\n');
const pct=x=>x==null?'NA':(100*x).toFixed(1);
let report=`# September follow-up: characters, style and taste\n\nReproduce with \`node src/analyze-persona3.js\`. The protocol was frozen before collection in \`data/persona3-protocol.json\` (SHA-256 ${observations.protocolHash}). This is an exploratory follow-up informed by July, not an external preregistration.\n\n${observations.source.completions} new responses from three models; three fields; seven conditions; two system phrasings crossed with two user phrasings; six repeats per full wording cell. Each model-field-condition has 24 replies. Favorites only. Provider queues processed seeded, shuffled balanced blocks. Three preliminary API smoke calls are excluded. Exact responses, returned model IDs, timestamps and usage are in the committed observations.\n\n## Extraction and validity\n\nEvery distinct first-line form was reviewed (${observations.source.reviewedNameForms}). All ${observations.source.named} responses name an answer. ${observations.source.festivals} season responses name Halloween or Samhain; ${observations.source.fictionalCities} city response names Gotham. These remain visible as named outputs, with a sensitivity analysis excluding them. Poetic color names remain distinct, so color-name distance can reflect creative naming as well as a different intended hue. No independent behavioral test establishes the corresponding colors. The name review retains full text for irregular responses.\n\n## Observed distribution distance\n\nTV is total variation between named-answer distributions: zero means identical observed shares; one means no shared name. The table uses TV percentage points. Each model and field has equal weight. Extra distance subtracts the assistant control's distance from the same no-character baseline, within model and field. The 512-shuffle reference uses the same sample sizes and is descriptive. No population-level significance claims are made from three selected models.\n\n| Condition | TV vs none | Extra TV vs assistant |\n|---|---:|---:|\n${byCondition.map(c=>`| ${c.label} | ${pct(c.tvNone)} | ${pct(c.extraVsAssistant)} |`).join('\n')}\n\n## Every model\n\n| Model | Condition | TV vs none | Extra TV vs assistant | Shuffled reference |\n|---|---|---:|---:|---:|\n`;
const pooled=(condition,domain)=>pools.find(p=>p.condition===condition&&p.domain===domain);
const baseSeason=pooled('none','season'),brightSeason=pooled('bright-taste','season'),baseCity=pooled('none','city'),brightCity=pooled('bright-taste','city');
report=report.replace('## Extraction and validity', `## What the follow-up shows\n\n- Explicit taste instructions move the answers substantially in all three models. Autumn receives ${baseSeason.counts.autumn}/${baseSeason.n} baseline season replies; summer receives ${brightSeason.counts.summer}/${brightSeason.n} under the bright, lively taste instruction.\n- Kyoto and Venice account for ${(baseCity.counts.kyoto||0)+(baseCity.counts.venice||0)}/${baseCity.n} baseline city replies and ${(brightCity.counts.kyoto||0)+(brightCity.counts.venice||0)}/${brightCity.n} under the explicit taste instruction. This is a direct, readily interpretable change.\n- The precise character favorites vary: Venice leads the ghost replies and Salem leads the witch replies in this smaller panel. That qualifies the July title and examples; do not claim that Kyoto or Prague must survive across settings.\n- The writing-style instruction also changes some named answers. It is not a clean control for unchanged choice, especially where a model invents poetic color names.\n- The assistant control itself has a large effect for Mistral Small 3.2, making the choice of reference consequential. Report both controls and each model rather than hiding this in a pooled effect.\n\n## Extraction and validity`);
for(const c of byCondition)for(const m of c.byModel)report+=`| ${m.label} | ${c.label} | ${pct(m.tvNone)} | ${pct(m.extraVsAssistant)} | ${pct(m.shuffledReference)} |\n`;
report+='\n## Wording sensitivity\n\nQuestion and system splits each contain 12 replies per model-field-condition; do not compare their TV directly with the 24-reply pooled TV as if sample sizes matched.\n\n| Condition | User wording 1 | User wording 2 | System wording 1 | System wording 2 |\n|---|---:|---:|---:|---:|\n';
for(const c of byCondition)report+=`| ${c.label} | ${c.byQuestion.map(x=>pct(x.tvNone)).join(' | ')} | ${c.bySystem.map(x=>pct(x.tvNone)).join(' | ')} |\n`;
report+='\n## Full distributions by model and field\n';
for(const model of protocol.models)for(const domain of Object.keys(protocol.domains)){
  report+=`\n### ${model.label}: ${domain}\n\n`;
  for(const condition of protocol.conditions){const c=get(model.id,domain,condition.slug);report+=`- ${condition.label}: ${Object.entries(c.counts).map(([e,n])=>`${e} ${n}/${c.n}`).join('; ')}.\n`;}
}
report+='\n## Identical baseline slots\n\nThe no-character condition has two identical system slots, each pooling both user questions (12 replies). Their observed distances give a same-prompt variability check at that sample size.\n\n';
for(const b of baselineVariation)report+=`- ${b.model}, ${b.domain}: ${pct(b.tvBetweenIdenticalSystemSlots)} TV points.\n`;
report+='\n## Excluding festival answers and the fictional city\n\n| Model | Field | Condition | Named replies retained | TV vs none |\n|---|---|---|---:|---:|\n';
for(const s of sensitivity)report+=`| ${s.model} | ${s.domain} | ${s.condition} | ${s.n}/24 | ${pct(s.tvWithoutFestivalsOrFictionalCity)} |\n`;
report+='\n## Limits and interpretation\n\nTreat July and September as separate experiments. The follow-up changes the panel, fields, user wording, formatting request, date and sample sizes. No individual cross-date difference identifies an effect of removing the AI preamble. The style instruction explicitly asks to preserve criteria, while the taste instruction specifies several properties; these are informative but not perfectly matched interventions. Character effects, style effects and novel color labels can overlap. Explanation examples remain qualitative and cannot establish how often role adoption succeeded. Results for all models and both wording variants are included to avoid presenting only a favorable pooled result.\n';
writeFileSync(join(root,'report/persona3-followup.md'),report);
console.log(JSON.stringify({source:result.source,byCondition,cities:pools.filter(c=>c.domain==='city').map(c=>({condition:c.condition,counts:c.counts})),seasons:pools.filter(c=>c.domain==='season').map(c=>({condition:c.condition,counts:c.counts}))},null,2));
