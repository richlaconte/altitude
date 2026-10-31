// Copies a benchmark's evidence into results/<date>/ and writes its tables (tables.md); the report's prose is written by hand.
// Usage: node report.mjs --runs <generate.mjs out>[,<repeat out>…] --captures <capture.mjs out> --results evals/distinctiveness/results/<date>
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, cpSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const here=fileURLToPath(new URL('./',import.meta.url));
const args=process.argv.slice(2);
const option=key=>{const i=args.indexOf(key);if(i<0)throw Error(`${key} is required`);return resolve(args[i+1]);};
// --runs is the same comma-separated list capture.mjs took: sample 1, then repeats.
const runs=(args[args.indexOf('--runs')+1]||'').split(',').filter(Boolean).map(dir=>resolve(dir));
const captures=option('--captures'),results=option('--results');
const data=JSON.parse(readFileSync(join(results,'results.json'),'utf8'));
mkdirSync(join(results,'screens'),{recursive:true});mkdirSync(join(results,'builds'),{recursive:true});
for(const screen of data.screens)cpSync(join(captures,`${screen.id}.png`),join(results,'screens',`${screen.id}.png`));
const metas=[];
runs.forEach((dir,i)=>{for(const name of readdirSync(dir).filter(name=>existsSync(join(dir,name,'run.json')))){
 const meta=JSON.parse(readFileSync(join(dir,name,'run.json'),'utf8'));if(i)meta.id=`${meta.id}--s${i+1}`;metas.push(meta);
 const dest=join(results,'builds',meta.id);mkdirSync(dest,{recursive:true});
 writeFileSync(join(dest,'run.json'),JSON.stringify(meta,null,2)+'\n');
 // Files the agent left as the starter had them aren't evidence of anything, so only changed and new files are kept.
 const starter=join(here,'starters',meta.condition.replace(/^claude-/,''),'src');
 if(existsSync(join(dir,name,'src')))cpSync(join(dir,name,'src'),join(dest,'src'),{recursive:true,filter:source=>{const twin=join(starter,relative(join(dir,name,'src'),source));return !(existsSync(twin)&&statSync(source).isFile()&&readFileSync(twin).equals(readFileSync(source)));}});
 if(existsSync(join(dir,name,'src.html')))cpSync(join(dir,name,'src.html'),join(dest,'index.html'));
}});
const measures={visual:'Visual (1 − UIClip cosine)',tiles:'Tiles (matched 3 × 3, 1 − cosine)',colour:'Colour (EMD, ΔE)',layout:'Layout (normalised tree edit distance)'};
const systems=Object.keys(data.distanceFromCentre.visual);
const cell=value=>value==null?'–':String(value);
const table=(head,rows)=>[`| ${head.join(' | ')} |`,`|${head.map(()=>'---').join('|')}|`,...rows.map(row=>`| ${row.join(' | ')} |`)].join('\n');
const out=[`<!-- Written by report.mjs from results.json; don't edit by hand. -->`,''];
out.push('## Runs','',table(['Run','Generation','Build','Minutes','Cost (USD)','Skills called'],metas.sort((a,b)=>a.id.localeCompare(b.id)).map(meta=>[meta.id,meta.generation,meta.build||'–',meta.elapsedMs?(meta.elapsedMs/60000).toFixed(1):'–',meta.usage?.costUSD!=null?meta.usage.costUSD.toFixed(2):'–',Object.keys(meta.toolUse||{}).filter(name=>name.startsWith('Skill(')).map(name=>name.slice(6,-1)).join(', ')||'none'])));
const total=metas.reduce((n,meta)=>n+(meta.usage?.costUSD||0),0);
out.push('',`${metas.length} runs, ${total.toFixed(2)} USD in all.`,'');
out.push('## Distance from the centre','',`Mean distance from a system's screens to the baselines' (${data.baselines.join(', ')}) screens of the same briefs. Higher is further from the default.`,'',table(['System',...Object.values(measures)],systems.map(system=>[system,...Object.keys(measures).map(m=>cell(data.distanceFromCentre[m][system]))])),'');
const repeated=systems.filter(system=>data.noiseFloor?.visual[system]!=null);
if(repeated.length)out.push('## Noise floor','',"Mean distance between one system's repeat builds of the same prompt. A gap between systems smaller than this is noise.",'',table(['System','Pairs',...Object.values(measures)],repeated.map(system=>[system,String(data.noisePairs.filter(pair=>pair.system===system).length),...Object.keys(measures).map(m=>cell(data.noiseFloor[m][system]))])),'');
out.push('## Creative range','',"Mean distance between a system's two domain builds of each task. Higher means it varies more with the product.",'',table(['System',...Object.values(measures)],systems.filter(system=>data.creativeRange.visual[system]!=null).map(system=>[system,...Object.keys(measures).map(m=>cell(data.creativeRange[m][system]))])),'');
out.push('## Task range','',"Mean distance between a system's builds of different tasks. Low layout here means every screen gets the same frame (tell LA5).",'',table(['System',...Object.values(measures)],systems.filter(system=>data.taskRange?.visual[system]!=null).map(system=>[system,...Object.keys(measures).map(m=>cell(data.taskRange[m][system]))])),'');
for(const [m,label] of Object.entries(measures))out.push(`## ${label}, system against system`,'',table(['',...systems],systems.map(x=>[x,...systems.map(y=>x===y?'·':cell(data.matrix[m][x][y]))])),'');
writeFileSync(join(results,'tables.md'),out.join('\n'));
console.log('wrote',join(results,'tables.md'));
