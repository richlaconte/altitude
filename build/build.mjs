import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
const names = ['AltitudeProvider','Surface','Button','HoldButton','SplitButton','CopyButton','Toggle','ToggleGroup','Toolbar','Card','Table','FilterBar','DataGrid','Pile','Input','NumberInput','InputOTP','PasswordInput','SecretField','InlineEdit','EditRegion','ItemGroup','RemovalReceipt','PropertyList','Field','Select','Combobox','TagInput','DatePicker','TimeInput','Checkbox','RadioGroup','ColorPicker','Switch','Tabs','Slider','Progress','Badge','Separator','Link','FormattedNumber','RelativeTime','Avatar','Skeleton','Await','Alert','Accordion','Kbd','CodeBlock','ScrollArea','SortableList','Checklist','Board','Schedule','DropZone','EmptyState','ChartContainer','BarChart','LineChart','AreaChart','Heatmap','ScatterChart','Sparkline','Stat','Meter','BarList','ChartTooltip','ChartLegend','ChartBrush','ChartReference','ChartAnnotation','Drilldown','Breadcrumb','Pagination','PageHeader','AppShell','Tree','Stepper','Tooltip','HoverCard','Popover','DropdownMenu','Dialog','Sheet','Resizable','CommandPalette','Toaster','ErrorSummary','WorkflowStatus'];
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
