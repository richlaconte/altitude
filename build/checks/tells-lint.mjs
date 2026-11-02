// The tells of generated interfaces that are certain from source text (Distinctiveness, #320). Every `lint` tell in
// project/tells.json has a rule here, and every rule names a tell there, so the two can't drift apart.
// Scans the components' sources and styles, the previews, the tokens and the landing page. No browser, no network.
//   node checks/tells-lint.mjs              exits non-zero on a finding
//   node checks/tells-lint.mjs --json       the findings as JSON
//   node checks/tells-lint.mjs --self-test  only the rules' own test (it also runs first on every scan): each catches its
//                                          example and passes its counter-example
// An intentional exception is a comment on the line, or the line above: `tells-ignore: <id> <reason>`.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);

/* ── colour helpers ── */
const hexRe = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
function hsl(hex) {
  let h = hex.slice(1);
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d) hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (hue * 60 + 360) % 360, s, l, a };
}
const isPurple = (hex) => { const c = hsl(hex); return c.s > 0.3 && c.h >= 250 && c.h <= 300; };
const MEANING = /var\(--(?:accent|positive|caution|critical|data-|presence-)[\w-]*\)/;
const loud = (color) => MEANING.test(color) || (color.match(hexRe) ?? []).some((h) => { const c = hsl(h); return c.a > 0.15 && (c.s > 0.35 || c.l > 0.7); });

// Tailwind's default palette, a sample of the values generators reach for most. Extend it as reviews find more.
const KIT_HEX = ['#3b82f6', '#2563eb', '#1d4ed8', '#6366f1', '#4f46e5', '#8b5cf6', '#7c3aed', '#a855f7', '#9333ea', '#ec4899', '#db2777', '#be185d',
  '#f43f5e', '#ef4444', '#dc2626', '#f97316', '#ea580c', '#c2410c', '#f59e0b', '#eab308', '#22c55e', '#16a34a', '#10b981', '#059669', '#14b8a6',
  '#0d9488', '#06b6d4', '#0ea5e9', '#0f172a', '#1e293b', '#64748b', '#111827', '#18181b'];
const KIT_CLASS = /\b(?:bg|text|border|from|via|to|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

/* ── font helpers ── */
const familyDecl = /(?:font-family:|--font-[\w-]+:|"(?:sans|mono|display)":)\s*([^;}\n]+)/;
const firstFamily = (line) => { const m = line.match(familyDecl); return m ? m[1].split(',')[0].replace(/[\\"']/g, '').trim().toLowerCase() : null; };
const DEFAULT_FONTS = ['inter', 'roboto', 'arial', 'helvetica', 'helvetica neue'];
// TY5: a family is loaded if a Google Fonts import or an @font-face in the scanned files names it, or it's a system or
// generic family. Filled in once the files are known (below).
const LOADED = new Set(['system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'sf mono', 'sfmono-regular',
  'menlo', 'consolas', 'monaco', 'sans-serif', 'serif', 'monospace', 'cursive', 'inherit', 'initial', 'unset', 'currentcolor']);
const loaders = (text) => [...[...text.matchAll(/fonts\.googleapis\.com\/css2?\?[^'")\s]*/g)].flatMap((m) => [...m[0].matchAll(/family=([^:&]+)/g)].map((f) => decodeURIComponent(f[1]).replace(/\+/g, ' ').toLowerCase())),
  ...[...text.matchAll(/@font-face\s*{[^}]*font-family:\s*["']?([^;"']+)/g)].map((m) => m[1].trim().toLowerCase())];
const unloaded = (l) => { const f = firstFamily(l); return !!f && !f.startsWith('var(') && !LOADED.has(f); };
const TASTEFUL_FONTS = ['space grotesk', 'geist', 'instrument serif', 'fraunces'];

/* ── shadow and border helpers ── */
const layers = (value) => { const out = []; let depth = 0, cur = ''; for (const ch of value) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
function glow(line) {
  const m = line.match(/(?:box-shadow|text-shadow):\s*([^;}]+)/) ?? line.match(/drop-shadow\(([^)]*\)?[^)]*)\)/);
  if (!m) return false;
  return layers(m[1]).some((layer) => {
    if (/\binset\b/.test(layer)) return false;
    const lengths = layer.replace(/var\([^)]*\)|rgba?\([^)]*\)|#[0-9a-f]+/gi, ' ').trim().split(/\s+/).filter((x) => /^-?\d*\.?\d+(px)?$/.test(x)).map(parseFloat);
    return (lengths[2] ?? 0) >= 8 && loud(layer);
  });
}
function stripe(line) {
  const m = line.match(/border-(?:left|top|inline-start|block-start)(?:-color)?:\s*([^;}]+)/);
  if (!m) return false;
  const width = +(m[1].match(/(\d*\.?\d+)px/)?.[1] ?? 2);
  return width >= 2 && loud(m[1]);
}
function bounce(line) {
  return [...line.matchAll(/cubic-bezier\(([^)]+)\)/g)].some((m) => { const [, y1, , y2] = m[1].split(',').map(Number); return [y1, y2].some((y) => y > 1.05 || y < -0.05); });
}

/* ── the rules, by tell id ── */
const CSS = /\.(css|txt|tsx|ts)$/, MARKUP = /\.(txt|tsx)$/, ALL = /./;
const rules = [
  { id: 'CO1', files: ALL, test: (l) => /\b(?:from|via|to|bg|text|border|ring)-(?:indigo|violet|purple)-\d{2,3}\b/.test(l) || (/gradient\(/.test(l) && (l.match(hexRe) ?? []).some(isPurple)),
    bad: 'background: linear-gradient(90deg, #6d28d9, #3b82f6);', good: 'background: linear-gradient(to bottom, #ffffff0f, #00000008);' },
  { id: 'CO2', files: CSS, test: (l) => /background-clip:\s*text/.test(l), bad: '-webkit-background-clip: text;', good: 'background-clip: padding-box;' },
  { id: 'CO6', files: CSS, test: glow, bad: 'box-shadow: 0 0 24px 4px var(--accent);', good: 'box-shadow: inset 0 1px 0 #ffffff12, 0 2px 6px -1px var(--alt-cast);' },
  { id: 'CO8', files: ALL, test: (l) => KIT_CLASS.test(l) || KIT_HEX.some((h) => l.toLowerCase().includes(h)), bad: "{ hex: '#c2410c' }", good: "{ hex: '#2a6f9e' }" },
  { id: 'TY1', files: ALL, test: (l) => DEFAULT_FONTS.includes(firstFamily(l)), bad: 'font-family: Inter, system-ui, sans-serif;', good: 'font-family: var(--font-sans);' },
  { id: 'TY2', files: ALL, test: (l) => TASTEFUL_FONTS.includes(firstFamily(l)), bad: '--font-display: "Space Grotesk", sans-serif;', good: '--font-display: "Instrument Sans", sans-serif;' },
  { id: 'TY5', files: ALL, test: unloaded, bad: '--font-display: "Recoleta", serif;', good: '--font-sans: "Instrument Sans", system-ui, sans-serif;' },
  { id: 'TY4', files: CSS, test: (l) => /text-transform:\s*uppercase/.test(l), bad: '.kicker { text-transform: uppercase; letter-spacing: 0.06em; }', good: '.label { text-transform: none; }' },
  { id: 'LA8', files: MARKUP, test: (l) => /<(?:span|p|div|small|strong)\b[^>]*>\s*0[1-9]\.?\s*<\//.test(l), bad: '<span className="step">02</span>', good: '<span className="step">Two</span>' },
  { id: 'CM2', files: CSS, test: (l) => /backdrop-filter:(?!\s*none)/.test(l), bad: '.panel { backdrop-filter: blur(12px); }', good: '.panel { backdrop-filter: none; }' },
  { id: 'CM3', files: CSS, test: stripe, bad: '.card { border-left: 4px solid var(--accent); }', good: '.cell { border-left: 1px solid var(--line); }' },
  { id: 'CM5', files: MARKUP, test: (l) => /\b(?:BorderBeam|ShimmerButton|Meteors|Spotlight|AuroraBackground|BackgroundBeams|SparklesCore|Marquee)\b/.test(l), bad: '<BorderBeam size={250} />', good: '<Card>' },
  { id: 'CM8', files: ALL, test: (l) => /#(?:ff5f57|febc2e|28c840|ffbd2e|27c93f)\b/i.test(l), bad: '.dot-red { background: #ff5f57; }', good: '.dot { background: var(--line); }' },
  { id: 'MO1', files: ALL, test: (l) => /animation-timeline:\s*view\(|@keyframes\s+fade-?(?:in-?)?up\b/i.test(l), bad: '@keyframes fadeInUp { from { opacity: 0 } }', good: '@keyframes alt-rise { from { opacity: 0 } }' },
  { id: 'MO2', files: ALL, test: bounce, bad: 'transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);', good: 'transition: transform 160ms cubic-bezier(0.2, 0.9, 0.25, 1);' },
  { id: 'MO3', files: ALL, test: (l) => /count-?up/i.test(l), bad: '<CountUp end={1200} />', good: '<FormattedNumber value={1200} />' },
  { id: 'IC1', files: MARKUP, test: (l) => /\p{Emoji_Presentation}|️/u.test(l), bad: '<Button>🚀 Launch</Button>', good: '<Button>Launch</Button>' },
  { id: 'IC2', files: ALL, test: (l) => /sparkle/i.test(l), bad: '<SparkleIcon />', good: '<InfoIcon />' },
  { id: 'CP1', files: MARKUP, test: (l) => /\b(?:seamless(?:ly)?|supercharge[sd]?|unleash(?:es|ed)?|empower(?:s|ed|ing)?|effortless(?:ly)?|revolutioni[sz]e[sd]?|game-?changer|next-level|cutting-edge|world-class)\b/i.test(l),
    bad: 'Seamlessly sync your files', good: 'Sync your files' },
  { id: 'CP2', files: MARKUP, test: (l) => /Welcome back!|Something went wrong|\bOops\b|>\s*(?:OK|Submit)\s*</.test(l), bad: '<Button>Submit</Button>', good: '<Button>Send invite</Button>' },
  { id: 'CP3', files: MARKUP, test: (l) => /<(Button|Link|a)\b[^>]*>[^<]*(?:→|->)\s*<\/\1>/.test(l), bad: '<Button>Get started →</Button>', good: '<Button>Create workspace</Button>' },
  { id: 'CP5', files: MARKUP, test: (l) => /<(Button|Link|a)\b[^>]*>\s*(?:Learn more|Read more|Click here|See more|More|Here)\s*<\/\1>/i.test(l), bad: '<Link href="/pricing">Learn more</Link>', good: '<Link href="/pricing">Compare plans</Link>' },
  { id: 'CP4', files: MARKUP, test: (l) => /\bAI-powered\b/i.test(l), bad: 'The AI-powered inbox for modern teams', good: 'Sort your inbox by who is waiting' },
  { id: 'CN1', files: /\.css$/, test: (l) => /(?:^|[{;\s])font-family:(?!\s*(?:var\(|inherit|initial|unset))/.test(l) && !/^\s*--/.test(l), bad: '.title { font-family: "Fraunces", serif; }', good: '.title { font-family: var(--font-sans); }' },
];

// Exceptions in files that can't hold a comment.
const EXCEPTIONS = [
  { file: 'project/tokens.json', id: 'MO2', includes: '"cubic-bezier(0.3, 1.3, 0.45, 1)"', reason: 'ease-settle: a documented 2–3% overshoot on thumbs and indicators (Motion), not a bounce.' },
];

/* ── which files ── */
const walk = (dir, re) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name), re) : re.test(e.name) ? [join(dir, e.name)] : []);
const files = [
  'project/components/bundle.css', 'build/previews.txt', 'project/tokens.json',
  ...walk('project/components/src', /\.(ts|tsx)$/), ...walk('site', /\.(ts|tsx|css)$/),
];

for (const f of files) for (const name of loaders(readFileSync(join(root, f), 'utf8'))) LOADED.add(name);

function scan(file, text) {
  const lines = text.split('\n'), found = [];
  lines.forEach((line, i) => {
    for (const rule of rules) {
      if (!rule.files.test(file) && !(file.endsWith('.json') && /^(MO2|TY1|TY2|TY5)$/.test(rule.id))) continue;
      if (!rule.test(line)) continue;
      const ignored = (s) => new RegExp(`tells-ignore:\\s*(?:[A-Z]{2}\\d+,\\s*)*${rule.id}\\s+[A-Za-z]`).test(s ?? '');
      if (ignored(line) || ignored(lines[i - 1])) continue;
      if (EXCEPTIONS.some((e) => e.file === file && e.id === rule.id && line.includes(e.includes))) continue;
      found.push({ id: rule.id, file, line: i + 1, text: line.trim().slice(0, 140) });
    }
  });
  return found;
}

/* ── the catalog and the rules agree ── */
const catalog = JSON.parse(readFileSync(join(root, 'project/tells.json'), 'utf8')).tells;
const lintIds = catalog.filter((t) => t.detect === 'lint').map((t) => t.id);
const problems = [];
for (const r of rules) if (!catalog.some((t) => t.id === r.id)) problems.push(`rule ${r.id} names no tell in project/tells.json`);
  else if (!lintIds.includes(r.id)) problems.push(`rule ${r.id}: tells.json says ${r.id} is detected by ${catalog.find((t) => t.id === r.id).detect}, not lint`);
for (const id of lintIds) if (!rules.some((r) => r.id === id)) problems.push(`tells.json lists ${id} as lint, but no rule checks it`);

// The rules test themselves on every run, so a broken pattern fails instead of passing everything.
{
  for (const r of rules) {
    if (!r.test(r.bad)) problems.push(`${r.id}: missed its own example: ${r.bad}`);
    if (r.test(r.good)) problems.push(`${r.id}: flagged a line it should pass: ${r.good}`);
  }
  if (scan('site/x.css', '.k { text-transform: uppercase; } /* tells-ignore: TY4 a printed label */').length !== 0) problems.push('tells-ignore with a reason was not honoured');
  if (scan('site/x.css', '.k { text-transform: uppercase; } /* tells-ignore: TY4 */').length !== 1) problems.push('tells-ignore without a reason must not suppress');
  if (args.includes('--self-test')) {
    if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
    console.log(`tells-lint self-test: ${rules.length} rules, each catches its example and passes its counter-example`);
    process.exit(0);
  }
}

const findings = problems.length ? [] : files.flatMap((f) => scan(f, readFileSync(join(root, f), 'utf8')));
if (args.includes('--json')) console.log(JSON.stringify({ problems, findings }, null, 2));
else {
  for (const p of problems) console.error(`tells-lint: ${p}`);
  for (const f of findings) console.error(`${f.id}  ${relative(root, join(root, f.file))}:${f.line}  ${f.text}`);
  if (!problems.length && !findings.length) console.log(`tells-lint: ${files.length} files, ${rules.length} rules, no tells (project/tells.json, Distinctiveness)`);
  else if (findings.length) console.error(`\n${findings.length} finding(s). Fix them, or mark an intentional one with \`tells-ignore: <id> <reason>\` (see project/Distinctiveness.md).`);
}
process.exit(problems.length || findings.length ? 1 : 0);
