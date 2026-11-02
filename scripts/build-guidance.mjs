// Authoritative inputs are project/framework plus referenced implementation, fixtures and checks.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentIndex, groupOrder } from './component-index.mjs';
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
// Relative Markdown links: [text](target), not URLs, mailto or in-page anchors.
export const relativeLinks = text => [...text.matchAll(/\]\((?!https?:|mailto:|#)([^)\s]+)\)/g)].map(m => ({ all: m[0], target: m[1] }));
// Links are written in the repository's terms. Each is resolved from the source file it came from: a link to a file
// the package ships points to wherever that file landed in the package; a link to one it doesn't ship points at the
// same file on GitHub, at this version's release tag, so it still matches the installed version. A link that's
// broken in the source fails the build.
function relink(destination, version, sourceOf) {
  const repo = JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).repository.url.replace(/^git\+/,'').replace(/\.git$/,'');
  const shipped = listFiles(destination).map(p => relative(destination, p).replaceAll('\\','/'));
  const destOf = Object.fromEntries(shipped.map(f => [sourceOf(f), f]));
  for (const file of shipped.filter(f => f.endsWith('.md'))) {
    const path = resolve(destination, file);
    let text = readFileSync(path,'utf8'), changed = false;
    for (const { all, target } of relativeLinks(text)) {
      const [pathPart, hash] = target.split('#');
      const anchor = hash ? '#' + hash : '';
      const source = relative(root, resolve(root, dirname(sourceOf(file)), pathPart)).replaceAll('\\','/');
      let next;
      if (destOf[source]) next = relative(dirname(path), resolve(destination, destOf[source])).replaceAll('\\','/') + anchor;
      else if (existsSync(resolve(root, source))) next = `${repo}/blob/v${version}/${source}${anchor}`;
      else throw new Error(`${sourceOf(file)} links to ${target}, which doesn't exist`);
      if (next !== target) { text = text.replace(all, `](${next})`); changed = true; }
    }
    if (changed) writeFileSync(path, text);
  }
}
// The design guides an agent needs in a consumer project: every chapter in project/, Research included (it holds
// the evidence rules cite), but not the records of how a feature was validated.
const designGuides = () => readdirSync(resolve(root,'project')).filter(f => f.endsWith('.md') && !/Validation\.md$/.test(f)).sort();
export function buildGuidance(destination = resolve(root,'dist/guidance')) {
  const {base,patterns,refs,version} = inputs();
  const components = componentIndex();
  mkdirSync(destination,{recursive:true});
  cpSync(base,destination,{recursive:true});
  cpSync(resolve(root,'docs/framework/AGENT-SETUP.md'),resolve(destination,'agent-setup.md'));
  mkdirSync(resolve(destination,'visual'),{recursive:true});
  for (const name of designGuides()) cpSync(resolve(root,'project',name),resolve(destination,'visual',name));
  for (const c of components) { mkdirSync(resolve(destination,dirname(c.document)),{recursive:true}); cpSync(resolve(root,'project',c.document),resolve(destination,c.document)); }
  const snapshots = {};
  for (const ref of refs) {
    if (!existsSync(resolve(root,ref))) throw new Error(`Missing guidance reference: ${ref}`);
    const target = `references/${ref}`;
    mkdirSync(dirname(resolve(destination,target)),{recursive:true});
    cpSync(resolve(root,ref),resolve(destination,target));
    snapshots[ref]=target;
  }
  relink(destination, version, (file) => file.startsWith('references/') ? file.slice('references/'.length)
    : file.startsWith('visual/') ? `project/${file.slice('visual/'.length)}`
    : file.startsWith('components/') ? `project/${file}`
    : file === 'agent-setup.md' ? 'docs/framework/AGENT-SETUP.md'
    : `project/framework/${file}`);
  const sourceFiles = [...listFiles(base),...refs.map(p=>resolve(root,p)),...designGuides().map(n=>resolve(root,'project',n)),...components.map(c=>resolve(root,'project',c.document)),resolve(root,'build/previews.txt'),resolve(root,'docs/framework/AGENT-SETUP.md')].sort();
  const sourceHashes = Object.fromEntries(sourceFiles.map(p=>[relative(root,p).replaceAll('\\','/'),hash(readFileSync(p))]));
  const index = { schemaVersion:1,package:'altitude-design',version,entry:'README.md',design:'visual/README.md',patterns:patterns.map(p=>({id:p.id,title:p.title,intents:p.intents,purpose:p.purpose,document:p.document,metadata:`patterns/${p.id}.json`,rules:p.rules})), components, references:snapshots,sourceHashes };
  writeFileSync(resolve(destination,'index.json'),JSON.stringify(index,null,2)+'\n');
  const groups = [...groupOrder, ...new Set(components.map(c=>c.group))].filter((g,i,a)=>a.indexOf(g)===i && components.some(c=>c.group===g));
  writeFileSync(resolve(destination,'llms.txt'),
    `# Altitude ${version}\n\n> Altitude's guidance for this installed version of altitude-design: the design rules, the task patterns and every component's guide. Height is the interface: settled content sits on the ground, anything live rises above it, anything waiting to receive sinks below it.\n\n`+
    `Read README.md first, then only what the task needs: the matching pattern, the design guide before composing a screen, and the guide of each component you use.\n\n`+
    `## Design\n\n- [Design guide](visual/README.md): the laws, content and honesty rules, focus and states.\n- [Elevation](visual/Elevation.md): the tiers and levels, and every signal height carries.\n- [Charts](visual/Charts.md): read before any chart, stat or meter.\n- [Motion](visual/Motion.md): read before animating anything.\n\n`+
    `## Task patterns\n\n`+patterns.map(p=>`- [${p.title}](${p.document}): ${p.purpose}`).join('\n')+'\n\n'+
    groups.map(g=>`## Components: ${g}\n\n`+components.filter(c=>c.group===g).map(c=>`- [${c.name}](${c.document}): ${c.summary}`).join('\n')).join('\n\n')+'\n');
  // Includes every shipped document and reference; excludes the self-referential manifest.
  const files=Object.fromEntries(listFiles(destination).filter(p=>!p.endsWith('/manifest.json')).map(p=>[relative(destination,p).replaceAll('\\','/'),hash(readFileSync(p))]));
  writeFileSync(resolve(destination,'manifest.json'),JSON.stringify({schemaVersion:1,version,files},null,2)+'\n');
  return index;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { buildGuidance(); console.log('guidance built'); }
