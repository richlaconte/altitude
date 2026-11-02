// Scores agent-built apps for adherence to Altitude: whether they use Altitude's real API and follow its rules that
// are certain from source. So each change to what agents receive (installed docs, the init block, examples,
// altitude check) can be measured before and after, rather than assumed. Results are descriptive; stochastic output
// never gates CI (README, "Design and HCI framework").
//
//   node evals/adherence/score.mjs <build>...            a table per build (each <build> is a folder with src/)
//   node evals/adherence/score.mjs <build>... --json     the scores as JSON
//
// Per build:
//   api.unknownExports   names imported from altitude-design (or used as A.Name) that the package doesn't export
//   api.unknownProps     props passed to a component whose declared props don't have them (an invented prop)
//   rules                findings from `altitude check`'s rules (scripts/source-check.mjs), by rule ID
//   colourLiterals       ALT-TOKEN-001 findings: comparable across conditions, since it applies to any app
// Both API counts come from TypeScript against the package's sources (what npm consumers get), in non-strict mode;
// modules other than altitude-design that a build imports are stubbed, so only Altitude's API is judged.
// Render-based measures (what text sits on which tier, contrast) are the distinctiveness benchmark's
// (evals/distinctiveness, "Elevation"); this scorer reads source only.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, scan } from '../../scripts/source-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tokenNames = new Set([...readFileSync(resolve(root, 'project/components/bundle.css'), 'utf8').matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]));

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === 'node_modules' ? [] : e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);

function api(src) {
  const dir = mkdtempSync(join(tmpdir(), 'altitude-adherence-'));
  try {
    cpSync(src, join(dir, 'src'), { recursive: true, filter: (p) => !p.includes('node_modules') });
    // Every other module a build imports is stubbed as `any`, so only Altitude's API produces errors.
    writeFileSync(join(dir, 'stubs.d.ts'), "declare module '*.css';\ndeclare module '*.svg';\ndeclare module '*.png';\n");
    const others = new Set();
    for (const f of walk(join(dir, 'src')).filter((f) => /\.[jt]sx?$/.test(f)))
      for (const m of readFileSync(f, 'utf8').matchAll(/from\s+['"]([^'"./][^'"]*)['"]/g))
        if (!/^(altitude-design|react|react-dom)(\/|$)/.test(m[1])) others.add(m[1]);
    writeFileSync(join(dir, 'others.d.ts'), [...others].map((m) => `declare module '${m}' { const x: any; export = x; }`).join('\n') + '\n');
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'es2020', module: 'esnext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: false, noEmit: true,
        skipLibCheck: true, allowJs: true, lib: ['dom', 'es2022'], baseUrl: '.',
        paths: { 'altitude-design': [resolve(root, 'project/components/src/index.tsx')], react: [resolve(root, 'node_modules/@types/react')], 'react/jsx-runtime': [resolve(root, 'node_modules/@types/react/jsx-runtime.d.ts')], 'react-dom/client': [resolve(root, 'node_modules/@types/react-dom/client.d.ts')], '@/*': ['./src/*'] },
        typeRoots: [resolve(root, 'node_modules/@types')], types: ['react'],
      },
      include: ['src', 'stubs.d.ts', 'others.d.ts'],
    }));
    let output = '';
    try { execFileSync(resolve(root, 'node_modules/.bin/tsc'), ['-p', '.'], { cwd: dir, encoding: 'utf8' }); }
    catch (e) { output = (e.stdout || '') + (e.stderr || ''); }
    const errors = output.split(/\n(?=\S)/).map((b) => b.replace(/\n\s+/g, ' ')).filter((l) => /^src\//.test(l) && /error TS/.test(l));
    const unknownExports = errors.filter((l) => /error TS(2305|2724)\b/.test(l) && /"altitude-design"/.test(l));
    // Namespace use (A.Fake) shows up as a missing property on the module's namespace type.
    const unknownNamespace = errors.filter((l) => /error TS(2339|2551)\b/.test(l) && /on type 'typeof import\(".*components\/src\/index"\)'/.test(l));
    const unknownProps = errors.filter((l) => /error TS(2322|2353)\b/.test(l) && /does not exist (in|on) type '(IntrinsicAttributes & )?[A-Z]\w*Props/.test(l));
    const short = (l) => l.replace(/^src\//, '').slice(0, 220);
    return { unknownExports: unknownExports.length + unknownNamespace.length, unknownProps: unknownProps.length, details: [...unknownExports, ...unknownNamespace, ...unknownProps].map(short) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

export function score(build) {
  const src = existsSync(join(build, 'src')) ? join(build, 'src') : build;
  const run = existsSync(join(build, 'run.json')) ? JSON.parse(readFileSync(join(build, 'run.json'), 'utf8')) : {};
  const { files, findings } = scan(src, { tokenNames });
  const rules = Object.fromEntries(Object.keys(RULES).map((id) => [id, findings.filter((f) => f.ruleId === id && (id !== 'ALT-SETUP-003' || f.kind === 'deterministic')).length]));
  const usesAltitude = walk(src).some((f) => /\.[jt]sx?$/.test(f) && /from\s+['"]altitude-design['"]/.test(readFileSync(f, 'utf8')));
  return {
    build: basename(build), condition: run.condition || null, brief: run.brief || null, files, usesAltitude,
    api: usesAltitude ? api(src) : null,
    rules, colourLiterals: rules['ALT-TOKEN-001'],
    errors: findings.filter((f) => f.kind === 'deterministic').length,
    reviews: findings.filter((f) => f.kind !== 'deterministic').length,
    findings: findings.map((f) => `${f.ruleId} ${f.file || '(project)'}${f.line ? ':' + f.line : ''} ${f.observed.slice(0, 120)}`),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const builds = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!builds.length) { console.error('usage: node evals/adherence/score.mjs <build>... [--json]'); process.exit(2); }
  const scores = builds.map((b) => score(resolve(b)));
  if (process.argv.includes('--json')) console.log(JSON.stringify(scores, null, 2));
  else for (const s of scores) console.log(`${s.build}: ${s.files} files; unknown exports ${s.api?.unknownExports ?? '–'}, unknown props ${s.api?.unknownProps ?? '–'}, colour literals ${s.colourLiterals}, errors ${s.errors}, reviews ${s.reviews}`);
}
