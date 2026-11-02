// Builds the stimulus set and the per-participant trial orders for the first-impression study (PROTOCOL.md, #326).
// Sources are benchmark captures: a report folder (results.json + screens/) or a capture.mjs output (index.json + PNGs).
// Orders come from the seed, so a participant slot's trials can be reproduced.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAIN = ['claude-plain', 'claude-shadcn', 'claude-altitude', 'designer'];
export const EXPLORATORY = ['altitude-preview'];
export const TIMING = { fixationMs: 500, exposureMs: 50, maskMs: 500, originMs: 5000 };
export const VIEW = { crop: { width: 1200, height: 750 }, display: { width: 960, height: 600 }, ground: '#808080', mask: { columns: 12, rows: 8 } };
const FREE_TEXT_PER_CONDITION = 3;
const briefsFile = fileURLToPath(new URL('../distinctiveness/briefs.json', import.meta.url));

// A small seeded generator (mulberry32 over a string hash), so the orders don't depend on the platform.
export function random(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (list, next) => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };

// Reads every first-sample screen from the given folders.
export function load(dirs) {
  const screens = [];
  for (const dir of dirs) {
    const report = join(dir, 'results.json'), index = join(dir, 'index.json');
    const [list, images] = existsSync(report) ? [JSON.parse(readFileSync(report, 'utf8')).screens, join(dir, 'screens')]
      : existsSync(index) ? [JSON.parse(readFileSync(index, 'utf8')).screens, dir]
      : (() => { throw new Error(`${dir}: neither results.json nor index.json`); })();
    for (const s of list) if ((s.sample ?? 1) === 1) screens.push({ id: s.id, condition: s.system, brief: s.brief, task: s.task, domain: s.domain, contentFill: s.proportions?.contentFill ?? null, image: join(images, `${s.id}.png`) });
  }
  return screens;
}

// Keeps the study's conditions and refuses a set that isn't matched: every main condition needs every brief, and its image.
export function validate(screens, briefs, tasks) {
  const kept = screens.filter((s) => MAIN.includes(s.condition) || EXPLORATORY.includes(s.condition));
  const ids = new Set();
  const problems = [];
  for (const s of kept) { if (ids.has(s.id)) problems.push(`duplicate screen ${s.id}`); ids.add(s.id); }
  for (const condition of MAIN) for (const brief of briefs) {
    const s = kept.find((x) => x.condition === condition && x.brief === brief);
    if (!s) problems.push(`${condition} is missing ${brief}`);
  }
  for (const task of tasks) if (!kept.some((x) => x.condition === 'altitude-preview' && x.task === task)) problems.push(`altitude-preview is missing ${task}`);
  for (const s of kept) if (s.image && !existsSync(s.image)) problems.push(`${s.id}: no image at ${s.image}`);
  return { screens: kept, problems };
}

export function slots(screens, { participants, seed }) {
  const next = random(seed);
  const ids = screens.map((s) => s.id);
  return Array.from({ length: participants }, (_, slot) => {
    const phaseA = shuffle(ids, next);
    const phaseB = shuffle(ids, next);
    const freeText = MAIN.flatMap((condition) => shuffle(screens.filter((s) => s.condition === condition).map((s) => s.id), next).slice(0, FREE_TEXT_PER_CONDITION));
    // Two catch trials, one for each answer, inserted into phase B away from its ends and from each other.
    const positions = shuffle(Array.from({ length: phaseB.length - 3 }, (_, i) => i + 2), next);
    const [first, second] = [positions[0], positions.find((p) => Math.abs(p - positions[0]) > 1)].sort((a, b) => a - b);
    const answers = next() < 0.5 ? ['ai', 'designer'] : ['designer', 'ai'];
    return { slot: slot + 1, phaseA, phaseB, freeText, catch: [{ before: first, answer: answers[0] }, { before: second, answer: answers[1] }] };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (key, fallback) => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1]; };
  const from = option('--from', '').split(',').filter(Boolean).map((d) => resolve(d));
  const seed = option('--seed', '');
  const participants = +option('--participants', 100);
  const out = resolve(option('--out', 'build/test/first-impression/stimuli.json'));
  if (!from.length || !seed) { console.error('usage: stimuli.mjs --from <dir>[,<dir>] --seed <text> [--participants 100] [--out file]'); process.exit(2); }
  const { briefs } = JSON.parse(readFileSync(briefsFile, 'utf8'));
  const { screens, problems } = validate(load(from), briefs.map((b) => b.id), [...new Set(briefs.map((b) => b.task))]);
  if (problems.length) { console.error('Not a matched set:\n  ' + problems.join('\n  ')); process.exit(1); }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ protocol: 'evals/first-impression/PROTOCOL.md', seed, builtAt: new Date().toISOString(), sources: from, timing: TIMING, view: VIEW, screens, slots: slots(screens, { participants, seed }) }, null, 2) + '\n');
  console.log(`${screens.length} screens, ${participants} slots → ${out}`);
}
