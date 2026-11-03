// project/components/index.d.ts is written by hand: the declarations of window.Altitude that ship with the design
// system (and that the site's llms.txt links). The npm package's types are tsc's output of the sources instead. This
// keeps the two in step: every name the sources export is declared by hand, and nothing is declared that the sources
// don't export (#424). Names only; props are compared through the examples (checks/examples.mjs).
//   node checks/declarations.mjs
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ts = createRequire(resolve(root, 'package.json'))('typescript');

// Exported on purpose by one side only, with the reason.
const ALLOWED = {
  sourcesOnly: {},
  declaredOnly: {},
};

function exportsOf(file) {
  const program = ts.createProgram([file], { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2020, skipLibCheck: true, noEmit: true, allowJs: false });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const symbol = checker.getSymbolAtLocation(source);
  // Runtime values only (components, hooks, functions, constants): what window.Altitude and the bundle carry.
  // Which types each side exports is a separate decision (#432).
  const value = (s) => { const t = s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s; return !!(t.flags & ts.SymbolFlags.Value); };
  return new Set(checker.getExportsOfModule(symbol).filter(value).map((s) => s.getName()));
}

const sources = exportsOf(resolve(root, 'project/components/src/index.tsx'));
const declared = exportsOf(resolve(root, 'project/components/index.d.ts'));
const missing = [...sources].filter((n) => !declared.has(n) && !ALLOWED.sourcesOnly[n]).sort();
const extra = [...declared].filter((n) => !sources.has(n) && !ALLOWED.declaredOnly[n]).sort();
if (missing.length || extra.length) {
  if (missing.length) console.error(`Exported by the sources but not declared in project/components/index.d.ts (${missing.length}): ${missing.join(', ')}`);
  if (extra.length) console.error(`Declared in project/components/index.d.ts but not exported by the sources (${extra.length}): ${extra.join(', ')}`);
  process.exit(1);
}
console.log(`declarations: project/components/index.d.ts declares the same ${sources.size} names the sources export`);
