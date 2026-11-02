// A fresh workspace for each condition, as generate.mjs gives it to the agent and rebuild.mjs recreates it from evidence.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here=fileURLToPath(new URL('./',import.meta.url));
export const quiet={stdio:'pipe',timeout:300000};
export function setup(condition,workspace,tarball){
 if(condition==='claude-plain'){writeFileSync(join(workspace,'README.md'),'# Product workspace\n\nWrite the requested screen as a single self-contained `index.html` in this folder.\n');return;}
 if(condition==='claude-shadcn'){
  cpSync(join(here,'starters/shadcn'),workspace,{recursive:true});
  execFileSync('npm',['ci','--prefer-offline','--no-audit','--no-fund'],{cwd:workspace,...quiet});
  return;
 }
 mkdirSync(join(workspace,'src'));
 writeFileSync(join(workspace,'package.json'),JSON.stringify({name:'product-workspace',private:true,type:'module',scripts:{build:'node build.mjs'},dependencies:{'altitude-design':tarball,react:'19.3.0','react-dom':'19.3.0'},devDependencies:{esbuild:'0.28.2'}},null,2));
 execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund'],{cwd:workspace,...quiet});
 writeFileSync(join(workspace,'README.md'),'# Product workspace\n\nImplement the requested screen in `src/main.tsx` and any files under `src/`. React and Altitude are installed. `npm run build` writes `dist/`.\n');
 // altitude.css, not the pilot's no-fonts file: shadcn's starter bundles its font too.
 writeFileSync(join(workspace,'src/main.tsx'),`import * as React from 'react';import {createRoot} from 'react-dom/client';import {AltitudeProvider} from 'altitude-design';import 'altitude-design/altitude.css';function App(){return <main><h1>Workspace</h1></main>};createRoot(document.getElementById('root')!).render(<AltitudeProvider><App/></AltitudeProvider>);`);
 writeFileSync(join(workspace,'build.mjs'),`import {build} from 'esbuild';import{mkdirSync,writeFileSync}from'node:fs';mkdirSync('dist',{recursive:true});await build({entryPoints:['src/main.tsx'],bundle:true,outfile:'dist/app.js',jsx:'transform',loader:{'.woff2':'file','.woff':'file','.svg':'file','.png':'file'},define:{'process.env.NODE_ENV':'"production"'}});writeFileSync('dist/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workspace</title><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script src="app.js"></script></body></html>');`);
 const installed=JSON.parse(readFileSync(join(workspace,'node_modules/altitude-design/package.json'),'utf8'));
 execFileSync(process.execPath,[join(workspace,'node_modules/altitude-design',installed.bin.altitude),'init','--client','claude','--apply'],{cwd:workspace,...quiet});
}
