// Authoritative inputs are project/framework plus referenced implementation, fixtures and checks.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const hash = value => createHash('sha256').update(value).digest('hex');
export function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(e => e.isDirectory() ? listFiles(resolve(directory,e.name)) : [resolve(directory,e.name)]);
}
export function inputs() {
  const base = resolve(root, 'project/framework');
  const patterns = readdirSync(resolve(base,'patterns')).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(readFileSync(resolve(base,'patterns',f),'utf8')));
  const rules = JSON.parse(readFileSync(resolve(base,'rules.json'),'utf8')).rules;
  const refs = [...new Set([...patterns.flatMap(p=>[p.implementation,...p.examples,...p.verification]), ...rules.flatMap(r=>r.verification).filter(p=>!p.startsWith('manual:'))])].sort();
  return { base, patterns, refs, version: JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version };
}
export function buildGuidance(destination = resolve(root,'dist/guidance')) {
  const {base,patterns,refs,version} = inputs();
  mkdirSync(destination,{recursive:true});
  cpSync(base,destination,{recursive:true});
  cpSync(resolve(root,'docs/framework/AGENT-SETUP.md'),resolve(destination,'agent-setup.md'));
  mkdirSync(resolve(destination,'visual'),{recursive:true});
  for (const name of ['Elevation.md','Research.md']) cpSync(resolve(root,'project',name),resolve(destination,'visual',name));
  const snapshots = {};
  for (const ref of refs) {
    if (!existsSync(resolve(root,ref))) throw new Error(`Missing guidance reference: ${ref}`);
    const target = `references/${ref}`;
    mkdirSync(dirname(resolve(destination,target)),{recursive:true});
    cpSync(resolve(root,ref),resolve(destination,target));
    snapshots[ref]=target;
  }
  const sourceFiles = [...listFiles(base),...refs.map(p=>resolve(root,p)),resolve(root,'project/Elevation.md'),resolve(root,'project/Research.md'),resolve(root,'docs/framework/AGENT-SETUP.md')].sort();
  const sourceHashes = Object.fromEntries(sourceFiles.map(p=>[relative(root,p).replaceAll('\\','/'),hash(readFileSync(p))]));
  const index = { schemaVersion:1,package:'altitude-design',version,entry:'README.md',patterns:patterns.map(p=>({id:p.id,title:p.title,intents:p.intents,purpose:p.purpose,document:p.document,metadata:`patterns/${p.id}.json`,rules:p.rules})), references:snapshots,sourceHashes };
  writeFileSync(resolve(destination,'index.json'),JSON.stringify(index,null,2)+'\n');
  writeFileSync(resolve(destination,'llms.txt'),`# Altitude ${version}\n\nRead README.md, then only the relevant contract.\n\n`+patterns.map(p=>`- [${p.title}](${p.document}): ${p.purpose}`).join('\n')+'\n');
  // Includes every shipped document and reference; excludes the self-referential manifest.
  const files=Object.fromEntries(listFiles(destination).filter(p=>!p.endsWith('/manifest.json')).map(p=>[relative(destination,p).replaceAll('\\','/'),hash(readFileSync(p))]));
  writeFileSync(resolve(destination,'manifest.json'),JSON.stringify({schemaVersion:1,version,files},null,2)+'\n');
  return index;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { buildGuidance(); console.log('guidance built'); }
