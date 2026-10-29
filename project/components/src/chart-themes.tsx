// altitude-design/chart-themes: Altitude's palette, type, surfaces and motion as plain theme objects for canvas chart
// libraries Altitude doesn't draw (ECharts, Chart.js). Nothing here imports either library, or the components: the
// objects are read from the computed tokens of an element, or from tokens passed by name.
import * as React from 'react';

/** Token values by name, without `--` (as in tokens.json), e.g. `{ 'data-1': '#3d5bd9', ink: '#141a29' }`. */
export type ChartTokens = Record<string, string>;
/** An element to read the active scheme's computed tokens from, or the tokens themselves. */
export type ChartTokenSource = Element | ChartTokens;

export interface ChartThemeOptions {
  /** Zero every animation. Read from the element (`prefers-reduced-motion`, or `AltitudeProvider motion`) when omitted. */
  reducedMotion?: boolean;
  /** Turn on pattern fills (ECharts decals) so no series relies on colour alone. On under forced colours regardless. */
  patterns?: boolean;
  /** Forced colours are active. Read from the element's window when omitted. */
  forcedColors?: boolean;
}

const READ = [
  'data-1', 'data-2', 'data-3', 'data-4', 'data-5', 'data-6', 'data-other',
  'data-seq-1', 'data-seq-2', 'data-seq-3', 'data-seq-4', 'data-seq-5', 'data-seq-6', 'data-seq-7',
  'data-div-neg-3', 'data-div-neg-2', 'data-div-neg-1', 'data-div-mid', 'data-div-pos-1', 'data-div-pos-2', 'data-div-pos-3',
  'surface-ground', 'surface-raised', 'surface-floating', 'ink', 'ink-muted', 'line', 'line-control',
  'elev-3', 'font-sans', 'dur-travel-3',
] as const;

const isElement = (s: ChartTokenSource): s is Element => typeof (s as Element).getAttribute === 'function';

/** The tokens a chart theme needs, read from an element's computed style (so its scheme and accent apply). */
export function readChartTokens(source: ChartTokenSource): ChartTokens {
  if (!isElement(source)) return { ...source };
  const cs = getComputedStyle(source);
  return Object.fromEntries(READ.map((name) => [name, cs.getPropertyValue('--' + name).trim()]));
}

function resolveOptions(source: ChartTokenSource, options: ChartThemeOptions) {
  let { reducedMotion, forcedColors } = options;
  if (isElement(source)) {
    const win = source.ownerDocument.defaultView;
    // AltitudeProvider folds its motion prop and the system setting into --alt-travel (0 is reduced).
    const travel = getComputedStyle(source).getPropertyValue('--alt-travel').trim();
    reducedMotion ??= travel ? travel === '0' : !!win?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    forcedColors ??= !!win?.matchMedia('(forced-colors: active)').matches;
  }
  return { reducedMotion: !!reducedMotion, forcedColors: !!forcedColors, patterns: !!options.patterns || !!forcedColors };
}

const ms = (v: string | undefined, fallback: number) => {
  const m = /^([\d.]+)(ms|s)$/.exec((v ?? '').trim());
  return m ? Math.round(parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1)) : fallback;
};

const categorical = (t: ChartTokens) => ['data-1', 'data-2', 'data-3', 'data-4', 'data-5', 'data-6', 'data-other'].map((n) => t[n]).filter(Boolean);

/** data-1 … data-6, then data-other: series colours in config order, for a library that takes a list. */
export function dataColors(source: ChartTokenSource): string[] {
  return categorical(readChartTokens(source));
}

/**
 * An ECharts theme: `echarts.init(el, echartsTheme(el))`, or `echarts.registerTheme('altitude', echartsTheme(el))`.
 * Series in data-1 … data-6 then data-other, text in ink, axes in line-control, split lines in line, the readout on
 * surface-floating at elev-3, aria on (import ECharts' AriaComponent), decals under forced colours or with `patterns`,
 * and dur-travel-3 animation on ease-glide's curve, zero under reduced motion.
 */
export function echartsTheme(source: ChartTokenSource, options: ChartThemeOptions = {}) {
  const t = readChartTokens(source);
  const o = resolveOptions(source, options);
  const duration = o.reducedMotion ? 0 : ms(t['dur-travel-3'], 220);
  const text = { color: t['ink-muted'], fontFamily: t['font-sans'] };
  const axis = {
    axisLine: { lineStyle: { color: t['line-control'] } },
    axisTick: { lineStyle: { color: t['line-control'] } },
    axisLabel: { color: t['ink-muted'] },
    splitLine: { lineStyle: { color: [t.line] } },
    splitArea: { show: false },
  };
  return {
    color: categorical(t),
    backgroundColor: 'transparent',
    textStyle: { color: t.ink, fontFamily: t['font-sans'] },
    title: { textStyle: { color: t.ink }, subtextStyle: { color: t['ink-muted'] } },
    legend: { textStyle: { color: t.ink }, inactiveColor: t['line-control'] },
    categoryAxis: axis, valueAxis: axis, logAxis: axis, timeAxis: axis,
    tooltip: {
      backgroundColor: t['surface-floating'], borderColor: t.line, borderWidth: 1,
      textStyle: { color: t.ink, fontFamily: t['font-sans'] },
      extraCssText: `box-shadow: ${t['elev-3']}; border-radius: 8px;`,
      axisPointer: { lineStyle: { color: t['ink-muted'], width: 1 }, crossStyle: { color: t['ink-muted'], width: 1 } },
    },
    // Magnitude reads the sequential ramp; set inRange to the diverging ramp for polarity.
    visualMap: { inRange: { color: ['data-seq-1', 'data-seq-2', 'data-seq-3', 'data-seq-4', 'data-seq-5', 'data-seq-6', 'data-seq-7'].map((n) => t[n]) }, textStyle: text },
    aria: { enabled: true, decal: { show: o.patterns } },
    animation: !o.reducedMotion,
    animationDuration: duration,
    animationDurationUpdate: duration,
    // ease-glide is cubic-bezier(0.65, 0, 0.35, 1): changed data glides at one level.
    animationEasing: 'cubicInOut', animationEasingUpdate: 'cubicInOut',
  };
}

/**
 * Chart.js defaults: `Chart.defaults.set(chartjsDefaults(el))`. Text in ink-muted, grid in line, axis borders in
 * line-control, the readout on surface-floating, dur-travel-3 animation (none under reduced motion). Chart.js has no
 * palette default: give each dataset a colour from `dataColors(el)`.
 */
export function chartjsDefaults(source: ChartTokenSource, options: ChartThemeOptions = {}) {
  const t = readChartTokens(source);
  const o = resolveOptions(source, options);
  return {
    color: t['ink-muted'],
    borderColor: t.line,
    backgroundColor: t['data-1'],
    font: { family: t['font-sans'] },
    animation: o.reducedMotion ? false as const : { duration: ms(t['dur-travel-3'], 220), easing: 'easeInOutCubic' as const },
    scale: { grid: { color: t.line }, border: { color: t['line-control'] }, ticks: { color: t['ink-muted'] } },
    plugins: {
      legend: { labels: { color: t.ink } },
      tooltip: {
        backgroundColor: t['surface-floating'], borderColor: t.line, borderWidth: 1,
        titleColor: t.ink, bodyColor: t.ink, footerColor: t['ink-muted'],
      },
    },
  };
}

/**
 * Re-reads a chart theme whenever the scheme around `ref` changes: an AltitudeProvider's `scheme`, `accent` or
 * `motion`, a `data-theme` on the page, or the reduced-motion and forced-colours settings. Null until mounted.
 *
 *   const ref = React.useRef<HTMLDivElement>(null);
 *   const theme = useChartTheme(echartsTheme, ref);
 *   React.useEffect(() => { if (!theme) return; const c = echarts.init(ref.current!, theme); …; return () => c.dispose(); }, [theme]);
 */
export function useChartTheme<T>(build: (source: Element, options?: ChartThemeOptions) => T, ref: React.RefObject<Element | null>, options?: ChartThemeOptions): T | null {
  const [theme, setTheme] = React.useState<T | null>(null);
  const latest = React.useRef(build);
  latest.current = build;
  const key = JSON.stringify(options ?? {});
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = '';
    const read = () => {
      const next = latest.current(el, options);
      const id = JSON.stringify(next);
      if (id !== last) { last = id; setTheme(next); }
    };
    read();
    const mo = new MutationObserver(read);
    // Every ancestor that can carry a scheme: the provider's root sets data-theme, its accent as inline style.
    for (let n: Element | null = el; n; n = n.parentElement) {
      mo.observe(n, { attributes: true, attributeFilter: ['data-theme', 'data-motion', 'data-contrast', 'style', 'class'] });
    }
    const win = el.ownerDocument.defaultView;
    const queries = win ? ['(prefers-reduced-motion: reduce)', '(forced-colors: active)', '(prefers-color-scheme: dark)'].map((q) => win.matchMedia(q)) : [];
    queries.forEach((q) => q.addEventListener('change', read));
    return () => { mo.disconnect(); queries.forEach((q) => q.removeEventListener('change', read)); };
  }, [ref, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return theme;
}
