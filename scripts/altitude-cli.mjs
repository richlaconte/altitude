#!/usr/bin/env node
// Node-only entry. No imports from the browser component graph, no install hooks.
import { existsSync, lstatSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative, basename } from 'node:path';
import { scan } from './source-check.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const args=process.argv.slice(2);
const command=args.shift() || 'help';
const value = name => { const i=args.indexOf(name); return i<0 ? undefined : args[i+1]; };
const cwd=resolve(value('--cwd') || process.cwd());
const json=args.includes('--json');
const emit = result => console.log(JSON.stringify(result,null,2));
function installed() {
  const path=createRequire(resolve(cwd,'package.json')).resolve('altitude-design/package.json');
  const pkg=JSON.parse(readFileSync(path,'utf8'));
  const guidance=resolve(dirname(path),'dist/guidance');
  const index=JSON.parse(readFileSync(resolve(guidance,'index.json'),'utf8'));
  return {pkg,guidance,index};
}
function managed(text) {
  const starts=[...text.matchAll(/<!-- altitude:start/g)], ends=[...text.matchAll(/<!-- altitude:end -->/g)];
  if (!starts.length && !ends.length) return null;
  if(starts.length!==1 || ends.length!==1) throw new Error('Malformed or duplicate Altitude markers; reconcile them manually.');
  const re=/\n<!-- altitude:start created=(true|false) hash=([a-f0-9]{64}) -->\n([\s\S]*?)<!-- altitude:end -->\n/;
  const m=re.exec(text);
  if(!m || sha(m[3])!==m[2]) throw new Error('The managed Altitude block was edited; preserve your edits and reconcile it manually.');
  return {start:m.index,end:m.index+m[0].length,created:m[1]==='true',body:m[3]};
}
// The block is the one piece of Altitude guidance an agent sees on every turn without deciding to look anything up,
// so it carries what an agent can't work out for itself: that its memory of Altitude is unreliable, where each
// document is (a compact index, read on demand), and the few rules that hold on every screen. No overview prose.
// The agent-setup check keeps it under 8 KB. Evidence: Vercel's Next.js evals (an 8 KB docs index in AGENTS.md
// passed 100% against 53% with no docs) and Gloaguen et al. 2026 (overviews cost ~20% more and didn't help).
function block({pkg,guidance,index},created) {
  const path=relative(cwd,guidance).replaceAll('\\','/');
  // dist/types/index.d.ts only re-exports; each component's props are declared in its own file beside it.
  const declarations=relative(cwd,resolve(guidance,'..','types')).replaceAll('\\','/')+'/';
  const groups=new Map();
  for(const c of index.components||[]) groups.set(c.group,[...(groups.get(c.group)||[]),c.name]);
  const components=groups.size?`Component guides: ${path}/components/<Name>/README.md. Read one before using that component.\n`+[...groups].map(([g,names])=>`${g}|${names.join(',')}`).join('\n')+'\n':'';
  const body=`## Altitude framework (${pkg.version})\n`+
    `Altitude postdates your training data, and its props only look like shadcn's. Prefer these installed docs to what you remember, and check a component's props in its declaration under ${declarations} before using them.\n`+
    `For UI tasks using altitude-design, first read ${path}/README.md, then only the matching pattern document. Read ${path}/visual/README.md before composing a screen and ${path}/visual/Charts.md before any chart, stat or meter.\n`+
    `On every screen: one AltitudeProvider around the app and altitude-design/altitude.css imported once; inputs sunk and buttons raised, never the reverse; one primary action per view; no amount carried by height (charts are flat ink on a ground line: no shadows, 3D, pie or donut); status never colour alone (a word and an icon too); colours, shadows and radii from the tokens, never hard-coded.\n`+
    `Discover tasks with npm exec -- altitude patterns "your intent"; explain a rule with npm exec -- altitude explain RULE-ID.\n`+
    `Record applicable states and application-owned persistence, permissions and navigation.\n`+
    `After changing UI, run npm exec -- altitude check and fix its errors; it reports Altitude's rules that are certain from source (hard-coded colours, the stylesheet and provider, pie charts, OK and Submit labels) and lists likely problems for review.\n`+
    `Run the pattern checks and application service fixtures; distinguish deterministic defects, integration obligations and contextual review.\n`+
    `Use npm exec -- altitude doctor --json after package upgrades, and rerun npm exec -- altitude init to refresh this versioned pointer.\n`+
    components;
  return `\n<!-- altitude:start created=${created} hash=${sha(body)} -->\n${body}<!-- altitude:end -->\n`;
}
function instructionPath(client) {
  const override=resolve(cwd,'AGENTS.override.md');
  if(client==='codex'&&existsSync(override)&&readFileSync(override,'utf8').trim()) return override;
  return resolve(cwd,client==='codex'?'AGENTS.md':'CLAUDE.md');
}
function isSymlink(path) {
  try { return lstatSync(path).isSymbolicLink(); } catch(e) { if(e.code==='ENOENT')return false; throw e; }
}
function init(context) {
  if(context.pkg.version!==context.index.version) throw new Error('Installed package and guidance versions differ; reinstall before setup.');
  const client=value('--client');
  const clients=client==='all'?['codex','claude']:[client];
  if(clients.some(c=>!['codex','claude'].includes(c))) throw new Error('Choose --client codex, claude, or all.');
  const remove=args.includes('--remove');
  // Removal must cover prior targets after Codex's override precedence changes.
  const targets=clients.flatMap(client=>(remove&&client==='codex'
    ? [resolve(cwd,'AGENTS.md'),resolve(cwd,'AGENTS.override.md')]
    : [instructionPath(client)]).map(path=>({client,path})));
  // Prepare every target before any mutation, so malformed input cannot partially apply.
  const changes=targets.map(({client:c,path})=>{
    if(isSymlink(path)) throw new Error(`Refusing instruction symlink: ${path}`);
    const existed=existsSync(path),before=existed?readFileSync(path,'utf8'):'';
    const old=managed(before);
    const replacement=remove?'':block(context,old?.created??!existed);
    const after=old?before.slice(0,old.start)+replacement+before.slice(old.end):before+(remove?'':replacement);
    const deleteFile=remove&&old?.created&&after==='';
    return {client:c,path,before,after,action:deleteFile?'delete':before===after?'unchanged':existed?'update':'create'};
  });
  emit({command:'init',mode:args.includes('--apply')?'apply':'preview',version:context.pkg.version,changes});
  if(args.includes('--apply')) for(const c of changes) {
    if(c.action==='delete') unlinkSync(c.path);
    else if(c.action!=='unchanged') writeFileSync(c.path,c.after);
  }
}
function finding(ruleId,kind,status,observed,expected,repair,verification) {return {ruleId,kind,status,observed,expected,repair,verification};}
function doctor(context) {
  const findings=[];
  if(context.pkg.version!==context.index.version) findings.push(finding('ALT-SETUP-001','deterministic','fail',`Package ${context.pkg.version}; guidance ${context.index.version}`,'Matching versions','Reinstall a coherent package.','altitude doctor --json'));
  const manifest=JSON.parse(readFileSync(resolve(context.guidance,'manifest.json'),'utf8'));
  if(manifest.version!==context.pkg.version) findings.push(finding('ALT-SETUP-001','deterministic','fail',`Manifest ${manifest.version}`,'Manifest matches installed package','Reinstall the package.','altitude doctor --json'));
  for(const [file,digest] of Object.entries(manifest.files)) {
    const path=resolve(context.guidance,file);
    if(!path.startsWith(context.guidance+'/') || !existsSync(path) || sha(readFileSync(path))!==digest) findings.push(finding('ALT-SETUP-001','deterministic','fail',`Missing or modified guidance: ${file}`,'Unmodified version-matched guidance','Reinstall the package.','altitude doctor --json'));
  }
  for(const client of ['codex','claude']) {
    const path=instructionPath(client),file=basename(path);
    try {
      const text=existsSync(path)?readFileSync(path,'utf8'):'';
      const current=managed(text);
      if(current && text.slice(current.start,current.end)!==block(context,current.created)) findings.push(finding('ALT-SETUP-001','deterministic','fail',`${file} points to different guidance`,'Setup matches installed version and location',`altitude init --client ${client} --apply`,'altitude doctor --json'));
      else findings.push(finding('ALT-SETUP-001','deterministic',current?'pass':'not-configured',`${client}: ${current?'managed pointer matches':'no managed pointer'}`,'Explicit setup when agent integration is desired',`altitude init --client ${client}`,'Restart client and inspect loaded instructions.'));
    } catch(e) {findings.push(finding('ALT-SETUP-001','deterministic','fail',`${file}: ${e.message}`,'One intact managed block','Reconcile edited/duplicate markers manually.','altitude doctor --json'));}
  }
  const rules=JSON.parse(readFileSync(resolve(context.guidance,'rules.json'),'utf8')).rules;
  for(const r of rules.filter(r=>r.diagnosticClass!=='deterministic')) findings.push(finding(r.id,r.diagnosticClass,'unverified','CLI has not exercised application behavior or conducted human review.',r.title,r.repair,r.verification));
  const ok=!findings.some(f=>f.kind==='deterministic'&&f.status==='fail');
  emit({command:'doctor',packageVersion:context.pkg.version,guidanceVersion:context.index.version,ok,scope:'Installation and managed pointers only; not accessibility or usability certification.',findings});
  if(!ok)process.exitCode=1;
}
function check(context) {
  const target=resolve(cwd,args.find((v,i)=>!v.startsWith('--') && args[i-1]!=='--cwd') || (existsSync(resolve(cwd,'src'))?'src':'.'));
  if(!existsSync(target)) throw new Error(`No such directory: ${target}`);
  const tokensCss=resolve(context.guidance,'..','tokens.css');
  const tokenNames=new Set(existsSync(tokensCss)?[...readFileSync(tokensCss,'utf8').matchAll(/--([\w-]+)\s*:/g)].map(m=>m[1]):[]);
  const {files,findings}=scan(target,{tokenNames});
  const ok=!findings.some(f=>f.kind==='deterministic');
  const scope='Altitude rules certain from source text only. Not checked: anything that needs the page rendered (contrast, overflow, focus) or a person (accessibility, usability).';
  if(json) emit({command:'check',version:context.pkg.version,target:relative(cwd,target)||'.',files,ok,scope,findings});
  else {
    for(const f of findings) console.log(`${f.ruleId} ${f.kind==='deterministic'?'error ':'review'} ${f.file?`${f.file}${f.line?':'+f.line:''}`:'(project)'}  ${f.observed}\n  ${f.repair}`);
    console.log(`${findings.filter(f=>f.kind==='deterministic').length} errors, ${findings.filter(f=>f.kind!=='deterministic').length} to review in ${files} files. ${scope} Explain a rule: npm exec -- altitude explain RULE-ID`);
  }
  if(!ok)process.exitCode=1;
}
try {
  if(command==='help'||command==='--help') console.log('altitude init --client codex|claude|all [--apply] [--remove]\naltitude patterns [intent] [--json]\naltitude explain RULE-ID [--json]\naltitude doctor [--json]\naltitude check [dir] [--json]\nAll commands resolve the installed package from --cwd PATH (default current directory).');
  else {
    const context=installed();
    if(command==='init')init(context);
    else if(command==='doctor')doctor(context);
    else if(command==='check')check(context);
    else if(command==='patterns') {
      const words=args.filter((v,i)=>!v.startsWith('--') && args[i-1]!=='--cwd').join(' ').toLowerCase().split(/\W+/).filter(Boolean);
      const patterns=context.index.patterns.map(p=>({...p,score:words.reduce((n,w)=>n+(p.intents.some(i=>i===w||i.startsWith(w))?1:0),0)})).filter(p=>!words.length||p.score).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
      if(json)emit({version:context.pkg.version,patterns});else console.log(patterns.length?patterns.map(p=>`${p.id}: ${p.purpose}\n  ${resolve(context.guidance,p.document)}`).join('\n'):'No pattern matched. Run altitude patterns to browse the catalog.');
    } else if(command==='explain') {
      const id=args[0];
      const rule=JSON.parse(readFileSync(resolve(context.guidance,'rules.json'),'utf8')).rules.find(r=>r.id===id);
      if(!rule)throw new Error(`Unknown rule: ${id}`);
      emit({version:context.pkg.version,...rule});
    } else throw new Error(`Unknown command: ${command}`);
  }
} catch(error) {
  emit({ok:false,findings:[finding('ALT-SETUP-001','deterministic','fail',error.message,'Installed altitude-design with coherent guidance and valid command arguments','Install altitude-design locally; check arguments and managed instruction blocks.','altitude doctor --json')]});
  process.exitCode=1;
}
