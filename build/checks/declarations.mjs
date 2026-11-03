// project/components/index.d.ts is written by hand: the declarations of window.Altitude that ship with the design
// system (and that the site's llms.txt links). The npm package's types are tsc's output of the sources instead. This
// keeps the two in step (#424, #432):
//   - every value (component, hook, function, constant) and every type the sources export is declared by hand, and
//     nothing is declared that the sources don't export;
//   - every type both sides have has the same property names, own and inherited.
// Property names, not assignability: a prop missing on one side is optional more often than not, and two object types
// that differ only by an optional prop are assignable both ways, so assignability can't see the drift that #424 found
// (Avatar's `shape`). Property types aren't compared; the hand-written file simplifies some on purpose.
// A self-test runs first and must catch exactly that case, so the comparison can't silently weaken.
//   node checks/declarations.mjs
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ts = createRequire(resolve(root, 'package.json'))('typescript');

// Exported on purpose by one side only, or with different properties on purpose, with the reason.
const ALLOWED = {
  sourcesOnly: {},
  declaredOnly: {},
  props: {},
};

function compare(sourcesFile, declaredFile, allowed = { sourcesOnly: {}, declaredOnly: {}, props: {} }) {
  const program = ts.createProgram([sourcesFile, declaredFile], { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2020, skipLibCheck: true, noEmit: true, allowJs: false });
  const checker = program.getTypeChecker();
  const resolveAlias = (s) => (s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s);
  const exportsOf = (file) => {
    const all = checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(file)));
    const values = new Map(), types = new Map();
    for (const s of all) {
      const t = resolveAlias(s);
      if (t.flags & ts.SymbolFlags.Value) values.set(s.getName(), t);
      else if (t.flags & ts.SymbolFlags.Type) types.set(s.getName(), t);
    }
    return { values, types };
  };
  const src = exportsOf(sourcesFile), dts = exportsOf(declaredFile);
  const problems = [];
  const names = (kind, a, b) => {
    const missing = [...a.keys()].filter((n) => !b.has(n) && !allowed.sourcesOnly[n]).sort();
    const extra = [...b.keys()].filter((n) => !a.has(n) && !allowed.declaredOnly[n]).sort();
    if (missing.length) problems.push(`${kind} exported by the sources but not declared by hand (${missing.length}): ${missing.join(', ')}`);
    if (extra.length) problems.push(`${kind} declared by hand but not exported by the sources (${extra.length}): ${extra.join(', ')}`);
  };
  names('Values', src.values, dts.values);
  names('Types', src.types, dts.types);
  const props = (s) => new Set(checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(s)).map((p) => p.getName()));
  let compared = 0;
  for (const [name, s] of src.types) {
    const d = dts.types.get(name);
    if (!d || allowed.props[name]) continue;
    const a = props(s), b = props(d);
    if (!a.size && !b.size) continue; // a union of literals, a function type: nothing to compare by name
    compared++;
    const onlySrc = [...a].filter((p) => !b.has(p)), onlyDts = [...b].filter((p) => !a.has(p));
    if (onlySrc.length) problems.push(`${name}: the sources have ${onlySrc.join(', ')}, which the hand-written declaration lacks`);
    if (onlyDts.length) problems.push(`${name}: the hand-written declaration has ${onlyDts.join(', ')}, which the sources lack`);
  }
  return { problems, values: src.values.size, types: src.types.size, compared };
}

// Self-test: a missing optional prop and a missing type must both be reported.
{
  const dir = mkdtempSync(join(tmpdir(), 'altitude-declarations-'));
  try {
    writeFileSync(join(dir, 'src.ts'), "export interface AvatarProps { name?: string; shape?: 'circle' | 'square' }\nexport type Tone = 'a' | 'b';\nexport const Avatar = (p: AvatarProps) => p;\n");
    writeFileSync(join(dir, 'dts.d.ts'), "export interface AvatarProps { name?: string }\nexport declare const Avatar: (p: AvatarProps) => AvatarProps;\n");
    const { problems } = compare(join(dir, 'src.ts'), join(dir, 'dts.d.ts'));
    if (!problems.some((p) => p.startsWith('AvatarProps:') && p.includes('shape')) || !problems.some((p) => p.startsWith('Types') && p.includes('Tone'))) {
      console.error('declarations self-test: a missing optional prop (shape) or a missing type (Tone) went unreported:\n' + problems.join('\n'));
      process.exit(1);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const { problems, values, types, compared } = compare(resolve(root, 'project/components/src/index.tsx'), resolve(root, 'project/components/index.d.ts'), ALLOWED);
if (problems.length) {
  console.error(`project/components/index.d.ts and the sources differ:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`declarations: project/components/index.d.ts matches the sources: ${values} values and ${types} types by name, and the properties of ${compared} types`);
