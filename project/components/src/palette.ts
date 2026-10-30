// The data palette's colour science and gates (Theming.md, "The data palette"). Shared by checkScheme, the provider's
// custom-accent derivation and build/palette.mjs, which imports this file directly. No React, no JSX, no dependencies.
//
// OKLab and OKLCH after Ottosson (2020); colour-vision deficiency simulated after Machado, Oliveira & Fernandes (2009),
// severity 1, in linear sRGB; contrast is WCAG 2. Differences are OKLab ΔE × 100.

type Vec = [number, number, number];

const lin = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const gam = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

function hexToLinear(hex: string): Vec {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)) as Vec;
}

const linearToHex = (rgb: Vec) =>
  '#' + rgb.map((x) => Math.round(Math.min(1, Math.max(0, gam(x))) * 255).toString(16).padStart(2, '0')).join('');

function toOklab([r, g, b]: Vec): Vec {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: Vec): Vec {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** [lightness 0–1, chroma, hue in degrees] */
export function oklch(hex: string): Vec {
  const [L, a, b] = toOklab(hexToLinear(hex));
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

/** OKLCH → hex, or null when the colour is outside sRGB. */
export function fromOklch(L: number, C: number, h: number): string | null {
  const rad = (h * Math.PI) / 180;
  const rgb = fromOklab([L, C * Math.cos(rad), C * Math.sin(rad)]);
  return rgb.some((x) => x < -1e-4 || x > 1 + 1e-4) ? null : linearToHex(rgb);
}

/** The most chroma (to 0.001) that hue h holds at lightness L inside sRGB. */
export function maxChroma(L: number, h: number) {
  let lo = 0, hi = 0.4;
  while (hi - lo > 0.001) { const mid = (lo + hi) / 2; if (fromOklch(L, mid, h)) lo = mid; else hi = mid; }
  return lo;
}

const MACHADO: Record<'protan' | 'deutan', number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};
export type Vision = 'normal' | 'protan' | 'deutan';

function simulate(rgb: Vec, kind: Vision): Vec {
  if (kind === 'normal') return rgb;
  return MACHADO[kind].map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))) as Vec;
}

/** OKLab ΔE × 100 between two hex colours, as seen with normal vision or simulated protanopia or deuteranopia. */
export function deltaE(a: string, b: string, kind: Vision = 'normal') {
  const p = toOklab(simulate(hexToLinear(a), kind)), q = toOklab(simulate(hexToLinear(b), kind));
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** The smaller of the protan and deutan ΔE. */
export const cvdDeltaE = (a: string, b: string) => Math.min(deltaE(a, b, 'protan'), deltaE(a, b, 'deutan'));

const luminance = (hex: string) => { const [r, g, b] = hexToLinear(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export function contrastRatio(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/** A scheme is dark when its ground is, by the same test deriveAccent uses. */
export const isDarkGround = (ground: string) => luminance(ground) < 0.2;

/* ───────────────────────── the gates ───────────────────────── */

export const DATA_GATES = {
  reserved: 12,     // from accent, status and presence-*: Research, E23, says why not 15
  normal: 15,       // between any two categorical slots, normal vision
  hue: 25,          // degrees between any two slots: identity is a hue, not a shade of one
  cvd: 8,           // between adjacent slots, under protanopia and under deuteranopia
  cvdAny: 6,        // between any two slots; direct labels and patterns carry the rest
  contrast: 3,      // marks on surface-ground and surface-raised
  chroma: 0.1,
  band: { light: [0.43, 0.77], dark: [0.48, 0.67] } as Record<'light' | 'dark', [number, number]>,
  rampStep: 0.06,   // smallest lightness step in the sequential and diverging ramps
  pole: 15,         // diverging poles from positive and critical
  // data-context (#188): the colour of what a chart isn't about. Neutral, at 3:1, apart from gridlines and data-other;
  // exempt from the slot distance, because a context series is never told apart by its colour (Research, E105).
  context: { chroma: 0.02, line: 15, other: 10 },
};

export const DATA_SLOTS = ['data-1', 'data-2', 'data-3', 'data-4', 'data-5', 'data-6'] as const;
export const DATA_RESERVED = ['accent', 'positive', 'caution', 'critical', 'presence-1', 'presence-2', 'presence-3'] as const;
export const DATA_SEQ = ['data-seq-1', 'data-seq-2', 'data-seq-3', 'data-seq-4', 'data-seq-5', 'data-seq-6', 'data-seq-7'] as const;
export const DATA_DIV_NEG = ['data-div-mid', 'data-div-neg-1', 'data-div-neg-2', 'data-div-neg-3'] as const;
export const DATA_DIV_POS = ['data-div-mid', 'data-div-pos-1', 'data-div-pos-2', 'data-div-pos-3'] as const;
/** Every data-* token, in tokens.json order. */
export const DATA_TOKENS = [...DATA_SLOTS, 'data-other', 'data-context', ...DATA_SEQ, 'data-div-neg-3', 'data-div-neg-2', 'data-div-neg-1', 'data-div-mid',
  'data-div-pos-1', 'data-div-pos-2', 'data-div-pos-3'] as const;

/** Magnitude, low to high, in one hue: light schemes darken from near-white; dark schemes start near their ground and climb. */
export function sequentialRamp(h: number, dark: boolean): string[] {
  const Ls = dark ? [0.32, 0.41, 0.5, 0.59, 0.68, 0.77, 0.86] : [0.94, 0.85, 0.76, 0.67, 0.58, 0.49, 0.4];
  return Ls.map((L, i) => fromOklch(L, Math.min(maxChroma(L, h), 0.03 + (0.12 * i) / 6), h)!);
}

const fmt = (x: number) => x.toFixed(1);

/**
 * Measure the data-* tokens against every gate. `get` returns a token's value by name (without `--`); every value
 * must already be a hex colour. Returns one sentence per problem.
 */
export function checkDataPalette(get: (name: string) => string): string[] {
  const out: string[] = [];
  const ground = get('surface-ground'), raised = get('surface-raised');
  const mode = isDarkGround(ground) ? 'dark' : 'light';
  const [lo, hi] = DATA_GATES.band[mode];
  const slots = DATA_SLOTS.map((n) => [n, get(n)] as const);
  for (const [n, c] of slots) {
    const [L, C] = oklch(c);
    if (L < lo - 0.005 || L > hi + 0.005) out.push(`${n} ${c}: OKLCH lightness ${L.toFixed(2)}, outside ${lo}–${hi} for a ${mode} scheme.`);
    if (C < DATA_GATES.chroma - 0.002) out.push(`${n} ${c}: chroma ${C.toFixed(3)}, under ${DATA_GATES.chroma}.`);
    for (const s of ['surface-ground', 'surface-raised']) {
      const r = contrastRatio(c, get(s));
      if (r < DATA_GATES.contrast) out.push(`${n} ${c} on ${s} is ${r.toFixed(2)}:1; marks need 3:1.`);
    }
    // data-1 is the accent's own series: with a custom accent it may sit close to it (Theming.md, "Custom accent").
    for (const r of DATA_RESERVED) {
      if (r === 'accent' && n === 'data-1') continue;
      const d = deltaE(c, get(r));
      if (d < DATA_GATES.reserved) out.push(`${n} ${c} and ${r} ${get(r)}: ΔE ${fmt(d)}, under ${DATA_GATES.reserved}, so the series reads as ${r === 'accent' ? 'the accent' : r.startsWith('presence') ? 'a person' : 'a status'}.`);
    }
  }
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
    const [a, x] = slots[i], [b, y] = slots[j];
    const pair = `${a} ${x} and ${b} ${y}`;
    const n = deltaE(x, y);
    if (n < DATA_GATES.normal) out.push(`${pair}: ΔE ${fmt(n)}, under ${DATA_GATES.normal}.`);
    const g = hueGap(oklch(x)[2], oklch(y)[2]);
    if (g < DATA_GATES.hue) out.push(`${pair}: hues ${Math.round(g)}° apart, under ${DATA_GATES.hue}°.`);
    const floor = j === i + 1 ? DATA_GATES.cvd : DATA_GATES.cvdAny;
    for (const kind of ['protan', 'deutan'] as const) {
      const d = deltaE(x, y, kind);
      if (d < floor) out.push(`${pair}: CVD ΔE ${fmt(d)} (${kind === 'protan' ? 'protanopia' : 'deuteranopia'}), under ${floor}.`);
    }
  }
  const other = get('data-other');
  for (const s of ['surface-ground', 'surface-raised']) {
    const r = contrastRatio(other, get(s));
    if (r < DATA_GATES.contrast) out.push(`data-other ${other} on ${s} is ${r.toFixed(2)}:1; marks need 3:1.`);
  }
  const ctx = get('data-context');
  if (ctx) {
    for (const s of ['surface-ground', 'surface-raised']) {
      const r = contrastRatio(ctx, get(s));
      if (r < DATA_GATES.contrast) out.push(`data-context ${ctx} on ${s} is ${r.toFixed(2)}:1; marks need 3:1.`);
    }
    if (oklch(ctx)[1] > DATA_GATES.context.chroma) out.push(`data-context ${ctx}: chroma ${oklch(ctx)[1].toFixed(3)}, over ${DATA_GATES.context.chroma}; context must be neutral, never read as a series.`);
    const dl = deltaE(ctx, get('line')), dot = deltaE(ctx, other);
    if (dl < DATA_GATES.context.line) out.push(`data-context ${ctx} and line ${get('line')}: ΔE ${fmt(dl)}, under ${DATA_GATES.context.line}; context marks must not read as gridlines.`);
    if (dot < DATA_GATES.context.other) out.push(`data-context ${ctx} and data-other ${other}: ΔE ${fmt(dot)}, under ${DATA_GATES.context.other}.`);
  }
  for (const [name, ramp] of [['data-seq', DATA_SEQ], ['data-div-neg', DATA_DIV_NEG], ['data-div-pos', DATA_DIV_POS]] as const) {
    const Ls = ramp.map((n) => oklch(get(n))[0]);
    const dir = Math.sign(Ls[Ls.length - 1] - Ls[0]) || 1;
    for (let i = 1; i < Ls.length; i++) {
      const step = (Ls[i] - Ls[i - 1]) * dir;
      if (step < DATA_GATES.rampStep - 1e-3) out.push(`${ramp[i - 1]} to ${ramp[i]}: lightness step ${step.toFixed(3)}, under ${DATA_GATES.rampStep}; ${name} must change lightness monotonically.`);
    }
  }
  for (const pole of ['data-div-neg-3', 'data-div-pos-3']) for (const s of ['positive', 'critical']) {
    const d = deltaE(get(pole), get(s));
    if (d < DATA_GATES.pole) out.push(`${pole} ${get(pole)} and ${s} ${get(s)}: ΔE ${fmt(d)}, under ${DATA_GATES.pole}; a diverging pole must not read as status.`);
  }
  return out;
}

/* ───────────────────────── a custom accent ───────────────────────── */

/**
 * Colours that could be data-1 for a brand accent, best first: the accent's hue (then hues up to 30° either side), at
 * lightnesses nearest the accent's, each clearing the band, chroma, 3:1 on ground and raised, and the reserved hues.
 */
export function accentCandidates(accent: string, get: (name: string) => string): string[] {
  const ground = get('surface-ground'), raised = get('surface-raised');
  const [lo, hi] = DATA_GATES.band[isDarkGround(ground) ? 'dark' : 'light'];
  const [aL, aC, aH] = oklch(accent);
  const reserved = DATA_RESERVED.map((r) => (r === 'accent' ? accent : get(r)));
  const Ls: number[] = [];
  for (let L = lo; L <= hi + 1e-9; L += 0.01) Ls.push(L);
  Ls.sort((x, y) => Math.abs(x - aL) - Math.abs(y - aL) || x - y);
  const out: string[] = [];
  for (let off = 0; off <= 30; off += 5) for (const h of off ? [aH - off, aH + off] : [aH]) {
    const hue = (h + 360) % 360;
    for (const L of Ls) {
      const C = Math.min(maxChroma(L, hue), Math.min(0.2, Math.max(aC, 0.12)));
      if (C < DATA_GATES.chroma) continue;
      const c = fromOklch(L, C, hue);
      if (!c || out.includes(c) || contrastRatio(c, ground) < DATA_GATES.contrast || contrastRatio(c, raised) < DATA_GATES.contrast) continue;
      if (reserved.some((r) => deltaE(c, r) < DATA_GATES.reserved)) continue;
      out.push(c);
    }
  }
  return out;
}

const fits = (a: string, b: string) =>
  deltaE(a, b) >= DATA_GATES.normal && hueGap(oklch(a)[2], oklch(b)[2]) >= DATA_GATES.hue && cvdDeltaE(a, b) >= DATA_GATES.cvdAny;

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

const minAdjacent = (seq: string[]) => Math.min(...seq.slice(1).map((c, i) => cvdDeltaE(seq[i], c)));

/**
 * A scheme's six slots, led by a brand accent. The slot nearest the accent makes way: the first candidate (see
 * accentCandidates) that keeps every pairwise gate with the other five takes its place, or, if none does, that nearest
 * slot leads unchanged. The other five are re-ordered behind data-1: every order is tried and the greatest minimum
 * adjacent CVD ΔE wins, ties keeping the scheme's order; if none clears the adjacent gate, the slot closest to data-1
 * is dropped and the rest tried again. Dropped slots leave the end of the palette to data-other. Deterministic.
 */
export function leadSlots(accent: string, candidates: string[], slots: string[]): { slots: string[]; dropped: string[] } {
  const k = slots.reduce((best, c, i) => (deltaE(c, accent) < deltaE(slots[best], accent) ? i : best), 0);
  const others = slots.filter((_, i) => i !== k);
  const first = candidates.find((c) => others.every((o) => fits(c, o))) ?? slots[k];
  const dropped: string[] = [];
  let keep = others;
  for (;;) {
    let best: string[] = keep, score = -1;
    for (const p of permutations(keep)) { const s = minAdjacent([first, ...p]); if (s > score + 1e-9) { best = p; score = s; } }
    if (score >= DATA_GATES.cvd) return { slots: [first, ...best], dropped };
    // No order passes: give up the slot closest to data-1 for colour-blind readers, and try again.
    const worst = keep.reduce((w, c) => (cvdDeltaE(first, c) < cvdDeltaE(first, w) ? c : w));
    dropped.push(worst);
    keep = keep.filter((c) => c !== worst);
  }
}
