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
  for (const deferred of ['ActionsInPlace', 'EditRegion', 'ConfirmAction']) assert.equal(deferred in api, false, `${name}: ${deferred} is not a runtime export`);
}
const folder = new URL('../build/test/alt-05/', import.meta.url);
mkdirSync(folder, { recursive: true });
const fixture = new URL('public-api.tsx', folder);
writeFileSync(fixture, `import type * as React from 'react';
import { InlineEdit, Dialog, type InlineEditProps, type InlineEditSaveResult } from '../../../dist/types/index';
import type { InlineEditProps as HandInline, InlineEditSaveResult as HandResult, DialogProps as HandDialog } from '../../../project/components';
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type InlineParity = Assert<Equal<InlineEditProps, HandInline>>;
type ResultParity = Assert<Equal<InlineEditSaveResult, HandResult>>;
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
// @ts-expect-error Background presentation has exactly two accepted values.
const invalidBackground: HandDialog['background'] = 'floating';
void [props, result, dialog, globalInline, invalid, invalidBackground];
`);
const program = ts.createProgram([fileURLToPath(fixture)], { noEmit: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.React, lib: ['lib.es2021.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'] });
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => process.cwd(), getCanonicalFileName: name => name, getNewLine: () => '\n' }));
console.log('ESM, CommonJS and IIFE exports passed; npm, hand-maintained and Window declarations agree; invalid API examples rejected.');
