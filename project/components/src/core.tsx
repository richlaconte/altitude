import * as React from 'react';
import { createPortal } from 'react-dom';
import { AltitudeContext, ModalProvider, modalDocument, useAltitudeContext } from './modal-state';
import { DATA_RESERVED, DATA_SLOTS, DATA_TOKENS, accentCandidates, checkDataPalette, isDarkGround, leadSlots, oklch, sequentialRamp } from './palette';

/** useLayoutEffect in the browser, useEffect on the server, where layout effects can't run (React 18 warns about them). */
export const useIsoLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

/* ───────────────────────── utilities ───────────────────────── */

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/** A duration token in milliseconds. Minifiers rewrite `220ms` as `.22s`, so the unit is read, not assumed. */
export const cssMs = (cs: CSSStyleDeclaration | null | undefined, name: string, fallback: number) => {
  const raw = cs?.getPropertyValue(name).trim() ?? '', v = parseFloat(raw);
  if (!isFinite(v)) return fallback;
  return /\ds$/.test(raw) && !/ms$/.test(raw) ? v * 1000 : v;
};

/**
 * Mount/unmount with an exit animation. Returns `mounted` (render or not) and
 * `state` ("open" | "closed") for the data-state attribute. The element first
 * renders in its closed pose, then flips to open two frames later so CSS
 * transitions run; on close it stays mounted for `exitMs`.
 */
export function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = React.useState(open);
  const [state, setState] = React.useState<'open' | 'closed'>(open ? 'open' : 'closed');
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setState('open')); });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    setState('closed');
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  return { mounted, state };
}

export function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = React.useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? (value as T) : inner;
  const set = React.useCallback((v: T) => { if (!controlled) setInner(v); onChange?.(v); }, [controlled, onChange]);
  return [current, set] as const;
}

export function useOutside(ref: React.RefObject<HTMLElement | null>, active: boolean, onOutside: () => void) {
  React.useEffect(() => {
    if (!active) return;
    const down = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOutside(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onOutside(); };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [active, onOutside, ref]);
}

/** Spread on an element to make it inert. React 18 passes unknown attributes through as strings and needs ''; React 19
 * knows `inert` as a boolean and treats '' as false. */
export const inert = { inert: React.version.split('.')[0] === '18' ? '' : true } as unknown as React.HTMLAttributes<HTMLElement>;

/* ───────────────────────── keyboard focus ───────────────────────── */

/**
 * A field shows its held rim only when focus arrived from the keyboard; a field you clicked into shows its lit floor and
 * the caret, which is enough when you know where you clicked. Browsers match :focus-visible on text fields after a click
 * too, so one shared listener remembers whether the last input was a key or a pointer and, when focus enters a field
 * (an `.alt-input`, a whole `.alt-select` with its list, or an `.alt-otp` row), marks it `data-key-focus` until focus leaves it. It's decided
 * as focus arrives, so typing into a field you clicked doesn't add the rim, and clicking a field removes it. Until the
 * first pointer input, focus counts as keyboard, so an autofocused field shows its rim.
 */
let keyFocusStarted = false;
export function useKeyFocus() {
  React.useEffect(() => {
    if (keyFocusStarted || typeof document === 'undefined') return;
    keyFocusStarted = true;
    let key = true;
    const scope = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>('.alt-select') ?? t.closest<HTMLElement>('.alt-input') ?? t.closest<HTMLElement>('.alt-otp') : null);
    const inside = (s: HTMLElement, t: EventTarget | null) => t instanceof Node && s.contains(t);
    document.addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) key = true; }, true);
    document.addEventListener('pointerdown', (e) => { key = false; scope(e.target)?.removeAttribute('data-key-focus'); }, true);
    document.addEventListener('focusin', (e) => {
      const s = scope(e.target);
      if (!s) return;
      if (key) s.setAttribute('data-key-focus', '');
      else if (!inside(s, e.relatedTarget)) s.removeAttribute('data-key-focus');
    }, true);
    document.addEventListener('focusout', (e) => {
      const s = scope(e.target);
      if (s && !inside(s, e.relatedTarget)) s.removeAttribute('data-key-focus');
    }, true);
  }, []);
}

/* ───────────────────────── approach ───────────────────────── */

/**
 * The pointer is felt before it arrives. One shared tracker watches a fine pointer (mouse or pen, never touch) and,
 * for every element marked `data-approach`, writes:
 *   --near  0 when the pointer is further than the element's radius (data-approach="96" sets it; default 64px),
 *           rising smoothly to 1 when it touches the element;
 *   --mx --my  where the pointer is on the element (−1…1 from centre) while it's over it, else 0.
 * Altitude's own components use it only for openings: an empty field (Input, Textarea, Select, Combobox) deepens to
 * receive, and a bottom sheet's finger pull opens under a hand. Raised things never respond to approach and never
 * follow the pointer: a button or a card stays exactly where it is until the pointer is on it. All of it is multiplied
 * by --alt-travel, so reduced motion turns it off. `AltitudeProvider approach={false}` turns it off for a subtree.
 */
let approachUsers = 0;
let approachStop: (() => void) | null = null;
function startApproach() {
  let x = 0, y = 0, live = false, raf = 0;
  let touched = new Set<HTMLElement>();
  const clear = (el: HTMLElement) => { el.style.removeProperty('--near'); el.style.removeProperty('--mx'); el.style.removeProperty('--my'); };
  const frame = () => {
    raf = 0;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-approach]'));
    const rects = els.map((el) => el.getBoundingClientRect()); // read everything first, then write
    const next = new Set<HTMLElement>();
    els.forEach((el, i) => {
      const r = rects[i];
      const radius = Number(el.dataset.approach) || 64;
      const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
      const d = Math.hypot(dx, dy);
      if (!live || d >= radius || !r.width || el.closest('[data-approach-off]')) return;
      const t = 1 - d / radius;
      el.style.setProperty('--near', (t * t * (3 - 2 * t)).toFixed(3));
      const inside = d === 0;
      el.style.setProperty('--mx', inside ? (((x - r.left) / r.width) * 2 - 1).toFixed(3) : '0');
      el.style.setProperty('--my', inside ? (((y - r.top) / r.height) * 2 - 1).toFixed(3) : '0');
      next.add(el);
    });
    touched.forEach((el) => { if (!next.has(el)) clear(el); });
    touched = next;
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const move = (e: PointerEvent) => { if (e.pointerType === 'touch') { live = false; } else { live = true; x = e.clientX; y = e.clientY; } schedule(); };
  const leave = (e: PointerEvent) => { if (!e.relatedTarget) { live = false; schedule(); } };
  const blur = () => { live = false; schedule(); };
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerdown', move, { passive: true });
  document.addEventListener('pointerout', leave, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('blur', blur);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', move);
    document.removeEventListener('pointerout', leave); window.removeEventListener('scroll', schedule, { capture: true });
    window.removeEventListener('blur', blur);
    touched.forEach(clear);
  };
}
/** Keeps the shared approach tracker running while any component that reacts to it is mounted. */
export function useApproach(enabled = true) {
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (approachUsers++ === 0) approachStop = startApproach();
    return () => { if (--approachUsers === 0) { approachStop?.(); approachStop = null; } };
  }, [enabled]);
}

/* ───────────────────────── icons (1.75 stroke, Lucide-compatible grid) ───────────────────────── */

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };
const icon = (paths: React.ReactNode) => ({ size = 16, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{paths}</svg>
);
export const Icons = {
  Check: icon(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  ChevronDown: icon(<path d="M6 9l6 6 6-6" />),
  X: icon(<path d="M6 6l12 12M18 6L6 18" />),
  Info: icon(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  Pencil: icon(<><path d="M16.5 3.5l4 4L8 20l-5 1 1-5z" /><path d="M14 6l4 4" /></>),
  CircleCheck: icon(<><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>),
  AlertCircle: icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" /></>),
  Copy: icon(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" /></>),
  ArrowUp: icon(<><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>),
  Stop: icon(<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />),
  Paperclip: icon(<path d="m21 11-8.6 8.6a5 5 0 0 1-7-7l8.5-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.3-2.4l7.9-7.9" />),
  ThumbsUp: icon(<><path d="M7 10v11" /><path d="M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18.4 21H7V10l4-8a3 3 0 0 1 4 3.9Z" /></>),
  ThumbsDown: icon(<><path d="M17 14V3" /><path d="M9 18.1 10 14H4.2a2 2 0 0 1-2-2.3l1.4-7A2 2 0 0 1 5.6 3H17v11l-4 8a3 3 0 0 1-4-3.9Z" /></>),
  Refresh: icon(<><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></>),
  ArrowDown: icon(<><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>),
  Spark: icon(<path d="M12 3c.5 4.2 2.8 6.5 7 7-4.2.5-6.5 2.8-7 7-.5-4.2-2.8-6.5-7-7 4.2-.5 6.5-2.8 7-7Z" />),
  Lock: icon(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  Pin: icon(<><path d="M12 17v5" /><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z" /></>),
  Bell: icon(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  Eye: icon(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>),
  EyeOff: icon(<><path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 5.4-1.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></>),
  Clock: icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  PanelLeft: icon(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9.5 4.5v15" /></>),
  More: icon(<><circle cx="5" cy="12" r="1.25" /><circle cx="12" cy="12" r="1.25" /><circle cx="19" cy="12" r="1.25" /></>),
  ExternalLink: icon(<><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>),
  AlertTriangle: icon(<><path d="M10.3 4.2L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" /><path d="M12 9.5v4M12 17h.01" /></>),
};
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="alt-spinner" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="2.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}

/* ───────────────────────── colour math for custom accents ───────────────────────── */

type RGB = [number, number, number];
const hexToRgb = (hex: string): RGB => {
  let h = hex.trim().replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
  const n = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (n.some(isNaN) ? [255, 255, 255] : n) as RGB;
};
const rgbToHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const lum = (c: RGB) => {
  const f = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
export const contrast = (a: string, b: string) => {
  const la = lum(hexToRgb(a)), lb = lum(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const mix = (a: RGB, b: RGB, t: number) => a.map((v, i) => v + (b[i] - v) * t) as RGB;

/**
 * Derive the four accent tokens from one brand colour, against the surfaces of
 * the active scheme: `accent` (as given), `on-accent` (white or ink, whichever
 * reads at 4.5:1), `accent-ink` (nudged toward ink until it reads at 4.5:1 on
 * every surface passed) and `accent-soft` (a tint of the ground).
 */
export function deriveAccent(accent: string, surfaces: string[]) {
  const a = hexToRgb(accent);
  const ground = surfaces[0] || '#ffffff';
  const dark = lum(hexToRgb(ground)) < 0.2;
  const toward: RGB = dark ? [255, 255, 255] : [0, 0, 0];
  let ink = a, t = 0;
  const worst = (c: RGB) => Math.min(...surfaces.filter(Boolean).map((s) => contrast(rgbToHex(c), s)));
  while (t < 1 && worst(ink) < 4.6) { t += 0.03; ink = mix(a, toward, t); }
  const onAccent = contrast('#ffffff', accent) >= 5 ? '#ffffff' : rgbToHex(mix(a, [0, 0, 0], 0.82));
  return {
    '--accent': rgbToHex(a),
    '--on-accent': onAccent,
    '--accent-ink': rgbToHex(ink),
    '--accent-soft': rgbToHex(mix(hexToRgb(ground), a, dark ? 0.2 : 0.13)),
  } as React.CSSProperties;
}

/* ───────────────────────── custom schemes ───────────────────────── */

const SURFACES = ['surface-trench', 'surface-well', 'surface-ground', 'surface-raised', 'surface-lifted', 'surface-floating', 'surface-overlay', 'surface-modal'] as const;
export type SchemeColorToken = typeof SURFACES[number] | 'ink' | 'ink-muted' | 'ink-faint' | 'line' | 'line-control'
  | 'accent' | 'on-accent' | 'accent-ink' | 'accent-soft' | 'positive' | 'positive-soft' | 'caution' | 'caution-soft'
  | 'critical' | 'critical-soft' | 'on-critical' | 'presence-1' | 'presence-2' | 'presence-3' | 'on-presence' | 'scrim' | DataColorToken;
/** The data palette (charts only): categorical slots, the fold, the magnitude ramp and the diverging ramp. */
export type DataColorToken = `data-${1 | 2 | 3 | 4 | 5 | 6}` | 'data-other' | `data-seq-${1 | 2 | 3 | 4 | 5 | 6 | 7}`
  | `data-div-${'neg' | 'pos'}-${1 | 2 | 3}` | 'data-div-mid';
export type SchemeShadowToken = 'trench' | 'well' | 'elev-0' | 'elev-1' | 'elev-2' | 'elev-3' | 'elev-4' | 'elev-5' | 'lip-top' | 'lip-bottom';

// The invariants of Theming.md ("Making a new scheme"), as [text, ground, minimum ratio]; build/tokens.py checks the same.
const PAIRS: Array<[string, string, number]> = [];
for (const t of ['ink', 'ink-muted', 'accent-ink', 'positive', 'caution', 'critical']) for (const g of SURFACES) PAIRS.push([t, g, 4.5]);
for (const [t, g] of [['ink', 'accent-soft'], ['accent-ink', 'accent-soft'], ['positive', 'positive-soft'], ['caution', 'caution-soft'], ['critical', 'critical-soft'],
  ['ink', 'critical-soft'], ['ink', 'positive-soft'], ['ink', 'caution-soft'], ['ink-muted', 'accent-soft'], ['on-accent', 'accent'], ['on-critical', 'critical']]) PAIRS.push([t, g, 4.5]);
for (const g of ['surface-ground', 'surface-well', 'surface-raised', 'surface-trench']) PAIRS.push(['line-control', g, 3], ['accent', g, 3]);
for (const p of ['presence-1', 'presence-2', 'presence-3']) { PAIRS.push(['on-presence', p, 4.5]); for (const g of SURFACES) PAIRS.push([p, g, 3]); }
const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);

/** Which invariants checkScheme measures: `core` is the surface ladder and contrast, `data` the data palette's gates. */
export type SchemeCheck = 'core' | 'data';

/**
 * Check a scheme against the invariants every scheme keeps: the surfaces climb in lightness (trench < well < ground
 * < raised ≤ … ≤ modal) and text, control edges and presence colours hold their contrast on every surface. Pass the
 * colour tokens by name (without `--`), or an element to read them from. Returns one sentence per problem; [] passes.
 * Only hex values can be measured; any other value of a checked token is reported.
 *
 * `include` picks the checks; it defaults to `['core']`. Add `'data'` for the data palette's gates (Theming.md, "The
 * data palette"): lightness band and chroma, colour-blind and normal-vision separation, 3:1 on ground and raised,
 * distance from the accent, status and presence hues, and monotone ramps.
 */
export function checkScheme(colors: Partial<Record<SchemeColorToken, string>> | Element, options: { include?: SchemeCheck[] } = {}): string[] {
  const include = options.include ?? ['core'];
  const cs = typeof Element !== 'undefined' && colors instanceof Element ? getComputedStyle(colors) : null;
  const get = (n: string) => (cs ? cs.getPropertyValue('--' + n) : (colors as Record<string, string | undefined>)[n] ?? '').trim();
  const out: string[] = [];
  const seen = new Set<string>();
  const ok = (n: string) => {
    const v = get(n);
    if (isHex(v)) return true;
    if (!seen.has(n)) { seen.add(n); out.push(v ? `${n} is ${v}: use a 3- or 6-digit hex colour so it can be checked.` : `${n} is missing.`); }
    return false;
  };
  const L = (n: string) => lum(hexToRgb(get(n)));
  if (include.includes('data')) {
    const need = ['surface-ground', 'surface-raised', ...DATA_RESERVED, ...DATA_TOKENS];
    if (need.map(ok).every(Boolean)) out.push(...checkDataPalette(get));
  }
  if (!include.includes('core')) return out;
  for (let i = 1; i < SURFACES.length; i++) {
    const lo = SURFACES[i - 1], hi = SURFACES[i];
    if (!ok(lo) || !ok(hi)) continue;
    // Light schemes reach white at raised, so the upper rungs may tie; the lower three must step.
    if (i <= 3 ? L(hi) <= L(lo) : L(hi) < L(lo)) out.push(`${hi} (${get(hi)}) must be ${i <= 3 ? 'lighter than' : 'at least as light as'} ${lo} (${get(lo)}).`);
  }
  for (const [t, g, min] of PAIRS) {
    if (!ok(t) || !ok(g)) continue;
    const r = contrast(get(t), get(g));
    if (r < min) out.push(`${t} on ${g} is ${r.toFixed(2)}:1; it needs ${min}:1.`);
  }
  return out;
}

export interface CustomScheme {
  /** Stamped as data-scheme on the provider's root. */
  name: string;
  /** The built-in scheme your tokens are laid over: any token you leave out comes from it, and so does light or dark
   *  handling (casts, rims, walls). Use nightfall or alpine for a dark scheme. Default 'daylight'. */
  base?: BuiltInScheme;
  /** Colour and shadow tokens by name, without `--`. */
  tokens: Partial<Record<SchemeColorToken | SchemeShadowToken, string>>;
}

/**
 * The data palette for a custom accent, read against the scheme the provider's root wears: the scheme's slot nearest
 * the accent makes way for a colour in the accent's hue (see leadSlots), the rest re-order behind it, and the magnitude
 * ramp follows data-1's hue. Returns the variables, and one sentence per slot the accent cost.
 */
function deriveData(accent: string, root: HTMLElement): { vars: Record<string, string>; notes: string[] } {
  // Read the scheme's own values from a twin of the root: the root itself already wears the derived variables.
  const twin = root.ownerDocument.createElement('div');
  twin.className = 'alt-root';
  twin.hidden = true;
  for (const a of ['data-theme', 'data-scheme-id']) { const v = root.getAttribute(a); if (v) twin.setAttribute(a, v); }
  (root.parentNode ?? root.ownerDocument.body).insertBefore(twin, root);
  const cs = getComputedStyle(twin);
  const base: Record<string, string> = {};
  for (const n of ['surface-ground', 'surface-raised', ...DATA_RESERVED, ...DATA_TOKENS]) base[n] = cs.getPropertyValue('--' + n).trim();
  twin.remove();
  base.accent = accent;
  const bad = Object.entries(base).filter(([, v]) => !isHex(v)).map(([n]) => n);
  if (bad.length) return { vars: {}, notes: [`${bad.join(', ')} ${bad.length > 1 ? 'aren\'t' : 'isn\'t'} a hex colour, so the data palette can't follow the accent.`] };
  const get = (n: string) => base[n];
  const { slots, dropped } = leadSlots(accent, accentCandidates(accent, get), DATA_SLOTS.map(get));
  const vars: Record<string, string> = {};
  DATA_SLOTS.forEach((n, i) => (vars['--' + n] = slots[i] ?? base['data-other']));
  sequentialRamp(oklch(slots[0])[2], isDarkGround(base['surface-ground'])).forEach((c, i) => (vars[`--data-seq-${i + 1}`] = c));
  const notes = dropped.map((c) => `${DATA_SLOTS[DATA_SLOTS.map(get).indexOf(c)]} ${c} can't sit beside the accent's data-1 ${slots[0]} for colour-blind readers in any order, so it's dropped and the palette ends in data-other.`);
  return { vars, notes };
}

const SHADOW_OR_LINE = /^(trench|well|elev-\d|lip-top|lip-bottom|line)$/;
/** A custom scheme as a stylesheet scoped to one provider. Shadows and `line` give way to high contrast, as the built-in ones do. */
function schemeCss(sel: string, tokens: CustomScheme['tokens']) {
  const decl = (keep: (k: string) => boolean) => Object.entries(tokens)
    .filter(([k, v]) => keep(k) && typeof v === 'string' && /^[\w-]+$/.test(k) && !/[;{}<>]/.test(v))
    .map(([k, v]) => `--${k}: ${v};`).join(' ');
  const plain = decl((k) => !SHADOW_OR_LINE.test(k)), soft = decl((k) => SHADOW_OR_LINE.test(k));
  let css = plain ? `${sel} { ${plain} }` : '';
  if (soft) css += `@media not (prefers-contrast: more) { ${sel}:not([data-contrast="more"], [data-contrast="more"] *) { ${soft} } }`;
  return css;
}

/* ───────────────────────── provider ───────────────────────── */

export type BuiltInScheme = 'daylight' | 'nightfall' | 'mesa' | 'alpine';
/** A built-in scheme, the name of your own [data-theme="…"] block, or a CustomScheme. */
export type Scheme = BuiltInScheme | (string & {});
type Ctx = { host: HTMLElement | null; provider: ModalProvider };
/** The nearest theme's portal host. Modal ownership stays private. */
export const useAltitude = () => {
  const context = useAltitudeContext();
  return React.useMemo(() => context ? { host: context.host,
    /** @deprecated Internal visual-only compatibility helper; use Dialog or Sheet for modal behavior. */
    pushLayer: () => {
      const doc = context.provider.stage?.ownerDocument ?? context.host?.ownerDocument;
      return doc ? modalDocument(doc).vote(context.provider) : () => {};
    },
  } : null, [context?.host]);
};

export interface AltitudeProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  scheme?: Scheme | CustomScheme;
  accent?: string;
  motion?: 'system' | 'full' | 'reduced';
  /** 'more' renders elevation as hard, high-contrast slabs (offset = height). 'system' follows prefers-contrast. */
  contrast?: 'system' | 'more';
  /**
   * How large controls are (#245). 'auto' (default): today's sizes for a mouse, a step up under a coarse pointer (a
   * finger), so they're big enough to hit. 'comfortable': the larger sizes everywhere (a kiosk, an accessibility
   * setting). 'compact': today's sizes even on touch. Hit areas reach 44px under a coarse pointer either way.
   */
  density?: 'auto' | 'compact' | 'comfortable';
  recede?: boolean;
  /** Openings deepen as the pointer approaches (empty fields, a sheet's finger pull). Default true; reduced motion turns it off regardless. */
  approach?: boolean;
  /**
   * How content that's still on its way waits (#343). 'sweep' (default): light passes over each imprint. 'breath'
   * (experimental): imprints breathe in depth on one page clock, a swell crossing the view top to bottom; content that
   * rests raised (`Await settle="raised"`) rises a level past its rest and settles, flush content fills past the ground,
   * and a card's parts land together. Nested providers inherit it.
   */
  loading?: 'sweep' | 'breath';
  /**
   * The whole app is in a mode people must never mistake for the normal app: test mode, viewing as a customer,
   * read-only, a preview. Height can't say "this whole ground is different", so it's said in words and a border: a
   * flush strip naming the mode at the top, a 2px frame around the viewport, and a plate in every Dialog and Sheet.
   */
  mode?: AppMode;
  /**
   * Development checks: warns when more than one primary Button is visible in one view (law 1). Each Dialog, Sheet and
   * Popover is its own view, and <PrimaryScope> makes another. Default: on when process.env.NODE_ENV isn't 'production'.
   */
  devChecks?: boolean;
}
export interface AppMode {
  label: string;
  description?: React.ReactNode;
  /** Default 'caution'. */
  tone?: 'caution' | 'accent' | 'critical' | 'neutral';
  /** A way out ("Leave test mode"). The strip can't be dismissed. */
  action?: React.ReactNode;
}
/* ── One primary per view (law 1), checked in development. ── */
declare const process: { env: { NODE_ENV?: string } } | undefined;
type PrimaryScopeT = { register: (el: HTMLElement) => () => void } | null;
const PrimaryScopeCtx = React.createContext<PrimaryScopeT>(null);
const warnedScopes = new Set<string>();
const visible = (el: HTMLElement) => el.isConnected && (typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.offsetParent !== null);
/** A scope of its own for "one primary action": a page, a Dialog, a Sheet, a Popover, or an independent card. */
function useScopeValue(name: string, enabled: boolean): PrimaryScopeT {
  const els = React.useRef(new Set<HTMLElement>());
  const timer = React.useRef<number | undefined>(undefined);
  return React.useMemo(() => {
    if (!enabled) return null;
    const check = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const shown = [...els.current].filter(visible);
        if (shown.length < 2) return;
        const names = shown.map((b) => `"${(b.getAttribute('aria-label') || b.textContent || '').trim()}"`);
        const key = name + '|' + names.join(',');
        if (warnedScopes.has(key)) return;
        warnedScopes.add(key);
        console.warn(`Altitude: ${shown.length} primary buttons are visible in one ${name} (${names.join(', ')}). Law 1: the primary action rests at level 2, one per view. Make the others secondary, or wrap independent parts in <PrimaryScope>.`);
      }, 50);
    };
    return { register: (el: HTMLElement) => { els.current.add(el); check(); return () => { els.current.delete(el); check(); }; } };
  }, [enabled, name]);
}
/** Opens a scope of its own for the one-primary check: an independent card on a dashboard, a dialog. */
export function PrimaryScope({ name = 'scope', children }: { name?: string; children: React.ReactNode }) {
  const parent = React.useContext(PrimaryScopeCtx);
  const value = useScopeValue(name, parent !== null);
  return <PrimaryScopeCtx.Provider value={value}>{children}</PrimaryScopeCtx.Provider>;
}
/** Button variant="primary" registers itself with the nearest scope while it's mounted. */
export function usePrimaryRegistration(el: React.RefObject<HTMLElement | null>, primary: boolean) {
  const scope = React.useContext(PrimaryScopeCtx);
  React.useEffect(() => { if (!scope || !primary || !el.current) return; return scope.register(el.current); }, [scope, primary, el]);
}

/** The provider's loading style, for the parts of loading that aren't only CSS (RevealGroup's budget, Card's grouping). */
export const LoadingStyleContext = React.createContext<'sweep' | 'breath'>('sweep');
/** The app's mode, for Dialog and Sheet to name it in their headers. */
export const ModeContext = React.createContext<AppMode | null>(null);
/** The mode's name as a plate, for headers of things that float above the page (Dialog, Sheet). */
export function ModePlate() {
  const mode = React.useContext(ModeContext);
  return mode ? <span className="alt-badge alt-mode-plate" data-tone={mode.tone ?? 'caution'} data-variant="plate">{mode.label}</span> : null;
}

export function AltitudeProvider({ scheme, accent, motion = 'system', contrast = 'system', density = 'auto', recede = true, approach = true, loading, mode, devChecks, className, style, children, ...rest }: AltitudeProviderProps) {
  const inherited = React.useContext(LoadingStyleContext);
  const loadingStyle = loading ?? inherited;
  const checks = devChecks ?? (typeof process !== 'undefined' && process?.env.NODE_ENV !== 'production');
  const pageScope = useScopeValue('page', checks);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [host, setHost] = React.useState<HTMLElement | null>(null);
  const parent = useAltitudeContext();
  const provider = React.useRef<ModalProvider>({ stage: null, parent: parent?.provider ?? null, recede, owners: new Set(), legacy: new Set() }).current;
  provider.recede = recede;
  provider.parent = parent?.provider ?? null;
  useIsoLayoutEffect(() => {
    const doc = provider.stage?.ownerDocument;
    return () => { if (doc) modalDocument(doc).releaseProvider(provider); };
  }, [provider]);
  useIsoLayoutEffect(() => { if (provider.stage && provider.owners.size) modalDocument(provider.stage.ownerDocument).reconcile(); });
  const [accentVars, setAccentVars] = React.useState<React.CSSProperties | null>(null);
  const custom = scheme && typeof scheme === 'object' ? scheme : null;
  const schemeKey = custom ? JSON.stringify(custom) : (scheme as string | undefined);
  const scope = React.useId();
  const schemeSel = `.alt-root[data-scheme-id="${scope}"]`;

  // A custom scheme that breaks the invariants says so, once per version of it.
  const warned = React.useRef('');
  React.useEffect(() => {
    if (!custom || !rootRef.current || warned.current === schemeKey) return;
    warned.current = schemeKey!;
    const issues = checkScheme(rootRef.current, { include: ['core', 'data'] });
    if (issues.length) console.warn(`Altitude: the scheme "${custom.name}" breaks ${issues.length} of the scheme invariants (see Theming.md):\n` + issues.join('\n'));
  }, [schemeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const accentWarned = React.useRef('');
  useIsoLayoutEffect(() => {
    if (!accent || !rootRef.current) { setAccentVars(null); return; }
    const el = rootRef.current;
    const compute = () => {
      const cs = getComputedStyle(el);
      const read = (n: string) => cs.getPropertyValue(n).trim();
      const data = deriveData(accent, el);
      setAccentVars({ ...deriveAccent(accent, ['--surface-ground', '--surface-trench', '--surface-raised', '--surface-modal'].map(read)), ...data.vars } as React.CSSProperties);
      const key = accent + '|' + (el.getAttribute('data-theme') ?? el.ownerDocument.documentElement.getAttribute('data-theme') ?? '') + '|' + schemeKey;
      if (data.notes.length && accentWarned.current !== key) {
        accentWarned.current = key;
        console.warn(`Altitude: the accent ${accent} changes the data palette (see Theming.md, "Custom accent"):\n` + data.notes.join('\n'));
      }
    };
    compute();
    const mo = new MutationObserver(compute);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, [accent, schemeKey]);

  const api = React.useMemo<Ctx>(() => ({
    host,
    provider,
  }), [host]);
  // Entering a mode is said once, politely; being in it isn't repeated.
  const [modeSaid, setModeSaid] = React.useState('');
  React.useEffect(() => { setModeSaid(mode ? `${mode.label} on` : ''); }, [mode?.label]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AltitudeContext.Provider value={api}>
      <div ref={rootRef} className={cx('alt-root', className)} data-theme={custom ? custom.base ?? 'daylight' : scheme}
        data-scheme={custom?.name} data-scheme-id={custom ? scope : undefined}
        data-motion={motion === 'system' ? undefined : motion} data-contrast={contrast === 'more' ? 'more' : undefined} data-density={density === 'auto' ? undefined : density}
        data-approach-off={approach ? undefined : ''} data-loading={loading} style={{ ...accentVars, ...style }} {...rest}>
        {custom && <style>{schemeCss(schemeSel, custom.tokens)}</style>}
        <LoadingStyleContext.Provider value={loadingStyle}><PrimaryScopeCtx.Provider value={pageScope}><ModeContext.Provider value={mode ?? null}>
          {mode && (
            <section className="alt-mode-strip" data-tone={mode.tone ?? 'caution'} aria-label={mode.label}>
              <strong className="alt-mode-label">{mode.label}</strong>
              {mode.description && <span className="alt-mode-desc">{mode.description}</span>}
              {mode.action && <span className="alt-mode-action">{mode.action}</span>}
            </section>
          )}
          <div className="alt-stage" ref={(el) => { provider.stage = el; }}>{children}</div>
          <div className="alt-layers" ref={setHost} />
          {mode && <div className="alt-mode-frame" data-tone={mode.tone ?? 'caution'} aria-hidden="true" />}
          {mode && <span className="alt-sr" aria-live="polite">{modeSaid}</span>}
        </ModeContext.Provider></PrimaryScopeCtx.Provider></LoadingStyleContext.Provider>
      </div>
    </AltitudeContext.Provider>
  );
}

/** Renders into the provider's layer host (inside the theme, outside the receding stage), else document.body. */
export function Layer({ children }: { children: React.ReactNode }) {
  const ctx = useAltitudeContext();
  const [ready, setReady] = React.useState(false);
  useIsoLayoutEffect(() => setReady(true), []);
  if (!ready) return null;
  const target = ctx ? ctx.host : document.body;
  return target ? createPortal(children, target) : null;
}

/* ───────────────────────── Depth signals ───────────────────────── */

/**
 * Attention budget: abrupt onsets capture attention, and people track only about
 * four moving things at once. Rises that start together are staggered so no more
 * than four begin within any 250ms window.
 */
const riseStarts: number[] = [];
export function riseDelay() {
  const now = performance.now();
  while (riseStarts.length && now - riseStarts[0] > 250) riseStarts.shift();
  const delay = Math.max(0, riseStarts.length - 3) * 90;
  riseStarts.push(now + delay);
  return delay;
}

/** One breath of a waiting imprint (dur-breath), how long its swell takes to cross the view (dur-wave), and when it calms. */
const BREATH = 4800, WAVE = 1800, CALM = 10000;
/**
 * Breath (loading="breath"): an imprint takes its phase from one page clock, lagged by how far down the view it sits,
 * so imprints change in step (one moving thing, not many) and a slow swell of depth crosses the view. Ten seconds in,
 * it calms. Returns a ref for the element whose imprints breathe; does nothing under the sweep.
 */
export function useBreath<T extends HTMLElement>() {
  const breath = React.useContext(LoadingStyleContext) === 'breath';
  const calm = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(calm.current), []);
  // A callback ref, so an imprint that appears after its component mounted (a held one) is phased too.
  return React.useCallback((el: T | null) => {
    clearTimeout(calm.current);
    if (!breath || !el) return;
    const vh = el.ownerDocument.defaultView?.innerHeight || 1;
    const lag = Math.min(1, Math.max(0, el.getBoundingClientRect().top / vh)) * WAVE;
    el.style.setProperty('--alt-breath-delay', `${Math.round(lag - (performance.now() % BREATH))}ms`);
    calm.current = setTimeout(() => el.setAttribute('data-calm', ''), CALM);
  }, [breath]);
}

export type Presence = 1 | 2 | 3;
export interface DepthProps {
  /** Afterglow. Any value: when it changes the surface lifts, tints and settles back over dur-settle. `true` settles once on mount. */
  settle?: unknown;
  /** Commit state of an optimistic write. pending hovers above the ground (after dur-grace), committed lands, failed drops into a trench. */
  status?: 'pending' | 'committed' | 'failed';
  /** Someone is holding this: lifted to level 3 with their presence colour and name. */
  heldBy?: { name: string; presence?: Presence } | null;
  /** Focus+context. match rises one level, miss sinks into a well; nothing is removed. */
  relevance?: 'match' | 'miss';
}

/** Turns depth signals into the data attributes bundle.css reads. Spread the result onto any surface. */
export function useDepth({ settle, status, heldBy, relevance }: DepthProps) {
  const [glow, setGlow] = React.useState<'a' | 'b' | undefined>(undefined);
  const [land, setLand] = React.useState<'a' | 'b' | undefined>(undefined);
  const [delay, setDelay] = React.useState(0);
  const mounted = React.useRef(false);
  const lastStatus = React.useRef(status);
  React.useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if (settle === undefined || settle === null || settle === false) return;
    if (first && settle !== true) return;
    setDelay(riseDelay());
    setGlow((g) => (g === 'a' ? 'b' : 'a'));
  }, [settle]);
  React.useEffect(() => {
    if (lastStatus.current === 'pending' && status === 'committed') setLand((l) => (l === 'a' ? 'b' : 'a'));
    lastStatus.current = status;
  }, [status]);
  return {
    'data-settle': glow,
    'data-land': land,
    'data-status': status,
    'data-held': heldBy ? '' : undefined,
    'data-held-by': heldBy?.name,
    'data-presence': heldBy ? String(heldBy.presence ?? 1) : undefined,
    'data-relevance': relevance,
    'aria-busy': status === 'pending' || undefined,
    style: delay ? ({ '--alt-rise-delay': delay + 'ms' } as React.CSSProperties) : undefined,
  };
}

/* ───────────────────────── Surface ───────────────────────── */

export type Level = -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;
export interface SurfaceProps extends React.HTMLAttributes<HTMLElement>, DepthProps {
  level?: Level;
  interactive?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  as?: keyof React.JSX.IntrinsicElements;
}
export const Surface = React.forwardRef<HTMLElement, SurfaceProps>(function Surface(
  { level = 1, interactive = false, as = 'div', disabled = false, type, className, settle, status, heldBy, relevance, style,
    onClick, onKeyDown, onKeyUp, onBlur, ...rest }, ref) {
  const Comp = as as any;
  const { style: depthStyle, ...depth } = useDepth({ settle, status, heldBy, relevance });
  const space = React.useRef(false);
  const unavailable = disabled || rest['aria-disabled'] === true || rest['aria-disabled'] === 'true';
  const native = as === 'button' || (as === 'a' && !!rest.href) || as === 'input' || as === 'select' || as === 'textarea';
  const pressable = interactive && !!onClick;
  const synthetic = pressable && !native && (!rest.role || rest.role === 'button');
  const nestedControl = (event: React.MouseEvent<HTMLElement>) => {
    const control = (event.target as Element).closest('button, a[href], input, select, textarea, [role="button"], [role="link"], [contenteditable="true"]');
    return control && control !== event.currentTarget && event.currentTarget.contains(control);
  };
  return <Comp ref={ref} className={cx('alt-surface', interactive && !unavailable && 'alt-lift', className)} data-level={String(level)}
    {...depth} style={{ ...depthStyle, ...style }} {...rest}
    type={as === 'button' ? type ?? 'button' : type} disabled={native && as !== 'a' ? disabled : undefined}
    href={as === 'a' && unavailable ? undefined : rest.href}
    aria-disabled={unavailable || rest['aria-disabled']} role={rest.role ?? (as === 'a' && unavailable && rest.href ? 'link' : synthetic ? 'button' : undefined)}
    tabIndex={unavailable && (pressable || native) ? -1 : rest.tabIndex ?? (synthetic ? 0 : undefined)}
    onClick={(e: React.MouseEvent<HTMLElement>) => {
      if (unavailable && (pressable || native)) { e.preventDefault(); return; }
      if (pressable && nestedControl(e)) return;
      onClick?.(e);
    }}
    onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
      onKeyDown?.(e);
      if (!synthetic || unavailable || e.defaultPrevented || e.target !== e.currentTarget || e.nativeEvent.isComposing) return;
      if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) e.currentTarget.click(); }
      if (e.key === ' ') { e.preventDefault(); space.current = true; }
    }}
    onKeyUp={(e: React.KeyboardEvent<HTMLElement>) => {
      onKeyUp?.(e);
      if (e.key !== ' ') return;
      const pressed = space.current; space.current = false;
      if (synthetic && pressed && !unavailable && !e.defaultPrevented && e.target === e.currentTarget) { e.preventDefault(); e.currentTarget.click(); }
    }}
    onBlur={(e: React.FocusEvent<HTMLElement>) => { space.current = false; onBlur?.(e); }} />;

});

/* ───────────────────────── Kbd ───────────────────────── */

// Whether a keyboard is likely (#262): not on a touch-only device until a key is pressed, after which it is for the
// rest of the session (a tablet's hardware keyboard). Shared, so every hint turns on together.
let keySeen = false;
const keyListeners = new Set<() => void>();
const touchOnlyQuery = '(hover: none) and (pointer: coarse)';
/**
 * Whether the person likely has a keyboard: false on a touch-only device (no hover, a coarse pointer) until a key is
 * pressed in the session, true otherwise. Components hide shortcut hints when it's false; the shortcuts still work.
 */
export function useKeyboardLikely(): boolean {
  const [touchOnly, setTouchOnly] = React.useState(false);
  const [, bump] = React.useState(0);
  React.useEffect(() => {
    const mq = window.matchMedia?.(touchOnlyQuery);
    if (!mq) return;
    const sync = () => setTouchOnly(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    // Only a touch-only instance can change its answer, so only it re-renders on the first key.
    const seen = () => { if (mq.matches) bump((n) => n + 1); };
    keyListeners.add(seen);
    if (keyListeners.size === 1) window.addEventListener('keydown', onFirstKey, true);
    return () => { mq.removeEventListener?.('change', sync); keyListeners.delete(seen); if (!keyListeners.size) window.removeEventListener('keydown', onFirstKey, true); };
  }, []);
  return !touchOnly || keySeen;
}
function onFirstKey() {
  if (keySeen) return;
  keySeen = true;
  window.removeEventListener('keydown', onFirstKey, true);
  keyListeners.forEach((f) => f());
}

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** A KeyboardEvent.key (case-insensitive) — the key presses down while it is held. */
  listen?: string;
  /**
   * Hide it on a touch-only device until a key is pressed (#262): for a hint that only makes sense with a keyboard.
   * Off by default, since an app may be documenting its shortcuts on purpose. Components' own hints do this already.
   */
  hideOnTouch?: boolean;
}
export function Kbd({ listen, hideOnTouch, className, children, ...rest }: KbdProps) {
  const keyboard = useKeyboardLikely();
  const [down, setDown] = React.useState(false);
  React.useEffect(() => {
    if (!listen) return;
    const k = listen.toLowerCase();
    const on = (e: KeyboardEvent) => { if (e.key.toLowerCase() === k) setDown(true); };
    const off = (e: KeyboardEvent) => { if (e.key.toLowerCase() === k || e.key === 'Meta') setDown(false); };
    const blur = () => setDown(false);
    window.addEventListener('keydown', on); window.addEventListener('keyup', off); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', on); window.removeEventListener('keyup', off); window.removeEventListener('blur', blur); };
  }, [listen]);
  if (hideOnTouch && !keyboard) return null;
  return <kbd className={cx('alt-kbd', className)} data-pressed={down ? '' : undefined} {...rest}>{children}</kbd>;
}
