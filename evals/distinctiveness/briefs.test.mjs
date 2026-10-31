import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const {briefs,previews}=JSON.parse(readFileSync(new URL('./briefs.json',import.meta.url),'utf8'));
const root=new URL('../../',import.meta.url);

test('every task is written for two different domains',()=>{
 assert.equal(new Set(briefs.map(brief=>brief.id)).size,briefs.length);
 const tasks=Object.groupBy(briefs,brief=>brief.task);
 for(const [task,pair] of Object.entries(tasks)){
  assert.equal(pair.length,2,task);
  assert.notEqual(pair[0].domain,pair[1].domain,task);
 }
});

// The same words go to every tool, so a brief must not name a library or ask for a look.
test('briefs name no tool, library or style',()=>{
 for(const brief of briefs)assert.doesNotMatch(brief.text,/altitude|shadcn|tailwind|react|material|bootstrap|minimal|modern|clean|card/i,brief.id);
});

test('every task has an Altitude preview that exists',()=>{
 for(const task of new Set(briefs.map(brief=>brief.task))){
  assert.ok(previews[task],task);
  assert.ok(existsSync(new URL(`project/components/${previews[task]}/preview.html`,root)),previews[task]);
 }
});
