// Check the shipped entry points and both declaration surfaces after npm run build.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const esm = await import('../dist/index.js');
const cjs = require('../dist/index.cjs');
const window = { React, ReactDOM };
vm.runInNewContext(readFileSync(new URL('../dist/altitude.iife.js', import.meta.url), 'utf8'), { window, React, ReactDOM, console, setTimeout, clearTimeout });
for (const [name, api] of Object.entries({ esm, cjs, iife: window.Altitude })) {
  assert.equal(typeof api.InlineEdit, 'function', `${name}: InlineEdit export`);
  assert.equal(typeof api.Dialog, 'function', `${name}: Dialog export`);
  for (const part of ['EditRegion', 'EditRegionView', 'EditRegionForm', 'EditRegionTrigger', 'EditRegionActions']) assert.equal(typeof api[part], 'function', `${name}: ${part} export`);
  for (const deferred of ['ActionsInPlace', 'ConfirmAction']) assert.equal(deferred in api, false, `${name}: ${deferred} is not a runtime export`);
}
// altitude-design/chart-themes: its own subpath, importing nothing but React, usable with tokens by name and no DOM.
const themesEsm = await import('../dist/chart-themes.js');
const themesCjs = require('../dist/chart-themes.cjs');
const daylight = Object.fromEntries([...JSON.parse(readFileSync(new URL('../dist/tokens.json', import.meta.url), 'utf8')).color.tokens].map(t => [t.name, typeof t.value === 'string' ? t.value : t.value.daylight]));
for (const [name, api] of Object.entries({ esm: themesEsm, cjs: themesCjs })) {
  for (const fn of ['echartsTheme', 'chartjsDefaults', 'dataColors', 'readChartTokens', 'useChartTheme']) assert.equal(typeof api[fn], 'function', `chart-themes ${name}: ${fn} export`);
  assert.equal(api.echartsTheme(daylight).color[0], daylight['data-1'], `chart-themes ${name}: echartsTheme from tokens by name`);
}
const themeImports = [...readFileSync(new URL('../dist/chart-themes.js', import.meta.url), 'utf8').matchAll(/^import .* from ["']([^"']+)["']/gm)].map(m => m[1]);
assert.deepEqual(themeImports, ['react'], `chart-themes imports only React (${themeImports})`);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
for (const path of [pkg.exports['./chart-themes'].import.types, pkg.exports['./chart-themes'].import.default, pkg.exports['./chart-themes'].require.types, pkg.exports['./chart-themes'].require.default]) readFileSync(new URL('../' + path, import.meta.url));
const folder = new URL('../build/test/alt-05/', import.meta.url);
mkdirSync(folder, { recursive: true });
const fixture = new URL('public-api.tsx', folder);
writeFileSync(fixture, `import type * as React from 'react';
import { InlineEdit, Dialog, type InlineEditProps, type InlineEditSaveResult, type EditRegionProps, type EditRegionSaveResult } from '../../../dist/types/index';
import type { InlineEditProps as HandInline, InlineEditSaveResult as HandResult, DialogProps as HandDialog, EditRegionProps as HandRegion, EditRegionSaveResult as HandRegionResult } from '../../../project/components';
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type InlineParity = Assert<Equal<InlineEditProps, HandInline>>;
type ResultParity = Assert<Equal<InlineEditSaveResult, HandResult>>;
type Contact = { name: string; email: string };
type RegionParity = Assert<Equal<EditRegionProps<Contact>, HandRegion<Contact>>>;
type RegionResultParity = Assert<Equal<EditRegionSaveResult<Contact>, HandRegionResult<Contact>>>;
type BackgroundParity = Assert<Equal<React.ComponentProps<typeof Dialog>['background'], HandDialog['background']>>;
type ReturnParity = Assert<Equal<React.ComponentProps<typeof Dialog>['returnFocus'], HandDialog['returnFocus']>>;
const props: InlineEditProps = { label: 'Name', value: 'Brand.pdf', onValueChange: value => void value,
  onSave: async (draft, {previousValue}) => ({ok: true, value: draft || previousValue}),
  validate: async value => value.trim() ? undefined : 'Enter a name', focusFallback: () => null };
const result: InlineEditSaveResult = {ok: false, error: 'Try again'};
const dialog: React.ComponentProps<typeof Dialog> = {title: 'Delete file?', background: 'stationary', returnFocus: () => null};
const globalInline: typeof InlineEdit = window.Altitude.InlineEdit;
// @ts-expect-error A successful save must publish a canonical string.
const invalid: InlineEditSaveResult = {ok: true};
// @ts-expect-error A failed region save needs a message.
const invalidRegion: EditRegionSaveResult<Contact> = {ok: false};
// @ts-expect-error Background presentation has exactly two accepted values.
const invalidBackground: HandDialog['background'] = 'floating';
void [props, result, dialog, globalInline, invalid, invalidBackground, invalidRegion];
`);
const program = ts.createProgram([fileURLToPath(fixture)], { noEmit: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.React, lib: ['lib.es2021.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'] });
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => process.cwd(), getCanonicalFileName: name => name, getNewLine: () => '\n' }));
console.log('ESM, CommonJS and IIFE exports passed; chart-themes subpath passed; npm, hand-maintained and Window declarations agree; invalid API examples rejected.');
