// Type-checks every component's generated example (build/examples.mjs) against Altitude's declarations, as an app
// would import them, so an example can't name a component, export or prop that doesn't exist. Wrong examples are
// copied, by people and by models (Chen et al. 2025, arXiv 2503.15231). No browser: CI renders the previews.
//   node checks/examples.mjs           exits non-zero on an API error
//   node checks/examples.mjs --all     also prints the type errors that don't gate (see below)
//
// Two sets of declarations, each checked on its own:
//   package              the sources, which is what npm consumers get (dist/types is tsc's output of them)
//   design system        project/components/index.d.ts, the hand-written declarations of window.Altitude that ship
//                        with the design system and that the site's llms.txt links
//
// Previews are plain JSX with untyped data, so TypeScript widens their literals ("success" becomes string) and reports
// mismatches against the declarations' unions that a typed app wouldn't have. Those are counted, not gated. What gates
// is an error that says the API itself is wrong:
//   TS2305 / TS2724   the example imports a name that isn't exported (or is exported under another name)
//   TS2741            a declared prop is required but the preview renders without it (one of the two is wrong)
//   TS2322 / TS2353   a property that doesn't exist on a component's props (an invented prop)
// A known mismatch is listed with the issue that tracks it, and the check fails once it disappears, so the list can't
// go stale.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { examples } from '../examples.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const all = examples();

// "<Example>: <fragment of the message>" → the issue that tracks it.
const targets = [
  { label: 'package', declarations: 'project/components/src/index.tsx', known: {} },
  { label: 'design system', declarations: 'project/components/index.d.ts', known: {
    "Button: no exported member 'Icons'": '#424',
    "ContextMenu: no exported member 'Icons'": '#424',
    "DropdownMenu: no exported member 'Icons'": '#424',
    "Dialog: no exported member 'useAltitude'": '#424',
    "Avatar: Property 'shape' does not exist on type 'IntrinsicAttributes & AvatarProps'": '#424',
    "Avatar: Property 'size' does not exist on type 'IntrinsicAttributes & HTMLAttributes<HTMLDivElement>": '#424 (AvatarGroup)',
  } },
];

// The example's source line an error points at. A required prop passed through {...props} from an untyped helper
// isn't seen by TypeScript, so a missing-prop error on a line with a spread isn't the API's fault.
const sourceLine = (l) => { const [, name, row] = l.match(/^src\/(\w+)\.tsx\((\d+),/); return all[name].full.split('\n')[row - 1] || ''; };
const gates = (line) => /error TS(2305|2724)\b/.test(line)
  || (/error TS2741\b/.test(line) && /required in type '[A-Z]\w*Props'/.test(line) && !sourceLine(line).includes('{...'))
  // A preview's own untyped React.forwardRef helper (RouterLink) types as RefAttributes<unknown>: not the API.
  || (/error TS(2322|2353)\b/.test(line) && /does not exist (in|on) type '(IntrinsicAttributes|[A-Z]\w*Props)/.test(line) && !/type 'IntrinsicAttributes & RefAttributes<unknown>'/.test(line));
const example = (l) => l.match(/^src\/(\w+)\.tsx/)[1];

function check({ label, declarations, known: KNOWN }) {
  const dir = mkdtempSync(join(tmpdir(), 'altitude-examples-'));
  try {
    mkdirSync(join(dir, 'src'));
    for (const [name, ex] of Object.entries(all)) writeFileSync(join(dir, 'src', `${name}.tsx`), ex.full);
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'es2020', module: 'esnext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: false, noEmit: true,
        skipLibCheck: true, isolatedModules: true, lib: ['dom', 'es2022'],
        baseUrl: '.', paths: { 'altitude-design': [resolve(root, declarations)], react: [resolve(root, 'node_modules/@types/react')], 'react/jsx-runtime': [resolve(root, 'node_modules/@types/react/jsx-runtime.d.ts')] },
        typeRoots: [resolve(root, 'node_modules/@types')], types: ['react'],
      },
      include: ['src'],
    }));
    let output = '';
    try { execFileSync(resolve(root, 'node_modules/.bin/tsc'), ['-p', '.'], { cwd: dir, encoding: 'utf8' }); }
    catch (e) { output = (e.stdout || '') + (e.stderr || ''); }
    // Only errors in the examples (the sources' own checking is the typecheck job's). tsc puts an error's detail,
    // such as which property doesn't exist, on indented lines after it, so whole blocks are read.
    const errors = output.split(/\n(?=\S)/).map((b) => b.replace(/\n\s+/g, ' ')).filter((l) => /^src\/\w+\.tsx\(/.test(l) && /error TS/.test(l));
    const known = (l) => Object.keys(KNOWN).find((k) => { const [n, frag] = k.split(': '); return example(l) === n && l.includes(frag); });
    const gating = errors.filter(gates);
    const unexpected = gating.filter((l) => !known(l));
    const stale = Object.keys(KNOWN).filter((k) => !gating.some((l) => known(l) === k));
    if (process.argv.includes('--all')) console.log(errors.filter((l) => !gates(l)).map((l) => `${label}: ${l}`).join('\n'));
    for (const l of unexpected) console.error(`${label}: ${l}`);
    for (const k of stale) console.error(`${label}: known mismatch no longer occurs, remove it: ${k}`);
    const ok = !unexpected.length && !stale.length;
    console[ok ? 'log' : 'error'](`examples (${label}, ${declarations}): ${unexpected.length} API errors, ${gating.length - unexpected.length} known mismatches tracked, ${errors.length - gating.length} other type errors not gated (mostly literals widened from untyped preview data; --all lists them)`);
    return ok;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const results = targets.map(check);
if (results.includes(false)) process.exit(1);
console.log(`examples: all ${Object.keys(all).length} examples use only declared components, exports and props`);
