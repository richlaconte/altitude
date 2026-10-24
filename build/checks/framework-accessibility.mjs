import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const require=createRequire(import.meta.url);
const root=fileURLToPath(new URL('../../',import.meta.url));
const folder=join(root,'build/test/framework-accessibility');mkdirSync(folder,{recursive:true});
const browser=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{});
const names=['EditRecord','AsyncCollection','ConsequentialAction','ReviewSubmit'];
let states=0;
try{
 for(const name of names){
  const page=await browser.newPage({viewport:{width:960,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+join(process.env.ALT_FIXTURE_ROOT || join(root,'build/test/react19'),`p-${name}-daylight.html`));
  const scan=async state=>{
   await page.evaluate(async()=>{await Promise.race([Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,1500))]);});
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
   assert.deepEqual(result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),[],`${name}/${state} axe findings`);states++;
  };
  await page.getByRole('heading',{level:2}).first().waitFor();await scan('initial');
  if(name==='EditRecord'){
   const input=page.getByRole('textbox',{name:'Workspace name'});await input.fill('');await page.getByRole('button',{name:'Save changes'}).click();await scan('invalid');
   await page.getByRole('link',{name:'Workspace name: Enter a workspace name.'}).click();assert.ok(await input.evaluate(el=>document.activeElement===el));
   await input.fill('A deliberately long workspace name for localized content wrapping and preserved edits');
   await page.getByRole('button',{name:'Demo service'}).click();await page.getByRole('option',{name:'Save fails',exact:true}).click();await page.getByRole('button',{name:'Save changes'}).click();await page.getByRole('status').filter({hasText:'could not save'}).waitFor();await scan('failed');
   await page.getByRole('button',{name:'Demo service'}).click();await page.getByRole('option',{name:'Save succeeds',exact:true}).click();await page.getByRole('button',{name:'Save changes'}).click();await page.getByRole('status').filter({hasText:'Changes saved'}).waitFor();await scan('saved');
  }else if(name==='AsyncCollection'){
   await page.getByRole('textbox',{name:'Search projects'}).fill('no matches');await page.getByRole('status').filter({hasText:'No matching results'}).waitFor();await scan('no-results');
   await page.getByRole('button',{name:'Clear search'}).click();await page.getByRole('status').filter({hasText:'3 results'}).waitFor();await scan('populated');
  }else if(name==='ConsequentialAction'){
   await page.getByRole('button',{name:'Move to trash',exact:true}).click();await page.getByRole('dialog').waitFor();await scan('confirmation');await page.getByRole('button',{name:'Keep file'}).click();
  }else{
   await page.getByRole('button',{name:'Review request'}).click();await scan('invalid');await page.getByRole('textbox',{name:'Request name'}).fill('Localized planning request with a deliberately long title');await page.getByRole('button',{name:'Review request'}).click();await scan('review');await page.getByRole('button',{name:'Send request',exact:true}).click();await page.getByRole('heading',{name:'Request received'}).waitFor();await scan('complete');
  }
  for(const scheme of ['daylight','nightfall','mesa','alpine']){
   await page.setViewportSize({width:320,height:900});await page.evaluate(scheme=>{document.documentElement.setAttribute('data-theme',scheme);document.documentElement.dir='rtl';},scheme);
   await page.emulateMedia({reducedMotion:'reduce',forcedColors:scheme==='daylight'?'active':'none'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}/${scheme} 320px RTL overflow`);
   await scan(`${scheme}-320-rtl-reduced`);await page.screenshot({path:join(folder,`${name}-${scheme}.png`),fullPage:true});
  }
  assert.deepEqual(errors,[],`${name} page errors`);await page.close();
 }
 console.log(`${states} meaningful state/mode axe scans; keyboard error navigation, 320px RTL, long content, reduced motion, forced colors and all schemes passed. Manual AT/usability remains unperformed.`);
}finally{await browser.close();}
