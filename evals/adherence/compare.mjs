// Compares scored conditions descriptively (#419): pooled rates per 100 Altitude identifiers with a bootstrap
// interval over builds, per-brief rows, and cost, turns and wall time. No significance tests: at a few dozen builds
// per condition, binary rates won't separate, so this reports what was seen and how wide the uncertainty is.
//
//   node evals/adherence/compare.mjs <label>=<scores.json> <label>=<scores.json> [--briefs a,b,c] > table.md
//
// --briefs marks which briefs are the adherence set; the rest are reported as the control.
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const option = (key) => { const i = args.indexOf(key); return i < 0 ? '' : args[i + 1]; };
const adherence = new Set(option('--briefs').split(',').filter(Boolean));
const conditions = args.filter((a, i) => a.includes('=') && args[i - 1] !== '--briefs').map((a) => { const [label, file] = a.split('='); return { label, scores: JSON.parse(readFileSync(file, 'utf8')) }; });
if (conditions.length < 1) { console.error('usage: node evals/adherence/compare.mjs <label>=<scores.json>... [--briefs a,b]'); process.exit(2); }

// A seeded generator, so the intervals are the same each time the report is rebuilt.
let seed = 419;
const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const sum = (xs, f) => xs.reduce((n, x) => n + f(x), 0);
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round = (n, d = 1) => (n == null || Number.isNaN(n) ? '–' : (Math.round(n * 10 ** d) / 10 ** d).toFixed(d));

/** A statistic over builds, with a 95% percentile bootstrap interval from resampling builds. */
function boot(builds, stat, n = 2000) {
  if (!builds.length) return { value: null, lo: null, hi: null };
  const value = stat(builds), draws = [];
  for (let i = 0; i < n; i++) draws.push(stat(builds.map(() => builds[Math.floor(random() * builds.length)])));
  const s = draws.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b);
  return { value, lo: s[Math.floor(s.length * 0.025)], hi: s[Math.ceil(s.length * 0.975) - 1] };
}
const show = ({ value, lo, hi }, d = 1) => (value == null ? '–' : `${round(value, d)} (${round(lo, d)}–${round(hi, d)})`);

const ids = (b) => b.used?.identifiers ?? 0;
const per100 = (key) => (bs) => { const d = sum(bs, ids); return d ? (100 * sum(bs, (b) => b.api?.[key] ?? 0)) / d : null; };
const mean = (f) => (bs) => (bs.length ? sum(bs, f) / bs.length : null);
const probes = (b) => Object.values(b.probes || {}).reduce((n, v) => n + v, 0);
const otherErrors = (b) => b.errors - b.colourLiterals;

function summary(builds) {
  return {
    n: builds.length,
    passed: builds.filter((b) => b.buildResult === 'passed').length,
    ids: boot(builds, mean(ids)),
    elements: boot(builds, mean((b) => b.used?.elements ?? 0)),
    ue: boot(builds, per100('unknownExports')),
    up: boot(builds, per100('unknownProps')),
    ueRaw: sum(builds, (b) => b.api?.unknownExports ?? 0), upRaw: sum(builds, (b) => b.api?.unknownProps ?? 0),
    withUnknown: builds.filter((b) => (b.api?.unknownExports ?? 0) + (b.api?.unknownProps ?? 0) > 0).length,
    hand: boot(builds, mean((b) => b.handRolled?.total ?? 0)),
    probes: sum(builds, probes), colour: sum(builds, (b) => b.colourLiterals), errors: sum(builds, otherErrors), reviews: sum(builds, (b) => b.reviews),
    usd: sum(builds, (b) => b.cost?.usd ?? 0), usdMedian: median(builds.map((b) => b.cost?.usd).filter((x) => x != null)),
    turns: median(builds.map((b) => b.cost?.turns).filter((x) => x != null)),
    minutes: median(builds.map((b) => b.cost?.ms).filter((x) => x != null).map((ms) => ms / 60000)),
  };
}

const groups = [['All', () => true], ...(adherence.size ? [['Adherence briefs', (b) => adherence.has(b.brief)], ['Control briefs', (b) => !adherence.has(b.brief)]] : [])];
const out = [];
out.push('| Condition | Briefs | Builds | Build passed | Altitude identifiers per build | Unknown exports /100 | Unknown props /100 | Builds with any unknown | Hand-rolled per build | Probe hits | Colour literals | Other errors | Reviews |');
out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [group, keep] of groups) for (const { label, scores } of conditions) {
  const s = summary(scores.filter(keep));
  out.push(`| ${label} | ${group} | ${s.n} | ${s.passed} | ${show(s.ids)} | ${show(s.ue, 2)} [${s.ueRaw}] | ${show(s.up, 2)} [${s.upRaw}] | ${s.withUnknown} | ${show(s.hand, 2)} | ${s.probes} | ${s.colour} | ${s.errors} | ${s.reviews} |`);
}
out.push('', '| Condition | Briefs | Cost (total USD) | Cost per build (median USD) | Turns (median) | Wall time (median min) |', '|---|---|---|---|---|---|');
for (const [group, keep] of groups) for (const { label, scores } of conditions) {
  const s = summary(scores.filter(keep));
  out.push(`| ${label} | ${group} | ${round(s.usd, 2)} | ${round(s.usdMedian, 2)} | ${round(s.turns, 0)} | ${round(s.minutes, 1)} |`);
}
const briefs = [...new Set(conditions.flatMap((c) => c.scores.map((b) => b.brief)))].sort((a, b) => (adherence.has(b) - adherence.has(a)) || a.localeCompare(b));
out.push('', `| Brief | ${conditions.map((c) => `${c.label}: builds, ids, unknown (exp+props), hand-rolled, probes, errors, USD`).join(' | ')} |`, `|---|${conditions.map(() => '---').join('|')}|`);
for (const brief of briefs) {
  const cells = conditions.map(({ scores }) => {
    const bs = scores.filter((b) => b.brief === brief); if (!bs.length) return '–';
    const s = summary(bs);
    return `${s.n} · ${round(s.ids.value)} · ${s.ueRaw}+${s.upRaw} · ${sum(bs, (b) => b.handRolled?.total ?? 0)} · ${s.probes} · ${s.errors} · ${round(s.usd / s.n, 2)}`;
  });
  out.push(`| ${brief}${adherence.has(brief) ? '' : ' (control)'} | ${cells.join(' | ')} |`);
}
console.log(out.join('\n'));
