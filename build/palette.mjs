// The data palette (#49): chooses every data-* token in every scheme from the gates in Theming.md ("The data palette").
//
//   node palette.mjs           choose the palette and write palette.json (python3 tokens.py then puts it in tokens.json)
//   node palette.mjs --check   choose it again and fail if palette.json or tokens.json disagree, or a gate fails (CI)
//   node palette.mjs --report  also print the measurements Research.md (E23) quotes
//
// Categorical slots: OKLCH candidates on a grid (hue every 5°, lightness every 0.02, three chroma caps) that pass the
// contrast, band, chroma and reserved-hue gates; then a depth-first search over orders of six, starting from a candidate
// in (or nearest to) the accent's hue, keeping the order with the greatest minimum adjacent protan/deutan ΔE. The search
// is exhaustive over the grid, so the result is deterministic.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { oklch, fromOklch, maxChroma, deltaE, cvdDeltaE, contrast } from './color.mjs';

const here = (p) => new URL(p, import.meta.url);
const tokens = JSON.parse(readFileSync(here('../project/tokens.json'), 'utf8'));
const V = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value]));
const SCHEMES = { daylight: 'light', nightfall: 'dark', mesa: 'light', alpine: 'dark' };
const RESERVED = ['accent', 'positive', 'caution', 'critical', 'presence-1', 'presence-2', 'presence-3'];
const POLE_AVOID = ['positive', 'critical'];

export const GATES = {
  reserved: 12,     // OKLab ΔE×100 from accent, status and presence-*; E23 says why not 15
  normal: 15,       // between any two categorical slots, normal vision
  hue: 25,          // degrees between any two slots: identity is a hue, not a shade of one
  cvd: 8,           // between adjacent slots, under protanopia and deuteranopia
  cvdAny: 6,        // between any two slots; direct labels and patterns (#72) carry the rest
  contrast: 3,      // marks on surface-ground and surface-raised
  chroma: 0.1,
  band: { light: [0.43, 0.77], dark: [0.48, 0.67] },
  rampStep: 0.06,   // smallest lightness step in the sequential and diverging ramps
};
const SLOTS = 6;

const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const r3 = (x) => Math.round(x * 1000) / 1000;

function candidates(scheme) {
  const [lo, hi] = GATES.band[SCHEMES[scheme]];
  const ground = V['surface-ground'][scheme], raised = V['surface-raised'][scheme];
  const out = [];
  for (let h = 0; h < 360; h += 5) for (let i = 0; lo + i * 0.02 <= hi + 1e-9; i++) {
    const L = lo + i * 0.02;
    for (const cap of [0.12, 0.16, 0.2]) {
      const C = Math.min(cap, maxChroma(L, h));
      if (C < GATES.chroma) continue;
      const hex = fromOklch(L, C, h);
      if (!hex || out.includes(hex)) continue;
      if (contrast(hex, ground) < GATES.contrast || contrast(hex, raised) < GATES.contrast) continue;
      if (RESERVED.some((r) => deltaE(hex, V[r][scheme]) < GATES.reserved)) continue;
      out.push(hex);
    }
  }
  return out;
}

function categorical(scheme) {
  const pool = candidates(scheme);
  const hues = pool.map((c) => oklch(c)[2]);
  const cvd = pool.map((a) => pool.map((b) => cvdDeltaE(a, b)));
  const ok = pool.map((a, i) => pool.map((b, j) => deltaE(a, b) >= GATES.normal && hueGap(hues[i], hues[j]) >= GATES.hue && cvd[i][j] >= GATES.cvdAny));
  // data-1 wears the accent's hue where a slot can, so a chart's first series matches the product; at a different
  // lightness from the accent, so it stays a series and never reads as a control.
  const accentHue = oklch(V.accent[scheme])[2];
  const nearest = Math.min(...hues.map((h) => hueGap(h, accentHue)));
  const firsts = pool.map((_, i) => i).filter((i) => hueGap(hues[i], accentHue) <= nearest + 5);
  let best = { score: -1, path: null };
  const path = [];
  function dfs(score) {
    if (path.length === SLOTS) { if (score > best.score) best = { score, path: [...path] }; return; }
    const prev = path[path.length - 1];
    const next = [];
    for (let j = 0; j < pool.length; j++) {
      const s = Math.min(score, cvd[prev][j]);
      if (s <= best.score || s < GATES.cvd || !path.every((k) => ok[k][j])) continue;
      next.push([s, j]);
    }
    next.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (const [s, j] of next) { if (s <= best.score) break; path.push(j); dfs(s); path.pop(); }
  }
  for (const f of firsts) { path.push(f); dfs(Infinity); path.pop(); }
  if (!best.path) throw new Error(`${scheme}: no ${SLOTS} categorical slots pass every gate`);
  return best.path.map((j) => pool[j]);
}

/** A neutral in the ground's hue that holds 3:1 on ground and raised and stays clear of every slot. */
function other(scheme, slots) {
  const [, , h] = oklch(V['surface-ground'][scheme]);
  const dark = SCHEMES[scheme] === 'dark';
  for (let i = 0; i < 80; i++) {
    const hex = fromOklch(dark ? 0.5 + i * 0.005 : 0.7 - i * 0.005, 0.015, h);
    if (Math.min(contrast(hex, V['surface-ground'][scheme]), contrast(hex, V['surface-raised'][scheme])) < GATES.contrast + 0.1) continue;
    if (slots.some((s) => deltaE(hex, s) < GATES.normal)) continue;
    return hex;
  }
  throw new Error(`${scheme}: no data-other clears the slots`);
}

/** Magnitude, low to high: light schemes darken from near-white; dark schemes start near their ground and climb. */
function sequential(scheme, h) {
  const Ls = SCHEMES[scheme] === 'dark' ? [0.32, 0.41, 0.5, 0.59, 0.68, 0.77, 0.86] : [0.94, 0.85, 0.76, 0.67, 0.58, 0.49, 0.4];
  return Ls.map((L, i) => fromOklch(L, Math.min(maxChroma(L, h), 0.03 + (0.12 * i) / 6), h));
}

/**
 * Polarity: orange below the midpoint and blue above it, around a neutral midpoint. Under protanopia and deuteranopia
 * the blue–yellow axis survives, so the two sides stay apart (ColorBrewer's PuOr and RdBu do the same). The hues and
 * the pole lightness are chosen for the greatest colour-blind separation between the sides at each step.
 */
function diverging(scheme) {
  const dark = SCHEMES[scheme] === 'dark';
  const [, , gh] = oklch(V['surface-ground'][scheme]);
  const midL = dark ? 0.34 : 0.93;
  let best = { score: -1 };
  for (const poleL of dark ? [0.78, 0.82, 0.86, 0.9] : [0.34, 0.38, 0.42, 0.46]) {
    const Ls = [1, 2, 3].map((k) => midL + ((poleL - midL) * k) / 3);
    const ramp = (h) => Ls.map((L, k) => fromOklch(L, Math.min(maxChroma(L, h), [0.07, 0.11, 0.15][k]), h));
    for (let warm = 40; warm <= 70; warm += 5) for (let cool = 230; cool <= 270; cool += 5) {
      const neg = ramp(warm), pos = ramp(cool);
      // Neither pole is positive or critical: red–green is the worst pair for colour-blind readers, and both are status.
      if ([neg[2], pos[2]].some((c) => POLE_AVOID.some((s) => deltaE(c, V[s][scheme]) < GATES.normal))) continue;
      const score = Math.min(...[0, 1, 2].map((k) => cvdDeltaE(neg[k], pos[k])));
      if (score > best.score + 1e-9) best = { score, neg, pos };
    }
  }
  if (!best.neg) throw new Error(`${scheme}: no diverging pair passes`);
  return { neg: best.neg, mid: fromOklch(midL, 0.008, gh), pos: best.pos };
}

export function choose() {
  const out = {};
  for (const scheme of Object.keys(SCHEMES)) {
    const slots = categorical(scheme);
    const div = diverging(scheme);
    const t = {};
    slots.forEach((c, i) => (t[`data-${i + 1}`] = c));
    t['data-other'] = other(scheme, slots);
    sequential(scheme, oklch(slots[0])[2]).forEach((c, i) => (t[`data-seq-${i + 1}`] = c));
    [2, 1, 0].forEach((k) => (t[`data-div-neg-${k + 1}`] = div.neg[k]));
    t['data-div-mid'] = div.mid;
    [0, 1, 2].forEach((k) => (t[`data-div-pos-${k + 1}`] = div.pos[k]));
    out[scheme] = t;
  }
  return out;
}

/** Every gate, measured: the failures, and the figures Research.md quotes. */
export function measure(palette) {
  const fails = [], rows = [];
  for (const [scheme, t] of Object.entries(palette)) {
    const [lo, hi] = GATES.band[SCHEMES[scheme]];
    const slots = Array.from({ length: SLOTS }, (_, i) => t[`data-${i + 1}`]);
    const ground = V['surface-ground'][scheme], raised = V['surface-raised'][scheme];
    let adjCvd = Infinity, anyCvd = Infinity, anyNor = Infinity, minC = Infinity, near = { d: Infinity };
    slots.forEach((c, i) => {
      const [L, C] = oklch(c);
      if (L < lo - 0.005 || L > hi + 0.005) fails.push(`${scheme} data-${i + 1} ${c}: lightness ${L.toFixed(3)} outside ${lo}–${hi}`);
      if (C < GATES.chroma - 0.002) fails.push(`${scheme} data-${i + 1} ${c}: chroma ${C.toFixed(3)} under ${GATES.chroma}`);
      minC = Math.min(minC, contrast(c, ground), contrast(c, raised));
      for (const r of RESERVED) { const d = deltaE(c, V[r][scheme]); if (d < near.d) near = { d, slot: `data-${i + 1}`, r }; }
      if (i) adjCvd = Math.min(adjCvd, cvdDeltaE(slots[i - 1], c));
      for (let j = 0; j < i; j++) { anyCvd = Math.min(anyCvd, cvdDeltaE(slots[j], c)); anyNor = Math.min(anyNor, deltaE(slots[j], c)); }
    });
    if (minC < GATES.contrast) fails.push(`${scheme}: a slot is ${minC.toFixed(2)}:1 on ground or raised`);
    if (near.d < GATES.reserved) fails.push(`${scheme} ${near.slot}: ΔE ${near.d.toFixed(1)} from ${near.r}`);
    if (adjCvd < GATES.cvd) fails.push(`${scheme}: adjacent CVD ΔE ${adjCvd.toFixed(1)}`);
    if (anyCvd < GATES.cvdAny) fails.push(`${scheme}: CVD ΔE ${anyCvd.toFixed(1)} between two slots`);
    if (anyNor < GATES.normal) fails.push(`${scheme}: normal ΔE ${anyNor.toFixed(1)} between two slots`);
    const oc = Math.min(contrast(t['data-other'], ground), contrast(t['data-other'], raised));
    if (oc < GATES.contrast) fails.push(`${scheme} data-other: ${oc.toFixed(2)}:1`);
    const ramps = {
      seq: Array.from({ length: 7 }, (_, i) => t[`data-seq-${i + 1}`]),
      'div-neg': ['data-div-mid', 'data-div-neg-1', 'data-div-neg-2', 'data-div-neg-3'].map((k) => t[k]),
      'div-pos': ['data-div-mid', 'data-div-pos-1', 'data-div-pos-2', 'data-div-pos-3'].map((k) => t[k]),
    };
    let minStep = Infinity;
    for (const [name, ramp] of Object.entries(ramps)) {
      const Ls = ramp.map((c) => oklch(c)[0]), dir = Math.sign(Ls[1] - Ls[0]);
      for (let i = 1; i < Ls.length; i++) {
        const step = (Ls[i] - Ls[i - 1]) * dir;
        minStep = Math.min(minStep, step);
        if (step < GATES.rampStep - 1e-3) fails.push(`${scheme} ${name}: lightness step ${step.toFixed(3)} at ${i}`);
      }
    }
    for (const pole of ['data-div-neg-3', 'data-div-pos-3']) for (const s of POLE_AVOID) {
      const d = deltaE(t[pole], V[s][scheme]);
      if (d < GATES.normal) fails.push(`${scheme} ${pole}: ΔE ${d.toFixed(1)} from ${s}`);
    }
    const divCvd = Math.min(...[1, 2, 3].map((k) => cvdDeltaE(t[`data-div-neg-${k}`], t[`data-div-pos-${k}`])));
    rows.push({ scheme, adjCvd, anyCvd, anyNor, minC, near, minStep, divCvd });
  }
  return { fails, rows };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const palette = choose();
  const json = JSON.stringify(palette, null, 2) + '\n';
  const { fails, rows } = measure(palette);
  if (args.includes('--report') || fails.length) {
    console.log('| Scheme | Worst adjacent CVD ΔE | Worst CVD ΔE, any pair | Worst normal ΔE, any pair | Lowest contrast on ground or raised | Closest reserved hue | Smallest ramp step (L) | Diverging sides, worst CVD ΔE |');
    console.log('|---|---|---|---|---|---|---|---|');
    for (const r of rows) console.log(`| ${r.scheme} | ${r.adjCvd.toFixed(1)} | ${r.anyCvd.toFixed(1)} | ${r.anyNor.toFixed(1)} | ${r.minC.toFixed(2)}:1 | ${r.near.slot} ↔ \`${r.near.r}\` ${r.near.d.toFixed(1)} | ${r.minStep.toFixed(3)} | ${r.divCvd.toFixed(1)} |`);
    for (const [s, t] of Object.entries(palette)) console.log(s + '\n  ' + Object.entries(t).map(([k, v]) => `${k} ${v}  L${r3(oklch(v)[0])} C${r3(oklch(v)[1])} h${Math.round(oklch(v)[2])}`).join('\n  '));
  }
  if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
  if (args.includes('--check')) {
    if (readFileSync(here('palette.json'), 'utf8') !== json) { console.error('build/palette.json is out of date: run node palette.mjs && python3 tokens.py ../project/tokens.json'); process.exit(1); }
    for (const [scheme, t] of Object.entries(palette)) for (const [k, v] of Object.entries(t)) {
      if (V[k]?.[scheme] !== v) { console.error(`tokens.json ${k} (${scheme}) is ${V[k]?.[scheme]}, the palette says ${v}: run python3 tokens.py ../project/tokens.json`); process.exit(1); }
    }
    console.log('data palette: in sync, and every gate passes');
  } else {
    writeFileSync(here('palette.json'), json);
    console.log('wrote build/palette.json');
  }
}
