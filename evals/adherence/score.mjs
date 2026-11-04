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
//   used                 distinct Altitude exports used (imported, or A.Name) and Altitude elements rendered: the
//                        denominator, so a build that avoids the API can't look adherent (#419)
//   rates                unknown exports and props per 100 Altitude identifiers used
//   handRolled           raw <button>, <input>, <select>, <textarea>, <table>, <dialog> and role="dialog" in an app that
//                        imports altitude-design: the opposite failure, avoidance
//   probes               real props used wrongly, each a test seeded from a bug we've seen (PROBES below)
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

const sources = (src) => walk(src).filter((f) => /\.(jsx?|tsx?|html)$/.test(f)).map((f) => ({ file: relative(src, f), text: readFileSync(f, 'utf8') }));

/** Which Altitude exports a build uses, and how many Altitude elements it renders. */
export function used(files) {
  const names = new Set(), namespaces = new Set();
  for (const { text } of files) {
    for (const m of text.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]altitude-design['"]/g))
      for (const part of m[1].split(',')) { const n = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim(); if (n) names.add(n); }
    for (const m of text.matchAll(/import\s*\*\s*as\s+(\w+)\s*from\s*['"]altitude-design['"]/g)) namespaces.add(m[1]);
  }
  for (const { text } of files) for (const ns of namespaces) for (const m of text.matchAll(new RegExp(`\\b${ns}\\.([A-Za-z]\\w*)`, 'g'))) names.add(m[1]);
  const components = [...names].filter((n) => /^[A-Z]/.test(n));
  let elements = 0;
  for (const { text } of files) {
    for (const c of components) elements += (text.match(new RegExp(`<${c}\\b`, 'g')) ?? []).length;
    for (const ns of namespaces) elements += (text.match(new RegExp(`<${ns}\\.[A-Z]\\w*\\b`, 'g')) ?? []).length;
  }
  return { identifiers: names.size, elements, names: [...names].sort() };
}

/** Raw controls an Altitude app built by hand: avoidance looks like adherence unless it's counted. */
export function handRolled(files) {
  const out = {};
  for (const { text } of files) {
    for (const m of text.matchAll(/<(button|input|select|textarea|table|dialog)\b/g)) out[m[1]] = (out[m[1]] ?? 0) + 1;
    const dialogs = (text.match(/role=["'{]+dialog/g) ?? []).length;
    if (dialogs) out['role="dialog"'] = (out['role="dialog"'] ?? 0) + dialogs;
  }
  return { total: Object.values(out).reduce((n, v) => n + v, 0), byElement: out };
}

/** The opening tag of each <Name …> in a text, up to its end (props may hold arrows, so a plain [^>]* won't do). */
function tags(text, name) {
  const out = [];
  for (const m of text.matchAll(new RegExp(`<${name}\\b`, 'g'))) {
    let depth = 0, i = m.index + m[0].length;
    for (; i < text.length; i++) { const c = text[i]; if (c === '{') depth++; else if (c === '}') depth--; else if (c === '>' && depth === 0) break; }
    out.push(text.slice(m.index, i + 1));
  }
  return out;
}

/**
 * Contract probes: a real prop used wrongly, which TypeScript accepts. Each is seeded from a bug we've actually seen,
 * with a passing and a failing fixture in score.test.mjs. Add one each time a bug like it is found.
 */
export const PROBES = [
  {
    id: 'meter-format-words', issue: '#447',
    says: 'Meter format formats the number; words after it repeat the label or the reading ("12 of 40 seats used").',
    test: (text) => tags(text, 'Meter').filter((t) => /format=\{\s*\(?\s*\w+\s*\)?\s*=>\s*`[^`]*\$\{[^}]+\}[^`]*?\s[a-zA-Z]{3,}[^`]*`/.test(t) || /format=\{\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\s*\+\s*['"]\s+[a-zA-Z]{3,}/.test(t)).length,
  },
];

export function score(build) {
  const src = existsSync(join(build, 'src')) ? join(build, 'src') : build;
  const run = existsSync(join(build, 'run.json')) ? JSON.parse(readFileSync(join(build, 'run.json'), 'utf8')) : {};
  const { files, findings } = scan(src, { tokenNames });
  const rules = Object.fromEntries(Object.keys(RULES).map((id) => [id, findings.filter((f) => f.ruleId === id && (id !== 'ALT-SETUP-003' || f.kind === 'deterministic')).length]));
  const usesAltitude = walk(src).some((f) => /\.[jt]sx?$/.test(f) && /from\s+['"]altitude-design['"]/.test(readFileSync(f, 'utf8')));
  const text = sources(src);
  const apiScore = usesAltitude ? api(src) : null;
  const use = usesAltitude ? used(text) : null;
  const per100 = (n) => (use && use.identifiers ? Math.round((n / use.identifiers) * 10000) / 100 : null);
  return {
    build: basename(build), condition: run.condition || null, brief: run.brief || null, files, usesAltitude,
    api: apiScore,
    used: use,
    rates: apiScore && use ? { unknownExportsPer100: per100(apiScore.unknownExports), unknownPropsPer100: per100(apiScore.unknownProps) } : null,
    handRolled: usesAltitude ? handRolled(text) : null,
    probes: Object.fromEntries(PROBES.map((p) => [p.id, text.reduce((n, f) => n + p.test(f.text), 0)])),
    cost: run.usage ? { usd: run.usage.costUSD ?? null, turns: run.usage.turns ?? run.usage.numTurns ?? null, ms: run.elapsedMs ?? null } : null,
    buildResult: run.build ?? null,
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
  else for (const s of scores) console.log(`${s.build}: ${s.files} files; Altitude identifiers ${s.used?.identifiers ?? '–'}, elements ${s.used?.elements ?? '–'}; unknown exports ${s.api?.unknownExports ?? '–'} (${s.rates?.unknownExportsPer100 ?? '–'}/100), unknown props ${s.api?.unknownProps ?? '–'} (${s.rates?.unknownPropsPer100 ?? '–'}/100); hand-rolled ${s.handRolled?.total ?? '–'}; probes ${Object.entries(s.probes).map(([k, v]) => `${k} ${v}`).join(', ')}; colour literals ${s.colourLiterals}, errors ${s.errors}, reviews ${s.reviews}`);
}
