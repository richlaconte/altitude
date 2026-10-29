import * as React from 'react';
import { contrast, cx, useControllable, useIsoLayoutEffect } from './core';
import { Badge, Button, Input } from './controls';
import { Popover } from './overlays';
import { useRoving } from './roving';

/* ───────────────────────── colour maths ───────────────────────── */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
/** "#0F8A6B" from "0f8a6b", "#0f8", … or null when it isn't a hex colour. */
const normal = (v: string) => { const m = HEX.exec(v.trim()); if (!m) return null; const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]; return '#' + h.toLowerCase(); };
const toHsv = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  const h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : d / max, v: max };
};
const fromHsv = ({ h, s, v }: { h: number; s: number; v: number }) => {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/* ───────────────────────── ColorSwatchPicker ───────────────────────── */

export interface ColorSwatch {
  value: string;
  /** Every swatch has a name: colour is never the only way to tell them apart. */
  name: string;
}
export interface ColorSwatchPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  swatches: ColorSwatch[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  'aria-label'?: string;
}
/**
 * Colours as choices: each swatch is a trench the colour pours into, and the chosen one carries the raised white mark,
 * which travels between swatches as RadioGroup's thumb does. A radio group: arrows move and choose.
 */
export function ColorSwatchPicker({ swatches, value, defaultValue = null, onValueChange, className, ...rest }: ColorSwatchPickerProps) {
  const [v, setV] = useControllable<string | null>(value, defaultValue, onValueChange as (v: string | null) => void);
  const chosen = v ? normal(v) : null;
  const roving = useRoving<HTMLDivElement>({
    onMove: (el) => { const c = el.dataset.value; if (c) setV(c); },
    initial: (box) => box.querySelector<HTMLElement>('[aria-checked="true"]'),
  });
  const [mark, setMark] = React.useState({ x: 0, y: 0, on: false, ready: false });
  useIsoLayoutEffect(() => {
    const el = roving.ref.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    setMark((m) => (el ? { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2, on: true, ready: m.on || m.ready } : { ...m, on: false }));
  }, [chosen, swatches.length]);
  return (
    <div {...roving} role="radiogroup" className={cx('alt-swatches', className)} {...rest}>
      {swatches.map((s) => {
        const c = normal(s.value) ?? s.value, on = c === chosen;
        return <button key={c} type="button" role="radio" aria-checked={on} aria-label={s.name} title={s.name} data-value={c} data-roving-item=""
          className="alt-swatch" style={{ ['--swatch' as any]: c }} onClick={() => setV(c)}><span className="alt-swatch-fill" /></button>;
      })}
      <span className="alt-swatch-mark" aria-hidden="true" data-ready={mark.ready ? '' : undefined}
        style={{ transform: `translate(${mark.x}px, ${mark.y}px)`, opacity: mark.on ? 1 : 0 }} />
    </div>
  );
}

/* ───────────────────────── ColorPicker ───────────────────────── */

/** The 2D area (saturation across, brightness up) and the hue strip: wells, with raised handles. */
function CustomColor({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [hsv, setHsv] = React.useState(() => toHsv(value));
  React.useEffect(() => { if (fromHsv(hsv) !== value) setHsv(toHsv(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (next: typeof hsv) => { setHsv(next); onChange(fromHsv(next)); };
  const drag = (el: HTMLElement, e: React.PointerEvent, at: (x: number, y: number) => void) => {
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent | React.PointerEvent) => { const r = el.getBoundingClientRect(); at(clamp01((ev.clientX - r.left) / r.width), clamp01((ev.clientY - r.top) / r.height)); };
    move(e);
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  };
  const pct = (x: number) => Math.round(x * 100);
  return (
    <div className="alt-color-custom">
      <div className="alt-color-area" role="slider" tabIndex={0} aria-label="Saturation and brightness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct(hsv.s)}
        aria-valuetext={`Saturation ${pct(hsv.s)}%, brightness ${pct(hsv.v)}%`} style={{ ['--hue' as any]: hsv.h }}
        onPointerDown={(e) => drag(e.currentTarget, e, (x, y) => set({ ...hsv, s: x, v: 1 - y }))}
        onKeyDown={(e) => {
          const k = e.shiftKey ? 0.1 : 0.01;
          const d = { ArrowRight: [k, 0], ArrowLeft: [-k, 0], ArrowUp: [0, k], ArrowDown: [0, -k] }[e.key];
          if (d) { e.preventDefault(); set({ ...hsv, s: clamp01(hsv.s + d[0]), v: clamp01(hsv.v + d[1]) }); }
        }}>
        <span className="alt-color-handle" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: fromHsv(hsv) }} />
      </div>
      <div className="alt-color-hue" role="slider" tabIndex={0} aria-label="Hue" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsv.h)} aria-valuetext={`Hue ${Math.round(hsv.h)}°`}
        onPointerDown={(e) => drag(e.currentTarget, e, (x) => set({ ...hsv, h: x * 360 }))}
        onKeyDown={(e) => {
          const k = e.shiftKey ? 10 : 1;
          const d = { ArrowRight: k, ArrowUp: k, ArrowLeft: -k, ArrowDown: -k, Home: -360, End: 360 }[e.key];
          if (d !== undefined) { e.preventDefault(); set({ ...hsv, h: Math.min(360, Math.max(0, hsv.h + d)) }); }
        }}>
        <span className="alt-color-handle" style={{ left: `${hsv.h / 3.6}%`, top: '50%', background: fromHsv({ h: hsv.h, s: 1, v: 1 }) }} />
      </div>
    </div>
  );
}

export interface ColorPickerProps {
  /** What the colour is for ("Brand colour"). It names the swatches. */
  label: string;
  value?: string;
  defaultValue?: string;
  /** Called with a lower-case "#rrggbb". */
  onValueChange?: (value: string) => void;
  swatches?: ColorSwatch[];
  /** A hex field and a full picker (area and hue) for any colour. Default false. */
  allowCustom?: boolean;
  /** Says in words whether white text and dark text on the colour reach 4.5:1. Default false. */
  checkContrast?: boolean;
  className?: string;
}
/**
 * A brand or label colour: swatches as choices (trenches the colour pours into, one travelling mark), and, if allowed,
 * a hex field that fills when it holds a whole colour and a full picker in a Popover. A contrast check says in words
 * whether text on the colour passes, because the accent carries text.
 */
export function ColorPicker({ label, value, defaultValue = '#0f8a6b', onValueChange, swatches = [], allowCustom = false, checkContrast = false, className }: ColorPickerProps) {
  const [v, setV] = useControllable(value, defaultValue, onValueChange);
  const hex = normal(v) ?? '#000000';
  const [text, setText] = React.useState(hex.slice(1));
  React.useEffect(() => { setText(hex.slice(1)); }, [hex]);
  // The hex field fills only once it holds a whole colour; a partial one is still an opening.
  const partial = !/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text);
  const id = React.useId();
  const named = swatches.find((s) => normal(s.value) === hex)?.name;
  // Some text nearly always reaches 4.5:1 on a colour, so a single verdict says little; each text colour gets its own.
  const ratio = (r: number) => `${Math.floor(r * 10) / 10}:1`;
  const checks = ([['White', '#ffffff'], ['Dark', '#000000']] as const).map(([who, ink]) => ({ who, r: contrast(hex, ink) }));
  return (
    <div className={cx('alt-color', className)} role="group" aria-labelledby={`${id}-l`}>
      <span id={`${id}-l`} className="alt-field-label">{label}</span>
      {swatches.length > 0 && <ColorSwatchPicker swatches={swatches} value={hex} onValueChange={setV} aria-labelledby={`${id}-l`} />}
      {allowCustom && (
        <div className="alt-color-row">
          <Input aria-label={`${label}, hex`} leading={<span className="alt-color-chip" style={{ background: hex }} />} value={text} spellCheck={false}
            maxLength={7} className={cx('alt-color-hex', partial && 'alt-color-partial')} onChange={(e) => { const t = e.target.value.replace(/^#/, ''); setText(t); const n = normal(t); if (n && t.length === 6) setV(n); }}
            onBlur={() => { const n = normal(text); if (n) setV(n); else setText(hex.slice(1)); }} />
          <Popover aria-label={`Choose any ${label.toLowerCase()}`} trigger={<Button variant="secondary">Custom…</Button>}>
            <CustomColor value={hex} onChange={setV} />
          </Popover>
        </div>
      )}
      <span className="alt-sr" aria-live="polite">{named ? `${named}, ${hex}` : hex}</span>
      {checkContrast && (
        <div className="alt-color-checks">
          {checks.map(({ who, r }) => <Badge key={who} tone={r >= 4.5 ? 'positive' : 'critical'}>{who} text {r >= 4.5 ? 'passes' : 'fails'}: {ratio(r)}</Badge>)}
        </div>
      )}
    </div>
  );
}
