import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
const names = ['AltitudeProvider','Surface','Button','HoldButton','Card','Table','Pile','Input','InlineEdit','Field','Select','Combobox','TagInput','Checkbox','RadioGroup','Switch','Tabs','Slider','Progress','Badge','Avatar','Skeleton','Await','Alert','Accordion','Kbd','ScrollArea','SortableList','Board','DropZone','EmptyState','Drilldown','Stepper','Tooltip','HoverCard','Popover','DropdownMenu','Dialog','Sheet','CommandPalette','Toaster'];
const header = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: 'Altitude', components: names.map((name) => ({ name })) })} */`;
const globals = { name: 'globals', setup(b) {
  b.onResolve({ filter: /^react(-dom)?$/ }, (a) => ({ path: a.path, namespace: 'g' }));
  b.onLoad({ filter: /.*/, namespace: 'g' }, (a) => ({ contents: `module.exports = window.${a.path === 'react' ? 'React' : 'ReactDOM'};`, loader: 'js' }));
}};
const out = '../project/components/bundle.js';
await build({ entryPoints: ['../project/components/src/index.tsx'], bundle: true, format: 'iife', globalName: 'Altitude',
  outfile: out, minify: true, target: 'es2020', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
  plugins: [globals], banner: { js: header }, legalComments: 'none' });
let s = readFileSync(out, 'utf8');
if (/<\/script|<!--/i.test(s)) throw new Error('forbidden sequence in bundle');
s = s.replace(/^(\/\* @ds-bundle[^\n]*\*\/)\n/, '$1\n') ;
writeFileSync(out, s.trimEnd() + '\nwindow.Altitude = Altitude;\n');
console.log('ok', s.length);
