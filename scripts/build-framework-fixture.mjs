// Runnable reference fixture using one installed Altitude/React graph.
// Consumer prerequisite: npm install --save-dev esbuild
// node PATH/TO/THIS/SCRIPT --out PATH
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const args=process.argv.slice(2),output=args[args.indexOf('--out')+1];
if(!args.includes('--out')||!output||output.startsWith('--'))throw Error('Supply --out PATH for the generated preview files.');
const out=resolve(output),require=createRequire(resolve(process.cwd(),'package.json'));
const pkg=dirname(require.resolve('altitude-design/package.json'));
const fixture=resolve(dirname(fileURLToPath(import.meta.url)),'../build/fixtures/pattern-workflows.tsx');
mkdirSync(out,{recursive:true});
await build({stdin:{contents:`import * as React from 'react'; import {createRoot} from 'react-dom/client'; import {AltitudeProvider} from 'altitude-design'; import {PatternWorkflows} from ${JSON.stringify(fixture)}; createRoot(document.getElementById('root')).render(<AltitudeProvider><PatternWorkflows/></AltitudeProvider>);`,loader:'tsx',resolveDir:process.cwd()},
  alias:{react:dirname(require.resolve('react/package.json')),'react-dom':dirname(require.resolve('react-dom/package.json')),'altitude-design':resolve(pkg,'dist/index.js')},
  bundle:true,format:'iife',outfile:resolve(out,'bundle.js'),define:{'process.env.NODE_ENV':'"development"'}});
writeFileSync(resolve(out,'altitude.css'),readFileSync(resolve(pkg,'dist/altitude.no-fonts.css')));
writeFileSync(resolve(out,'index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Altitude workflow examples</title><link rel="stylesheet" href="altitude.css"><style>main{max-width:48rem;margin:auto;padding:1rem}section{margin-block:2rem;display:grid;gap:1rem}form{display:grid;gap:1rem}h1,h2,p,li{overflow-wrap:anywhere}button{margin-inline-end:.5rem}</style><body><div id="root"></div><script src="bundle.js"></script></body></html>');
console.log(`Open ${resolve(out,'index.html')}. This demo uses in-memory data; reload resets it.`);
