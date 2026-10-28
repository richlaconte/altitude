// Colour science for the data palette: OKLab and OKLCH (Ottosson 2020), colour-vision deficiency simulation (Machado,
// Oliveira & Fernandes 2009, severity 1) and WCAG 2 contrast. Used by palette.mjs; no dependencies.

const lin = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const gam = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

export function hexToRgb(hex) {
  const h = hex.replace('#', '').slice(0, 6);
  return [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
}

export function rgbToHex(rgb) {
  return '#' + rgb.map((x) => Math.round(Math.min(1, Math.max(0, gam(x))) * 255).toString(16).padStart(2, '0')).join('');
}

export function rgbToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function oklch(hex) {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

/** OKLCH → hex, or null when the colour is outside sRGB. */
export function fromOklch(L, C, h) {
  const rad = (h * Math.PI) / 180;
  const rgb = oklabToRgb([L, C * Math.cos(rad), C * Math.sin(rad)]);
  if (rgb.some((x) => x < -1e-4 || x > 1 + 1e-4)) return null;
  return rgbToHex(rgb);
}

/** The most chroma (to 0.001) that hue h holds at lightness L inside sRGB. */
export function maxChroma(L, h) {
  let lo = 0, hi = 0.4;
  while (hi - lo > 0.001) { const mid = (lo + hi) / 2; if (fromOklch(L, mid, h)) lo = mid; else hi = mid; }
  return lo;
}

const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};

function simulate(rgb, kind) {
  if (kind === 'normal') return rgb;
  return MACHADO[kind].map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
}

/** OKLab ΔE × 100 between two hex colours, as seen with normal vision or simulated protanopia or deuteranopia. */
export function deltaE(a, b, kind = 'normal') {
  const [p, q] = [a, b].map((x) => rgbToOklab(simulate(hexToRgb(x), kind)));
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** The smaller of the protan and deutan ΔE. */
export const cvdDeltaE = (a, b) => Math.min(deltaE(a, b, 'protan'), deltaE(a, b, 'deutan'));

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
