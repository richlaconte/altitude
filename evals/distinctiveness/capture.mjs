// Renders every screen at 1200 x 1200 (Design Theater's size) and saves a screenshot and a layout tree read from the DOM.
// Sources: generate.mjs runs (<runs>/<condition>--<brief>/site), outside tools (baselines/<date>/<tool>/<brief>/index.html or url.txt),
// and Altitude's pattern previews (build/test/p-<Name>-daylight.html, written by `PAGES_ONLY=1 node shoot.mjs <names> daylight` in build/).
import { chromium } from '../../build/node_modules/playwright-core/index.mjs';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here=fileURLToPath(new URL('./',import.meta.url));
const args=process.argv.slice(2);
const option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
// --runs takes a comma-separated list: the first folder is sample 1, and each later one a repeat (sample 2, 3 …) of the same prompts.
const runs=option('--runs','').split(',').filter(Boolean).map(dir=>resolve(dir));
const baselines=option('--baselines','')&&resolve(option('--baselines',''));
const previews=option('--previews','')&&resolve(option('--previews',''));
const out=resolve(option('--out','build/test/distinctiveness/captures'));mkdirSync(out,{recursive:true});
const {briefs,previews:previewMap}=JSON.parse(readFileSync(join(here,'briefs.json'),'utf8'));
const byId=Object.fromEntries(briefs.map(brief=>[brief.id,brief]));
const screens=[];
runs.forEach((dir,i)=>{for(const name of readdirSync(dir)){
 const [system,brief]=name.split('--');
 if(byId[brief]&&existsSync(join(dir,name,'site/index.html')))screens.push({id:i?`${name}--s${i+1}`:name,system,...pick(byId[brief]),sample:i+1,root:join(dir,name,'site')});
}});
// An outside tool's build is a folder per brief holding index.html (a saved or exported page) or url.txt (a published preview).
if(baselines)for(const tool of readdirSync(baselines).filter(name=>statSync(join(baselines,name)).isDirectory()))for(const brief of readdirSync(join(baselines,tool)).filter(name=>byId[name])){
 const dir=join(baselines,tool,brief);
 if(existsSync(join(dir,'index.html')))screens.push({id:`${tool}--${brief}`,system:tool,...pick(byId[brief]),root:dir});
 else if(existsSync(join(dir,'url.txt')))screens.push({id:`${tool}--${brief}`,system:tool,...pick(byId[brief]),url:readFileSync(join(dir,'url.txt'),'utf8').trim()});
}
if(previews)for(const [task,name] of Object.entries(previewMap).filter(([key])=>key!=='note')){
 const file=join(previews,`p-${name}-daylight.html`);
 if(existsSync(file))screens.push({id:`altitude-preview--${task}`,system:'altitude-preview',brief:null,task,domain:null,file});
 else console.warn('missing preview',file,'(run PAGES_ONLY=1 node shoot.mjs',name,'daylight in build/)');
}
function pick(brief){return {brief:brief.id,task:brief.task,domain:brief.domain};}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.woff':'font/woff','.json':'application/json','.jpg':'image/jpeg','.ico':'image/x-icon'};
// Vite builds use absolute /assets paths, so each site is served from its own root rather than opened as a file.
function serve(root){
 return new Promise(done=>{
  const server=createServer((request,response)=>{
   let path=join(root,decodeURIComponent(new URL(request.url,'http://x').pathname));
   if(existsSync(path)&&statSync(path).isDirectory())path=join(path,'index.html');
   if(!path.startsWith(root)||!existsSync(path)){response.writeHead(404).end();return;}
   response.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream'}).end(readFileSync(path));
  }).listen(0,'127.0.0.1',()=>done(server));
 });
}
// The layout tree keeps what a screen parser would see: boxes that draw something, and the content inside them.
// A wrapper that draws nothing and holds one child is replaced by that child, so framework nesting doesn't count as layout.
const readLayout=()=>{
 const W=innerWidth,H=innerHeight;
 const kind=el=>{
  const tag=el.tagName.toLowerCase(),role=el.getAttribute('role');
  if(['input','select','textarea'].includes(tag)||['textbox','combobox','checkbox','switch','slider','radio','searchbox','spinbutton'].includes(role))return 'input';
  if(tag==='button'||['button','tab','menuitem','option'].includes(role))return 'button';
  if(tag==='a'&&el.hasAttribute('href')||role==='link')return 'link';
  if(['img','svg','canvas','video','picture'].includes(tag)||role==='img')return 'image';
  if(role==='table'||tag==='table')return 'table';
  return null;
 };
 const draws=(el,cs)=>{
  if(cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&cs.backgroundColor!=='transparent')return true;
  if(cs.backgroundImage!=='none')return true;
  if(cs.boxShadow!=='none')return true;
  return ['Top','Right','Bottom','Left'].some(side=>parseFloat(cs[`border${side}Width`])>0&&cs[`border${side}Style`]!=='none'&&!cs[`border${side}Color`].endsWith(', 0)'));
 };
 const visit=el=>{
  const cs=getComputedStyle(el);
  if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return null;
  const box=el.getBoundingClientRect();
  if(box.width<1||box.height<1||box.right<=0||box.bottom<=0||box.left>=W||box.top>=H)return cs.display==='contents'?{type:'container',children:[...el.children].map(visit).filter(Boolean)}:null;
  const own=kind(el);
  if(own==='image'||own==='input')return {type:own,children:[]};
  const text=[...el.childNodes].some(node=>node.nodeType===3&&node.textContent.trim());
  const children=[...el.children].map(visit).filter(Boolean);
  if(text)children.unshift({type:'text',children:[]});
  if(own)return {type:own,children};
  if(!draws(el,cs)){if(children.length===1)return children[0];if(!children.length)return null;}
  return {type:'container',children};
 };
 return visit(document.body)||{type:'container',children:[]};
};
// Proportions: how dense a screen is and how its text is weighted, read where Altitude's look is set (control
// height, label weight, the title's size). Descriptive, beside the distances.
const readProportions=()=>{
 const H=innerHeight,walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 let chars=0,label=0,title=0,top=1e9,bottom=0,left=1e9,right=0,node;
 while((node=walker.nextNode())){
  const text=node.textContent.trim(),el=node.parentElement;if(!text||!el)continue;
  const box=el.getBoundingClientRect(),cs=getComputedStyle(el);
  if(!box.width||box.top>=H||box.bottom<=0||cs.visibility==='hidden'||+cs.opacity===0)continue;
  chars+=text.length;if(+cs.fontWeight>=500&&+cs.fontWeight<700)label+=text.length;
  title=Math.max(title,parseFloat(cs.fontSize));
  top=Math.min(top,box.top);bottom=Math.max(bottom,Math.min(box.bottom,H));left=Math.min(left,box.left);right=Math.max(right,box.right);
 }
 // A table's sort headers and a chart's focusable plot are controls too, but they'd measure what's on the screen, not the controls' size.
 const controls=[...document.querySelectorAll('button,select,input:not([type=checkbox]):not([type=radio]):not([type=hidden]),[role=button],[role=combobox]')]
  .filter(el=>!el.closest('th,[role=columnheader]')).map(el=>el.getBoundingClientRect()).filter(box=>box.height>=16&&box.height<=64&&box.top<H&&box.bottom>0).map(box=>Math.round(box.height)).sort((a,b)=>a-b);
 return {chars,textDensity:chars?+(chars/((bottom-top)*(right-left))*1e4).toFixed(2):0,labelShare:chars?+(label/chars).toFixed(3):0,titlePx:title,controls:controls.length,controlHeight:controls.length?controls[controls.length>>1]:null};
};
// Elevation (#383): what each character of text sits on. Its surface is the nearest ancestor of at least 120 x 60 that draws
// something different from the page's ground, and the surface's class is read from how it draws: sunk (an inset shadow
// with blur: a field or well, even with a light lip under it), raised (an outer shadow with blur), outlined (a border, or
// a ring or hard line with no blur), filled (a fill alone), or ground (no surface). Where Altitude's tokens resolve on the page, the surface's tier is read too: the
// --elev-N or --well its box-shadow begins with. Shares are of characters, so a raised card full of text counts for more
// than an empty one.
const readElevation=()=>{
 const H=innerHeight,probe=document.createElement('div');document.body.appendChild(probe);
 const tiers=[];
 for(const name of ['elev-0','elev-1','elev-2','elev-3','elev-4','elev-5','well']){probe.style.boxShadow=`var(--${name})`;const value=getComputedStyle(probe).boxShadow;if(value&&value!=='none')tiers.push([value,name]);}
 probe.remove();tiers.sort((a,b)=>b[0].length-a[0].length);
 // Colours are resolved through a 1 x 1 canvas, so oklch, oklab, color-mix and hex all compare as rgba.
 const ctx=Object.assign(document.createElement('canvas'),{width:1,height:1}).getContext('2d',{willReadFrequently:true}),seen=new Map();
 const rgba=colour=>{if(seen.has(colour))return seen.get(colour);ctx.clearRect(0,0,1,1);ctx.fillStyle='rgba(0,0,0,0)';ctx.fillStyle=colour;ctx.fillRect(0,0,1,1);const [r,g,b,a]=ctx.getImageData(0,0,1,1).data;const value=[r,g,b,a/255];seen.set(colour,value);return value;};
 const alpha=colour=>rgba(colour)[3];
 const same=(a,b)=>{const x=rgba(a),y=rgba(b);return x.every((v,i)=>Math.abs(v-y[i])<(i===3?0.02:3));};
 const COLOUR=/(?:[a-z-]+\((?:[^()]|\([^()]*\))*\)|#[0-9a-f]{3,8}\b|\btransparent\b|\bcurrentcolor\b)/i;
 const layers=value=>value==='none'?[]:value.split(/,(?![^(]*\))/).map(layer=>{const colour=(layer.match(COLOUR)||['rgb(0,0,0)'])[0];const n=layer.replace(colour,'').match(/-?[\d.]+(?:px)?(?=\s|$)/g)?.map(parseFloat)||[];return {inset:/\binset\b/.test(layer),a:alpha(colour),x:n[0]||0,y:n[1]||0,blur:n[2]||0,spread:n[3]||0};}).filter(l=>l.a>0);
 // The ground is the fill of the deepest element that covers the screen (a page wrapper often paints it, not the body).
 const W=innerWidth,covers=el=>{if(el===document.body||el===document.documentElement)return true;const b=el.getBoundingClientRect();return b.left<=W*0.025&&b.right>=W*0.975&&b.top<=8&&b.bottom>=Math.min(H,document.documentElement.scrollHeight)*0.9;};
 const ground=(()=>{let colour='rgb(255, 255, 255)';for(const el of [document.documentElement,document.body,...document.body.querySelectorAll('*')]){if(!covers(el))continue;const bg=getComputedStyle(el).backgroundColor;if(alpha(bg)>0.5)colour=bg;}return colour;})();
 const cache=new Map();
 const classify=el=>{
  if(cache.has(el))return cache.get(el);
  let result=null;const box=el.getBoundingClientRect();
  if(box.width>=120&&box.height>=60&&!covers(el)){
   const cs=getComputedStyle(el),shadow=layers(cs.boxShadow),bg=cs.backgroundColor;
   const tier=cs.boxShadow==='none'?null:(tiers.find(([value])=>cs.boxShadow.startsWith(value))||[])[1]||null;
   const border=['Top','Right','Bottom','Left'].some(side=>parseFloat(cs[`border${side}Width`])>0&&cs[`border${side}Style`]!=='none'&&alpha(cs[`border${side}Color`])>0);
   const filled=alpha(bg)>0&&!same(bg,ground);
   const kind=shadow.some(l=>l.inset&&l.blur>0)?'sunk':shadow.some(l=>!l.inset&&l.blur>0)?'raised':border||shadow.some(l=>!l.inset&&l.spread>0)?'outlined':filled?'filled':null;
   if(kind)result={kind,tier,box};
  }
  cache.set(el,result);return result;
 };
 const share={raised:0,sunk:0,outlined:0,filled:0,ground:0},tierShare={};let chars=0;const raised=new Set();
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  const text=node.textContent.trim(),el=node.parentElement;if(!text||!el)continue;
  const box=el.getBoundingClientRect(),cs=getComputedStyle(el);
  if(!box.width||box.top>=H||box.bottom<=0||cs.visibility==='hidden'||+cs.opacity===0)continue;
  let surface=null;for(let at=el;at&&!surface;at=at.parentElement)surface=classify(at);
  chars+=text.length;share[surface?surface.kind:'ground']+=text.length;
  if(surface?.tier)tierShare[surface.tier]=(tierShare[surface.tier]||0)+text.length;
  if(surface?.kind==='raised'&&surface.box.top<H)raised.add(surface);
 }
 const round=n=>chars?+(n/chars).toFixed(3):0;
 return {chars,tokens:tiers.length>0,...Object.fromEntries(Object.entries(share).map(([k,v])=>[k,round(v)])),tiers:Object.fromEntries(Object.entries(tierShare).map(([k,v])=>[k,round(v)])),raisedSurfaces:raised.size};
};
const count=node=>1+node.children.reduce((n,child)=>n+count(child),0);
const browser=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{});
const index=[];
for(const screen of screens)screen.sample??=1;
for(const screen of screens){
 const server=screen.root?await serve(screen.root):null;
 const page=await browser.newPage({viewport:{width:1200,height:1200},deviceScaleFactor:1,colorScheme:'light'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(screen.url||(server?`http://127.0.0.1:${server.address().port}/`:`file://${screen.file}`),{waitUntil:'networkidle',timeout:30000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1500);
  // Entrance animations are finished, so every screen is read at rest.
  await page.evaluate(()=>document.getAnimations().forEach(animation=>{try{if(animation.effect?.getTiming().iterations!==Infinity)animation.finish();}catch{}}));
  await page.waitForTimeout(200);
  await page.screenshot({path:join(out,`${screen.id}.png`)});
  const layout=await page.evaluate(readLayout);
  writeFileSync(join(out,`${screen.id}.layout.json`),JSON.stringify(layout));
  const proportions=await page.evaluate(readProportions);
  const elevation=await page.evaluate(readElevation);
  index.push({id:screen.id,system:screen.system,brief:screen.brief,task:screen.task,domain:screen.domain,sample:screen.sample,nodes:count(layout),proportions,elevation,errors});
  console.log(screen.id,count(layout),'nodes',errors.length?`${errors.length} page errors`:'');
 }catch(error){console.warn(screen.id,'not captured:',error.message);}
 await page.close();server?.close();
}
await browser.close();
writeFileSync(join(out,'index.json'),JSON.stringify({capturedAt:new Date().toISOString(),viewport:'1200x1200',screens:index},null,2)+'\n');
