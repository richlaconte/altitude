// Builds the blind stimulus set for the model-judged pass (README): crops every screen to the protocol's first view,
// renames it to a random id, and writes one judging order per session. The key (id → condition) goes to a separate
// file that no judge or coder is given until the coding is done.
//
//   node evals/first-impression/model-judge/prepare.mjs --from <benchmark report dir>,<anchor captures dir> \
//     --seed <text> --sessions 5 --out <dir>
//
// Writes <out>/stimuli/<id>.png, <out>/sessions.json (no conditions in it) and <out>/key.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, random, VIEW } from '../stimuli.mjs';

export const BUILT = ['claude-plain', 'claude-shadcn', 'claude-altitude'];
export const ANCHOR_TOOLS = ['tabler-2018', 'adminlte-2020'];
export const EXPLORATORY = ['altitude-preview'];
const shuffle = (list, next) => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };

// The anchor's tools fold into one condition, `human`; the tool is kept as `source`.
export function select(screens) {
  const kept = screens.filter((s) => BUILT.includes(s.condition) || ANCHOR_TOOLS.includes(s.condition) || EXPLORATORY.includes(s.condition))
    .map((s) => (ANCHOR_TOOLS.includes(s.condition) ? { ...s, condition: 'human', source: s.condition } : s));
  const problems = [];
  const briefs = [...new Set(kept.filter((s) => s.brief).map((s) => s.brief))];
  for (const condition of [...BUILT, 'human']) for (const brief of briefs) if (!kept.some((s) => s.condition === condition && s.brief === brief)) problems.push(`${condition} is missing ${brief}`);
  return { screens: kept, problems };
}

export function blind(screens, { seed, sessions }) {
  const next = random(seed);
  const used = new Set();
  const id = () => { let v; do v = 's' + Math.floor(next() * 900 + 100); while (used.has(v)); used.add(v); return v; };
  const keyed = shuffle(screens, next).map((s) => ({ stimulus: id(), ...s }));
  const orders = Array.from({ length: sessions }, (_, i) => ({ session: i + 1, order: shuffle(keyed.map((s) => s.stimulus), next) }));
  return { keyed, orders };
}

async function crop(screens, dir) {
  const { chromium } = await import('../../../build/node_modules/playwright-core/index.mjs');
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const page = await browser.newPage({ viewport: VIEW.crop, deviceScaleFactor: 1 });
  for (const s of screens) {
    const data = readFileSync(s.image).toString('base64');
    await page.setContent(`<body style="margin:0"><img src="data:image/png;base64,${data}" style="display:block">`);
    await page.waitForFunction(() => document.images[0].complete);
    await page.screenshot({ path: join(dir, `${s.stimulus}.png`), clip: { x: 0, y: 0, ...VIEW.crop } });
  }
  await browser.close();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (key, fallback) => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1]; };
  const from = option('--from', '').split(',').filter(Boolean).map((d) => resolve(d));
  const seed = option('--seed', ''), sessions = +option('--sessions', 5), out = resolve(option('--out', 'build/test/model-judge'));
  if (!from.length || !seed) { console.error('usage: prepare.mjs --from <dir>[,<dir>] --seed <text> [--sessions 5] [--out dir]'); process.exit(2); }
  const { screens, problems } = select(load(from));
  if (problems.length) { console.error('Not a matched set:\n  ' + problems.join('\n  ')); process.exit(1); }
  const { keyed, orders } = blind(screens, { seed, sessions });
  mkdirSync(join(out, 'stimuli'), { recursive: true });
  await crop(keyed, join(out, 'stimuli'));
  writeFileSync(join(out, 'sessions.json'), JSON.stringify({ seed, crop: VIEW.crop, sessions: orders }, null, 2) + '\n');
  writeFileSync(join(out, 'key.json'), JSON.stringify({ seed, sources: from.map((d) => relative(process.cwd(), d)), screens: keyed.map(({ image, ...s }) => s) }, null, 2) + '\n');
  console.log(`${keyed.length} stimuli, ${sessions} sessions → ${out}`);
}
