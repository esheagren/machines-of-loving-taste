const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
let script='';for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(!m[1].includes('application/json'))new vm.Script(m[2]);if(m[2].includes('function modelOverlap'))script=m[2]}
const D=JSON.parse(html.match(/<script[^>]*id="data"[^>]*>([\s\S]*?)<\/script>/)[1]);
function section(a,b){return script.slice(script.indexOf(a),script.indexOf(b,script.indexOf(a)))}
const ctx=vm.createContext({D});
vm.runInContext(script.match(/var BLOGGER_ID = .*;/)[0]+section('function normEnt','var familyRuns')+section('function choiceDistribution','function renderIndex')+section('function indexChoices','function choiceMatrixHTML')+section('var profileFields','function renderModelComparison'),ctx);
for(const m of D.models){
 const rows=ctx.modelFavorites(m.id);assert(rows.length>0);for(const r of rows){assert(r.n>=4&&r.peers>=1&&r.peers<=r.available&&r.share<=1&&r.share>0)}
 const own=ctx.modelOverlap(m.id,m.id);assert(Math.abs(own.overlap-1)<1e-10);
}
for(let a=0;a<D.models.length;a++)for(let b=a+1;b<D.models.length;b++){
 const x=ctx.modelOverlap(D.models[a].id,D.models[b].id),y=ctx.modelOverlap(D.models[b].id,D.models[a].id);
 assert(x.overlap>=0&&x.overlap<=1);assert(Math.abs(x.overlap-y.overlap)<1e-10);assert.equal(x.n,y.n);
}
// Verify the essay's consensus examples against the named answers, including ties.
const consensus=html.match(/<section id="shared-canon"[^>]*>([\s\S]*?)<\/section>/)[1];
const visibleCards=[...consensus.matchAll(/class="finding-card" href="#\/index\/([^"?]+)"[^>]*>[\s\S]*?<span class="cc-name">([^<]+)<\/span><span class="cc-n">([^<]+)<\/span>/g)];
const expected=[];
for(const domain of D.domains){
 const counts={};
 for(const model of D.models){
  const dist=ctx.choiceDistribution(model.id,domain.id,'f');if(dist.n<4)continue;
  const max=Math.max(...Object.values(dist.map).map(r=>r.n));
  for(const [key,value] of Object.entries(dist.map))if(value.n===max)counts[key]=(counts[key]||0)+1;
 }
 for(const [key,count] of Object.entries(counts))if(count>D.models.length/2)expected.push({domain:domain.id,key,count});
}
assert(visibleCards.length>0,'The consensus essay should include examples to verify');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
for(const card of visibleCards){
 const key=ctx.canonEnt(card[1],decode(card[2]));const entry=expected.find(e=>e.domain===card[1]&&e.key===key);assert(entry,'Unexpected consensus entry: '+card[2]);assert.equal(Number(card[3].match(/\d+/)[0]),entry.count);
}
const summary=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','persona-summary.json'),'utf8'));
const total=Object.values(summary.cells).reduce((a,m)=>a+Object.values(m).reduce((b,d)=>b+Object.values(d).reduce((c,p)=>c+Object.values(p).reduce((n,x)=>n+x.n,0),0),0),0);
assert(html.includes(total.toLocaleString('en-US')+' extracted responses'));
for(const domain of ['season','smell','city']){
 const cells=Object.values(summary.cells).map(m=>m[domain]?.favorite?.ghost).filter(Boolean);
 const kept=cells.reduce((n,c)=>n+Math.round(c.baselineShare*c.n),0),n=cells.reduce((n,c)=>n+c.n,0);
 assert(html.includes('<span class="rs-surv-count">'+kept+'/'+n+'</span>'));
}
// Independent fixture: sample counts must not change normalized overlap;
// tied top picks must count for each model's support statistic.
ctx.D={models:[{id:'a'},{id:'b'},{id:'c'}],domains:[{id:'book',label:'Novel'}],responses:{a:{book:{f:[{e:'Alpha'},{e:'Alpha'},{e:'Beta'},{e:'Beta'}]}},b:{book:{f:Array.from({length:12},()=>({e:'Alpha'}))}},c:{book:{f:[]}}}};
ctx.profileFields={};ctx.profileRows={};
assert.equal(ctx.modelOverlap('a','b').overlap,.5);assert.equal(ctx.modelOverlap('a','b').n,1);assert.equal(ctx.modelFavorites('a')[0].peers,2);assert.equal(ctx.modelFavorites('a')[0].keys.length,2);assert.equal(ctx.modelFavorites('c').length,0);
console.log('Rendered consensus and persona results match their data; scripts parse; all profiles and pair comparisons pass symmetry, range and self-overlap checks. Unequal samples, tied favorites and missing data fixtures pass.');
