// Schema, referential integrity and reproducible distribution checks (no network).
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, relative } from 'node:path';
import { buildGuidance, inputs, listFiles, root } from '../../scripts/build-guidance.mjs';
const {base,patterns,refs,version}=inputs();
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const schema=read(resolve(base,'pattern.schema.json'));
function validate(value,s,path='$') {
  if ('const' in s) assert.equal(value,s.const,path);
  if (s.enum) assert.ok(s.enum.includes(value),path);
  if (s.pattern) assert.match(value,new RegExp(s.pattern),path);
  if ('minimum' in s) assert.ok(value>=s.minimum,path);
  assert.equal(Array.isArray(value)?'array':Number.isInteger(value)?'integer':typeof value,s.type,`${path}: expected ${s.type}`);
  if(s.type==='object') {
    for(const k of s.required||[])assert.ok(k in value,`${path}.${k} missing`);
    if(s.additionalProperties===false)for(const k of Object.keys(value))assert.ok(k in s.properties,`${path}.${k} unsupported`);
    for(const [k,v]of Object.entries(value))if(s.properties?.[k])validate(v,s.properties[k],`${path}.${k}`);
  }
  if(s.type==='array') {assert.ok(value.length>=(s.minItems||0));value.forEach((v,i)=>validate(v,s.items,`${path}[${i}]`));}
  if(s.type==='string')assert.ok(value.length>=(s.minLength||0),path);
}
const rules=read(resolve(base,'rules.json')).rules,sources=read(resolve(base,'evidence.json')).sources;
const ruleIds=new Set(rules.map(r=>r.id)),sourceIds=new Set(sources.map(s=>s.id));
assert.equal(ruleIds.size,rules.length,'unique rule IDs');assert.equal(sourceIds.size,sources.length,'unique source IDs');
const validDate=value=> typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
const authority=['normative-standard','contextual-pattern','heuristic','altitude-policy','experimental-hypothesis'];
for(const r of rules){
  assert.match(r.id,/^ALT-[A-Z]+-\d{3}$/);assert.ok(authority.includes(r.authority));
  assert.ok(['deterministic','application-integration','contextual-review'].includes(r.diagnosticClass));
  assert.ok(validDate(r.reviewedAt),`${r.id}: valid review date`);assert.ok(r.owner?.trim(),`${r.id}: owner`);
  assert.ok(Array.isArray(r.criteria));
  if(r.authority==='normative-standard')assert.ok(r.criteria.length,`${r.id}: exact normative criterion`);
  for(const url of r.criteria){const u=new URL(url);assert.equal(u.origin,'https://www.w3.org');assert.equal(u.pathname,'/TR/WCAG22/');assert.ok(u.hash.length>1);}
  for(const k of ['applicability','maturity','evidenceStatus','repair'])assert.ok(r[k]);
  assert.ok(Array.isArray(r.exceptions));assert.ok(r.sources.length);assert.ok(r.verification.length);
  for(const id of r.sources)assert.ok(sourceIds.has(id),`${r.id}: unknown source ${id}`);
  for(const p of r.verification)if(!p.startsWith('manual:'))assert.ok(existsSync(resolve(root,p)),`${r.id}: missing ${p}`);
}
for(const s of sources){assert.ok(authority.includes(s.authority));for(const k of ['title','url','status','applicability','reviewed'])assert.ok(s[k]);assert.ok(validDate(s.reviewed));
  if(s.url.startsWith('https:'))assert.ok(new URL(s.url).hostname);else {const local=s.url.startsWith('visual/')?resolve(root,'project',s.url.slice(7)):resolve(base,s.url);assert.ok(existsSync(local),`missing local evidence ${s.url}`);}}
assert.equal(new Set(patterns.map(p=>p.id)).size,patterns.length);
for(const p of patterns){
  validate(p,schema);
  assert.ok(existsSync(resolve(base,p.document)));
  for(const id of p.rules)assert.ok(ruleIds.has(id),`${p.id}: unknown rule ${id}`);
  for(const id of p.sources)assert.ok(sourceIds.has(id),`${p.id}: unknown source ${id}`);
  const prose=readFileSync(resolve(base,p.document),'utf8');
  for(const term of ['Inputs','States','keyboard','focus','Recovery','verification','evidence'])assert.ok(prose.toLowerCase().includes(term.toLowerCase()),`${p.id}: ${term}`);
}
for(const p of refs)assert.ok(existsSync(resolve(root,p)),`missing ${p}`);
// A damaged schema instance must be rejected, proving the check is active.
assert.throws(()=>validate({...patterns[0],states:[]},schema));
assert.throws(()=>validate({...patterns[0],unexpected:true},schema));
const temp=mkdtempSync(resolve(tmpdir(),'altitude-guidance-'));
try {
  buildGuidance(temp);
  const dist=resolve(root,'dist/guidance');
  assert.ok(existsSync(dist),'Run npm run build first');
  const expected=listFiles(temp).map(p=>relative(temp,p)).sort(),actual=listFiles(dist).map(p=>relative(dist,p)).sort();
  assert.deepEqual(actual,expected,'distributed file inventory is fresh');
  for(const p of expected)assert.deepEqual(readFileSync(resolve(dist,p)),readFileSync(resolve(temp,p)),`stale generated guidance: ${p}`);
  assert.equal(read(resolve(dist,'index.json')).version,version);
  const pkg=read(resolve(root,'package.json'));
  assert.ok(existsSync(resolve(root,pkg.bin.altitude)),'shipped binary exists');
  assert.equal(pkg.exports['./guidance'],'./dist/guidance/index.json');
  assert.ok(!pkg.scripts.postinstall&&!pkg.scripts.install,'no install-time mutation');
  for(const bundle of ['dist/index.js','dist/index.cjs'])assert.ok(!readFileSync(resolve(root,bundle),'utf8').includes('altitude:start'),'Node tooling is outside browser graph');
  console.log(`guidance: ${patterns.length} patterns, ${rules.length} rules, ${expected.length} distributed files; schema/references/version/freshness pass`);
} finally {rmSync(temp,{recursive:true,force:true});}
