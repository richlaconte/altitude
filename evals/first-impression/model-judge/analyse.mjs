// Joins the judges' answers and the coder's codes to the key and writes the run's summary (README, "Analysis").
//
//   node evals/first-impression/model-judge/analyse.mjs --run <dir>
//
// <dir> holds key.json, sessions.json, judges.json ({ "<session>": "<model>" }), answers/session-<n>.jsonl,
// codes.jsonl and, optionally, codes-check.jsonl (the second coder's sample). Writes summary.json and tables.md.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { random } from '../stimuli.mjs';

export const BUILT = ['claude-plain', 'claude-shadcn', 'claude-altitude'];
export const CONDITIONS = [...BUILT, 'human', 'altitude-preview'];
export const NEW_TELL_SHARE = 0.2;

const lines = (file) => readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const round = (x, d = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);

// Inverse standard normal (Acklam), for d′.
export function probit(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = Math.min(Math.max(p, 1e-9), 1 - 1e-9), lo = 0.02425;
  if (q < lo) { const r = Math.sqrt(-2 * Math.log(q)); return (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1); }
  if (q > 1 - lo) return -probit(1 - q);
  const r = q - 0.5, s = r * r;
  return (((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1);
}

// d′ with the log-linear correction (Hautus 1995), so a perfect rate doesn't give an infinite value.
export function dprime(hits, signal, falseAlarms, noise) {
  const h = (hits + 0.5) / (signal + 1), f = (falseAlarms + 0.5) / (noise + 1);
  return { d: probit(h) - probit(f), c: -(probit(h) + probit(f)) / 2 };
}

// P("ai") for a set of answers, with a 95% interval bootstrapped over the unit (brief, or task for the previews).
export function rate(answers, { reps = 2000, seed = 'model-judge' } = {}) {
  const units = [...new Set(answers.map((a) => a.unit))];
  const p = mean(answers.map((a) => +(a.answer === 'ai')));
  if (units.length < 2) return { p, lo: null, hi: null, n: answers.length };
  const by = Object.fromEntries(units.map((u) => [u, answers.filter((a) => a.unit === u)]));
  const next = random(seed), boots = [];
  for (let i = 0; i < reps; i++) {
    const pick = units.map(() => by[units[Math.floor(next() * units.length)]]).flat();
    boots.push(mean(pick.map((a) => +(a.answer === 'ai'))));
  }
  boots.sort((x, y) => x - y);
  return { p, lo: boots[Math.floor(reps * 0.025)], hi: boots[Math.floor(reps * 0.975)], n: answers.length };
}

// Cohen's κ for one code's presence across the same cues coded twice.
export function kappa(pairs) {
  const n = pairs.length; if (!n) return null;
  const both = pairs.filter(([a, b]) => a && b).length, neither = pairs.filter(([a, b]) => !a && !b).length;
  const pa = pairs.filter(([a]) => a).length / n, pb = pairs.filter(([, b]) => b).length / n;
  const po = (both + neither) / n, pe = pa * pb + (1 - pa) * (1 - pb);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

export function analyse(run) {
  const key = Object.fromEntries(JSON.parse(readFileSync(join(run, 'key.json'), 'utf8')).screens.map((s) => [s.stimulus, s]));
  const judges = existsSync(join(run, 'judges.json')) ? JSON.parse(readFileSync(join(run, 'judges.json'), 'utf8')) : {};
  const answers = readdirSync(join(run, 'answers')).filter((f) => f.endsWith('.jsonl')).flatMap((f) => lines(join(run, 'answers', f)))
    .map((a) => { const s = key[a.stimulus]; if (!s) throw new Error(`unknown stimulus ${a.stimulus}`); return { ...a, condition: s.condition, unit: s.brief ?? s.task, model: judges[a.session] ?? 'unknown' }; });
  const sessions = [...new Set(answers.map((a) => a.session))].sort((a, b) => a - b);
  const problems = [];
  for (const session of sessions) {
    const got = answers.filter((a) => a.session === session), ids = new Set(got.map((a) => a.stimulus));
    if (ids.size !== Object.keys(key).length || got.length !== ids.size) problems.push(`session ${session}: ${got.length} answers for ${ids.size} of ${Object.keys(key).length} stimuli`);
    for (const a of got) if (!['ai', 'designer'].includes(a.answer)) problems.push(`session ${session} ${a.stimulus}: answer ${a.answer}`);
  }

  const models = [...new Set(answers.map((a) => a.model))];
  const byCondition = (list) => Object.fromEntries(CONDITIONS.map((c) => { const xs = list.filter((a) => a.condition === c); return [c, { ...rate(xs), confidence: mean(xs.map((a) => a.confidence)) }]; }));
  const origin = { pooled: byCondition(answers), ...Object.fromEntries(models.map((m) => [m, byCondition(answers.filter((a) => a.model === m))])) };

  const discrimination = sessions.map((session) => {
    const got = answers.filter((a) => a.session === session), human = got.filter((a) => a.condition === 'human');
    const fa = human.filter((a) => a.answer === 'ai').length;
    const against = (conds) => { const sig = got.filter((a) => conds.includes(a.condition)); return dprime(sig.filter((a) => a.answer === 'ai').length, sig.length, fa, human.length); };
    return { session, model: judges[session] ?? 'unknown', allBuilt: against(BUILT), ...Object.fromEntries(BUILT.map((c) => [c, against([c])])) };
  });

  // Codes: what was cited, per condition, as the share of that condition's "ai" answers citing it at least once.
  let codes = null, newTells = [], agreement = null;
  if (existsSync(join(run, 'codes.jsonl'))) {
    const all = lines(join(run, 'codes.jsonl'));
    const labels = all.find((l) => l.newLabels)?.newLabels ?? {};
    const cues = all.filter((l) => l.codes);
    const answerOf = Object.fromEntries(answers.map((a) => [`${a.session}|${a.stimulus}`, a]));
    for (const c of cues) if (!answerOf[`${c.session}|${c.stimulus}`]) problems.push(`code for unknown answer ${c.session}|${c.stimulus}`);
    const citedBy = {};
    for (const c of cues) { const k = `${c.session}|${c.stimulus}`; for (const code of c.codes) (citedBy[code] ??= new Set()).add(k); }
    codes = {};
    for (const cond of CONDITIONS) {
      const ai = answers.filter((a) => a.condition === cond && a.answer === 'ai').map((a) => `${a.session}|${a.stimulus}`);
      codes[cond] = { aiAnswers: ai.length, cited: Object.fromEntries(Object.entries(citedBy).map(([code, set]) => [code, ai.filter((k) => set.has(k)).length]).filter(([, n]) => n).sort((x, y) => y[1] - x[1])) };
    }
    newTells = Object.keys(labels).map((label) => ({ label, definition: labels[label], share: Object.fromEntries(BUILT.map((c) => [c, codes[c].aiAnswers ? (codes[c].cited[label] ?? 0) / codes[c].aiAnswers : 0])) }))
      .map((t) => ({ ...t, proposed: Object.values(t.share).some((s) => s >= NEW_TELL_SHARE) }))
      .sort((x, y) => Math.max(...Object.values(y.share)) - Math.max(...Object.values(x.share)));
    if (existsSync(join(run, 'codes-check.jsonl'))) {
      const check = lines(join(run, 'codes-check.jsonl')).filter((l) => l.codes);
      const cat = (code) => (code.startsWith('new:') ? 'new' : code);
      const first = new Map(cues.map((c) => [`${c.session}|${c.stimulus}|${c.cue}`, new Set(c.codes.map(cat))]));
      const paired = check.map((c) => [first.get(`${c.session}|${c.stimulus}|${c.cue}`), new Set(c.codes.map(cat))]).filter(([a]) => a);
      const cats = [...new Set(paired.flatMap(([a, b]) => [...a, ...b]))];
      const perCode = Object.fromEntries(cats.map((k) => [k, { uses: paired.filter(([a, b]) => a.has(k) || b.has(k)).length, kappa: kappa(paired.map(([a, b]) => [a.has(k), b.has(k)])) }]));
      const exact = paired.filter(([a, b]) => a.size === b.size && [...a].every((k) => b.has(k))).length;
      agreement = { cues: paired.length, exact: paired.length ? exact / paired.length : null, perCode: Object.fromEntries(Object.entries(perCode).filter(([, v]) => v.uses >= 10)) };
    }
  }
  return { sessions: sessions.length, judges, answers: answers.length, problems, origin, discrimination, codes, newTells, agreement };
}

export function tables(s) {
  const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)}%`);
  const out = ['## P("ai") by condition', '', '| Condition | Judges | P("ai") | 95% interval (over briefs) | Mean confidence | Answers |', '|---|---|---|---|---|---|'];
  for (const [group, rows] of Object.entries(s.origin)) for (const c of CONDITIONS) { const r = rows[c]; if (r.n) out.push(`| ${c} | ${group} | ${pct(r.p)} | ${pct(r.lo)}–${pct(r.hi)} | ${round(r.confidence, 1)} | ${r.n} |`); }
  out.push('', '## Discrimination against the human anchor', '', '| Session | Model | d′ all built | d′ plain | d′ shadcn | d′ altitude | c (all built) |', '|---|---|---|---|---|---|---|');
  for (const d of s.discrimination) out.push(`| ${d.session} | ${d.model} | ${round(d.allBuilt.d)} | ${round(d['claude-plain'].d)} | ${round(d['claude-shadcn'].d)} | ${round(d['claude-altitude'].d)} | ${round(d.allBuilt.c)} |`);
  if (s.codes) {
    out.push('', '## Most-cited codes in "ai" answers', '', '| Condition | "ai" answers | Codes (share of those answers citing it) |', '|---|---|---|');
    for (const c of CONDITIONS) { const r = s.codes[c]; out.push(`| ${c} | ${r.aiAnswers} | ${Object.entries(r.cited).slice(0, 10).map(([k, n]) => `${k} ${pct(n / (r.aiAnswers || 1))}`).join(', ') || '–'} |`); }
    out.push('', `## New labels (proposed as tells at ≥ ${pct(NEW_TELL_SHARE)} of a built condition's "ai" answers)`, '', '| Label | Plain | shadcn | Altitude | Proposed | Definition |', '|---|---|---|---|---|---|');
    for (const t of s.newTells) out.push(`| ${t.label} | ${pct(t.share['claude-plain'])} | ${pct(t.share['claude-shadcn'])} | ${pct(t.share['claude-altitude'])} | ${t.proposed ? 'yes' : ''} | ${t.definition} |`);
  }
  if (s.agreement) {
    out.push('', `## Coder agreement (${s.agreement.cues} cues coded twice; exact match ${pct(s.agreement.exact)})`, '', '| Code | Uses | κ |', '|---|---|---|');
    for (const [k, v] of Object.entries(s.agreement.perCode)) out.push(`| ${k} | ${v.uses} | ${round(v.kappa)} |`);
  }
  return out.join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--run');
  if (i < 0) { console.error('usage: analyse.mjs --run <dir>'); process.exit(2); }
  const run = resolve(args[i + 1]);
  const summary = analyse(run);
  writeFileSync(join(run, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  writeFileSync(join(run, 'tables.md'), tables(summary));
  if (summary.problems.length) console.warn('problems:\n  ' + summary.problems.join('\n  '));
  console.log(`${summary.answers} answers from ${summary.sessions} sessions → ${join(run, 'summary.json')}, tables.md`);
}
