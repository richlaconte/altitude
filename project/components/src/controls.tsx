import * as React from 'react';
import { cx, DepthProps, Icons, inert, riseDelay, Spinner, useApproach, useControllable, useDepth, useIsoLayoutEffect, useKeyFocus } from './core';

/* ───────────────────────── Button ───────────────────────── */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Icon-only: a square button. Give it an aria-label. */
  square?: boolean;
  loading?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', square, loading, leading, trailing, className, children, disabled, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={cx('alt-btn', className)} data-variant={variant} data-size={size}
      data-square={square ? '' : undefined} data-loading={loading ? '' : undefined}
      aria-busy={loading || undefined} disabled={disabled} {...rest}
      onClick={loading ? (e) => e.preventDefault() : rest.onClick}>
      <span className="alt-btn-label">{leading}{children}{trailing}</span>
      {loading && <span className="alt-btn-spinner"><Spinner size={size === 'sm' ? 14 : 16} /></span>}
    </button>
  );
});

/* ───────────────────────── Card ───────────────────────── */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, DepthProps {
  /** Lifts on hover and presses on click. Only set it when the whole card does something. */
  interactive?: boolean;
}
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive, className, onKeyDown, settle, status, heldBy, relevance, style, ...rest }, ref) {
  const actionable = interactive && !!rest.onClick;
  const { style: depthStyle, ...depth } = useDepth({ settle, status, heldBy, relevance });
  return <div ref={ref} className={cx('alt-card', interactive && 'alt-lift', className)}
    role={actionable ? 'button' : undefined} tabIndex={actionable ? 0 : undefined}
    onKeyDown={actionable ? (e) => { onKeyDown?.(e); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } } : onKeyDown}
    {...depth} style={{ ...depthStyle, ...style }} {...rest} />;
});
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cx('alt-card-header', className)} {...p} />;
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className={cx('alt-card-title', className)} {...p} />;
export const CardDescription = ({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => <p className={cx('alt-card-desc', className)} {...p} />;
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cx('alt-card-content', className)} {...p} />;
export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cx('alt-card-footer', className)} {...p} />;

/* ───────────────────────── Input / Textarea / Field ───────────────────────── */

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  invalid?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  size?: 'sm' | 'md';
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leading, trailing, size = 'md', className, disabled, placeholder, ...rest }, ref) {
  useApproach();
  useKeyFocus();
  return (
    <div className={cx('alt-input', className)} data-size={size} data-approach="56" data-invalid={invalid ? '' : undefined} data-disabled={disabled ? '' : undefined}>
      {leading && <span className="alt-input-adorn">{leading}</span>}
      {/* A placeholder (even a blank one) lets the well know whether it's empty or filled, without JavaScript. */}
      <input ref={ref} disabled={disabled} aria-invalid={invalid || undefined} placeholder={placeholder ?? ' '} {...rest} />
      {trailing && <span className="alt-input-adorn">{trailing}</span>}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** With maxLength, the well fills from the bottom as the text approaches the limit, and shows a count. Default true. */
  showFill?: boolean;
}
/** A deep well. With a maxLength it shows how full it is: a fill line rises from the floor as you type. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, disabled, placeholder, maxLength, showFill = true, onChange, value, defaultValue, ...rest }, ref) {
  const [len, setLen] = React.useState(() => String(value ?? defaultValue ?? '').length);
  React.useEffect(() => { if (value !== undefined) setLen(String(value).length); }, [value]);
  const gauge = showFill && maxLength ? Math.min(1, len / maxLength) : null;
  const level = gauge === null ? undefined : len >= maxLength! ? 'full' : gauge >= 0.9 ? 'near' : 'ok';
  useApproach();
  useKeyFocus();
  return (
    <div className={cx('alt-input', className)} data-multiline="" data-approach="56" data-invalid={invalid ? '' : undefined} data-disabled={disabled ? '' : undefined}
      data-fill={level} style={gauge !== null ? ({ ['--alt-fill' as any]: gauge } as React.CSSProperties) : undefined}>
      {gauge !== null && <span className="alt-input-gauge" aria-hidden="true" />}
      <textarea ref={ref} disabled={disabled} aria-invalid={invalid || undefined} placeholder={placeholder ?? ' '} maxLength={maxLength}
        value={value} defaultValue={defaultValue} {...rest} onChange={(e) => { setLen(e.target.value.length); onChange?.(e); }} />
      {gauge !== null && <span className="alt-input-count" aria-live="polite">{len} / {maxLength}</span>}
    </div>
  );
});

export interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** When set, the control turns invalid and the message emerges beneath it. */
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactElement<any>;
}
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = React.useId();
  const controlId = children.props.id || id + '-control';
  const describedBy = [hint && id + '-hint', error && id + '-error'].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('alt-field', className)}>
      <label className="alt-field-label" htmlFor={controlId}>{label}{required && <span className="alt-field-req" aria-hidden="true"> *</span>}</label>
      {React.cloneElement(children, { id: controlId, 'aria-describedby': describedBy, invalid: !!error || children.props.invalid, required })}
      {hint && !error && <p className="alt-field-hint" id={id + '-hint'}>{hint}</p>}
      {error && <p className="alt-field-error" id={id + '-error'} role="alert"><Icons.AlertCircle size={14} />{error}</p>}
    </div>
  );
}

/* ───────────────────────── Checkbox ───────────────────────── */

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}
/** Built like the Switch and RadioGroup: an empty trench when off; checking pours the accent in and sets a raised white check on it. */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, indeterminate, onCheckedChange, onChange, className, disabled, ...rest }, ref) {
  const inner = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => inner.current as HTMLInputElement);
  React.useEffect(() => { if (inner.current) inner.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label className={cx('alt-check', className)} data-disabled={disabled ? '' : undefined}>
      <input ref={inner} type="checkbox" disabled={disabled} {...rest}
        onChange={(e) => { onChange?.(e); onCheckedChange?.(e.target.checked); }} />
      <span className="alt-check-track" aria-hidden="true">
        <span className="alt-check-fill" />
        <svg className="alt-check-mark" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path className="alt-check-tick" d="M3.5 8.5l3 3 6-6.5" pathLength={16} />
          <path className="alt-check-dash" d="M4 8h8" pathLength={16} />
        </svg>
      </span>
      {(label || description) && (
        <span className="alt-check-text">
          {label && <span className="alt-check-label">{label}</span>}
          {description && <span className="alt-check-desc">{description}</span>}
        </span>
      )}
    </label>
  );
});

/* ───────────────────────── RadioGroup ───────────────────────── */

type RadioCtxT = { name: string; value: string; set: (v: string) => void; disabled?: boolean; register: (v: string, el: HTMLElement | null) => void };
const RadioCtx = React.createContext<RadioCtxT | null>(null);
export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value?: string; defaultValue?: string; onValueChange?: (v: string) => void; name?: string; disabled?: boolean;
  orientation?: 'vertical' | 'horizontal';
}
/** A switch with several positions: one raised thumb slides to the chosen option and the accent pours in behind it. */
export function RadioGroup({ value, defaultValue = '', onValueChange, name, disabled, orientation = 'vertical', className, children, ...rest }: RadioGroupProps) {
  const auto = React.useId();
  const [v, set] = useControllable(value, defaultValue, onValueChange);
  const root = React.useRef<HTMLDivElement>(null);
  const slots = React.useRef(new Map<string, HTMLElement>());
  const [bead, setBead] = React.useState<{ x: number; y: number; ready: boolean } | null>(null);
  const register = React.useCallback((val: string, el: HTMLElement | null) => { if (el) slots.current.set(val, el); else slots.current.delete(val); }, []);
  const measure = React.useCallback(() => {
    const el = slots.current.get(v), r = root.current;
    if (!el || !r) { setBead(null); return; }
    const a = el.getBoundingClientRect(), b = r.getBoundingClientRect();
    const x = a.left - b.left + a.width / 2, y = a.top - b.top + a.height / 2;
    setBead((p) => (p && p.x === x && p.y === y ? p : { x, y, ready: !!p }));
  }, [v]);
  useIsoLayoutEffect(() => { measure(); }, [measure]);
  React.useEffect(() => {
    const ro = new ResizeObserver(() => measure());
    if (root.current) ro.observe(root.current);
    document.fonts?.ready.then(() => measure());
    return () => ro.disconnect();
  }, [measure]);
  return (
    <RadioCtx.Provider value={{ name: name || auto, value: v, set, disabled, register }}>
      <div ref={root} role="radiogroup" className={cx('alt-radio-group', className)} data-orientation={orientation} data-disabled={disabled ? '' : undefined} {...rest}>
        {children}
        {bead && (
          <span className="alt-radio-thumb" aria-hidden="true" data-ready={bead.ready ? '' : undefined}
            style={{ transform: `translate(${bead.x}px, ${bead.y}px)` }} />
        )}
      </div>
    </RadioCtx.Provider>
  );
}
export interface RadioProps { value: string; label?: React.ReactNode; description?: React.ReactNode; disabled?: boolean; className?: string }
export function Radio({ value, label, description, disabled, className }: RadioProps) {
  const g = React.useContext(RadioCtx);
  const off = disabled || g?.disabled;
  return (
    <label className={cx('alt-check alt-radio', className)} data-disabled={off ? '' : undefined}>
      <input type="radio" name={g?.name} value={value} disabled={off} checked={g ? g.value === value : undefined}
        onChange={() => g?.set(value)} />
      <span className="alt-check-track" data-round="" aria-hidden="true" ref={(el) => g?.register(value, el)}><span className="alt-check-fill" /></span>
      {(label || description) && (
        <span className="alt-check-text">
          {label && <span className="alt-check-label">{label}</span>}
          {description && <span className="alt-check-desc">{description}</span>}
        </span>
      )}
    </label>
  );
}

/* ───────────────────────── Switch ───────────────────────── */

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (v: boolean) => void; label?: React.ReactNode;
}
export function Switch({ checked, defaultChecked = false, onCheckedChange, label, className, disabled, ...rest }: SwitchProps) {
  const [on, set] = useControllable(checked, defaultChecked, onCheckedChange);
  const control = (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} className={cx('alt-switch', !label && className)}
      {...rest} onClick={(e) => { rest.onClick?.(e); set(!on); }}>
      <span className="alt-switch-fill" />
      <span className="alt-switch-thumb" />
    </button>
  );
  if (!label) return control;
  return <label className={cx('alt-switch-row', className)} data-disabled={disabled ? '' : undefined}>{control}<span>{label}</span></label>;
}

/* ───────────────────────── Tabs ───────────────────────── */

type TabsCtxT = { value: string; set: (v: string) => void; id: string; variant: 'folder' | 'segmented'; register: (v: string, el: HTMLButtonElement | null) => void; nodes: React.MutableRefObject<Map<string, HTMLButtonElement>> };
const TabsCtx = React.createContext<TabsCtxT | null>(null);
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  value?: string; defaultValue?: string; onValueChange?: (v: string) => void;
  /**
   * folder (default): each tab is the top edge of its own sheet; the chosen tab and its panel are one raised piece.
   * Put TabsContent directly after TabsList. segmented: the options sit in a well and a raised pill glides between them.
   */
  variant?: 'folder' | 'segmented';
}
export function Tabs({ value, defaultValue = '', onValueChange, variant = 'folder', className, children, ...rest }: TabsProps) {
  const [v, set] = useControllable(value, defaultValue, onValueChange);
  const id = React.useId();
  const nodes = React.useRef(new Map<string, HTMLButtonElement>());
  const register = React.useCallback((val: string, el: HTMLButtonElement | null) => { if (el) nodes.current.set(val, el); else nodes.current.delete(val); }, []);
  return <TabsCtx.Provider value={{ value: v, set, id, variant, register, nodes }}><div className={cx('alt-tabs', className)} data-variant={variant} {...rest}>{children}</div></TabsCtx.Provider>;
}
export function TabsList({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  const t = React.useContext(TabsCtx)!;
  const listRef = React.useRef<HTMLDivElement>(null);
  const pill = t.variant === 'segmented';
  const [ind, setInd] = React.useState<{ x: number; w: number; ready: boolean }>({ x: 0, w: 0, ready: false });
  const measure = React.useCallback(() => {
    if (!pill) return;
    const el = t.nodes.current.get(t.value);
    if (!el) return;
    setInd((p) => ({ x: el.offsetLeft, w: el.offsetWidth, ready: p.w > 0 || p.ready }));
  }, [t.value, t.nodes, pill]);
  useIsoLayoutEffect(() => { measure(); }, [measure]);
  React.useEffect(() => {
    if (!pill) return;
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure, pill]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys = [...t.nodes.current.keys()];
    const i = keys.indexOf(t.value);
    const next = e.key === 'ArrowRight' ? keys[(i + 1) % keys.length] : e.key === 'ArrowLeft' ? keys[(i - 1 + keys.length) % keys.length]
      : e.key === 'Home' ? keys[0] : e.key === 'End' ? keys[keys.length - 1] : null;
    if (next) { e.preventDefault(); t.set(next); t.nodes.current.get(next)?.focus(); }
  };
  return (
    <div ref={listRef} role="tablist" className={cx('alt-tabs-list', className)} onKeyDown={onKeyDown} {...rest}>
      {pill && <span className="alt-tabs-indicator" aria-hidden="true" data-ready={ind.ready ? '' : undefined}
        style={{ transform: `translateX(${ind.x}px)`, width: ind.w, opacity: ind.w ? 1 : 0 }} />}
      {children}
    </div>
  );
}
export function TabsTrigger({ value, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const t = React.useContext(TabsCtx)!;
  const on = t.value === value;
  return (
    <button ref={(el) => t.register(value, el)} type="button" role="tab" id={`${t.id}-t-${value}`} aria-controls={`${t.id}-p-${value}`}
      aria-selected={on} tabIndex={on ? 0 : -1} className={cx('alt-tabs-trigger', className)} onClick={() => t.set(value)} {...rest}>{children}</button>
  );
}
export function TabsContent({ value, className, ...rest }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const t = React.useContext(TabsCtx)!;
  if (t.value !== value) return null;
  return <div role="tabpanel" id={`${t.id}-p-${value}`} aria-labelledby={`${t.id}-t-${value}`} tabIndex={0} className={cx('alt-tabs-content', className)} {...rest} />;
}

/* ───────────────────────── Slider ───────────────────────── */

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value?: number; defaultValue?: number; onValueChange?: (v: number) => void;
  min?: number; max?: number; step?: number; disabled?: boolean;
  /** Format the value shown in the bubble that floats above the thumb while dragging. */
  format?: (v: number) => React.ReactNode;
  'aria-label'?: string;
}
export function Slider({ value, defaultValue = 50, onValueChange, min = 0, max = 100, step = 1, disabled, format = (v) => v, className, ...rest }: SliderProps) {
  const [v, set] = useControllable(value, defaultValue, onValueChange);
  const [drag, setDrag] = React.useState(false);
  const track = React.useRef<HTMLDivElement>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round((n - min) / step) * step + min));
  const fromX = (x: number) => { const r = track.current!.getBoundingClientRect(); return clamp(min + ((x - r.left) / r.width) * (max - min)); };
  const pct = ((v - min) / (max - min)) * 100;
  return (
    <div className={cx('alt-slider', className)} data-dragging={drag ? '' : undefined} data-disabled={disabled ? '' : undefined}
      onPointerDown={(e) => { if (disabled) return; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDrag(true); set(fromX(e.clientX)); (e.currentTarget.querySelector('.alt-slider-thumb') as HTMLElement)?.focus(); }}
      onPointerMove={(e) => { if (drag) set(fromX(e.clientX)); }}
      onPointerUp={() => setDrag(false)} onPointerCancel={() => setDrag(false)} {...rest}>
      <div className="alt-slider-track" ref={track}>
        <div className="alt-slider-fill" style={{ width: pct + '%' }} />
      </div>
      <div className="alt-slider-thumb" role="slider" tabIndex={disabled ? -1 : 0} aria-valuemin={min} aria-valuemax={max} aria-valuenow={v}
        aria-label={rest['aria-label']} aria-disabled={disabled || undefined} style={{ left: pct + '%' }}
        onKeyDown={(e) => {
          const big = (max - min) / 10;
          const map: Record<string, number> = { ArrowRight: v + step, ArrowUp: v + step, ArrowLeft: v - step, ArrowDown: v - step, PageUp: v + big, PageDown: v - big, Home: min, End: max };
          if (e.key in map) { e.preventDefault(); set(clamp(map[e.key])); }
        }}>
        <span className="alt-slider-bubble" aria-hidden="true">{format(v)}</span>
      </div>
    </div>
  );
}

/* ───────────────────────── Progress ───────────────────────── */

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> { value?: number | null; max?: number; 'aria-label'?: string }
export function Progress({ value = null, max = 100, className, ...rest }: ProgressProps) {
  const ind = value === null || value === undefined;
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={ind ? undefined : value}
      className={cx('alt-progress', className)} data-indeterminate={ind ? '' : undefined} {...rest}>
      <div className="alt-progress-fill" style={ind ? undefined : { width: `${Math.max(0, Math.min(100, (value! / max) * 100))}%` }} />
    </div>
  );
}

/* ───────────────────────── Badge ───────────────────────── */

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent' | 'positive' | 'caution' | 'critical';
  /**
   * plate (default): an indicator plate set flush into the page. tinted: the plate takes its tone's colour.
   * outline: a hairline only. count: a number that wants attention; it floats above the page and pops when it changes.
   * ('soft' is the old name for tinted.)
   */
  variant?: 'plate' | 'tinted' | 'outline' | 'count' | 'soft';
  /** The indicator lamp. On by default for positive, caution and critical; true on a neutral badge shows an unlit lamp. 'pulse' breathes, for something in progress. */
  lamp?: boolean | 'pulse';
  /** @deprecated Use `lamp`. */
  dot?: boolean;
}
/** A label stamped into the record. Status carries a lamp that relights when it changes; a changed label is re-stamped. */
export function Badge({ tone = 'neutral', variant = 'plate', lamp, dot, className, children, ...rest }: BadgeProps) {
  const v = variant === 'soft' ? 'tinted' : variant;
  const showLamp = v !== 'count' && !!(lamp ?? (dot || tone === 'positive' || tone === 'caution' || tone === 'critical'));
  const label = typeof children === 'string' || typeof children === 'number' ? String(children) : undefined;
  const [stamp, setStamp] = React.useState<'a' | 'b' | undefined>(undefined);
  const [lit, setLit] = React.useState(0);
  const prev = React.useRef({ tone, label });
  React.useEffect(() => {
    const p = prev.current;
    if (p.label !== label) setStamp((x) => (x === 'a' ? 'b' : 'a'));
    if (p.tone !== tone) setLit((n) => n + 1);
    prev.current = { tone, label };
  }, [tone, label]);
  return (
    <span className={cx('alt-badge', className)} data-tone={tone} data-variant={v} data-stamp={stamp} {...rest}>
      {showLamp && <span key={lit} className="alt-badge-lamp" aria-hidden="true" data-lit={lit ? '' : undefined} data-pulse={lamp === 'pulse' ? '' : undefined} />}
      {children}
    </span>
  );
}

/* ───────────────────────── Avatar ───────────────────────── */

const TINTS = ['accent', 'positive', 'caution', 'critical'];
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  src?: string;
  size?: number;
  /** Presence as height: active people hover above the page (their shadow drops away), idle ones rest on it, offline ones lie flat and grey. */
  status?: 'active' | 'idle' | 'offline';
  /** Speaking, typing or presenting right now: the avatar drifts gently. */
  live?: boolean;
  /** Ties the person to their presence colour, the same ring they wear on anything they're holding. */
  presence?: 1 | 2 | 3;
  /** The status lamp (green active, amber idle). Default: shown when there is a status and the avatar is 24px or larger. Never shown inside AvatarGroup. */
  lamp?: boolean;
}
/** A disc above its own shadow. The gap between them is how high the person is: how present they are right now. */
export function Avatar({ name, src, size = 36, status, live, presence, lamp, className, style, onClick, ...rest }: AvatarProps) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  const tint = TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
  const label = [name, status, live && 'live'].filter(Boolean).join(', ');
  const showLamp = (lamp ?? size >= 24) && (status === 'active' || status === 'idle');
  return (
    <span className={cx('alt-avatar', className)} data-tint={tint} data-status={status} data-live={live ? '' : undefined}
      data-presence={presence ? String(presence) : undefined} data-interactive={onClick ? '' : undefined}
      role={onClick ? 'button' : 'img'} tabIndex={onClick ? 0 : undefined} aria-label={label} title={label} onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } } : undefined}
      style={{ ['--size' as any]: size + 'px', ...style }} {...rest}>
      <span className="alt-avatar-shadow" aria-hidden="true" />
      <span className="alt-avatar-face">{src ? <img src={src} alt="" /> : initials}</span>
      {showLamp && <span className="alt-avatar-lamp" aria-hidden="true" />}
    </span>
  );
}
export function AvatarGroup({ className, children, max, style, ...rest }: React.HTMLAttributes<HTMLDivElement> & { max?: number }) {
  const all = React.Children.toArray(children);
  const shown = max ? all.slice(0, max) : all;
  const extra = all.length - shown.length;
  const size = (shown[0] as any)?.props?.size || 36;
  return (
    <div className={cx('alt-avatar-group', className)} style={{ ['--size' as any]: size + 'px', ...style }} {...rest}>
      {shown}
      {extra > 0 && (
        <span className="alt-avatar" data-tint="more" role="img" aria-label={`${extra} more`} style={{ ['--size' as any]: size + 'px' }}>
          <span className="alt-avatar-shadow" aria-hidden="true" />
          <span className="alt-avatar-face">+{extra}</span>
        </span>
      )}
    </div>
  );
}

/* ───────────────────────── Skeleton ───────────────────────── */

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When it turns true, the children rise out of the imprint into place. */
  loaded?: boolean;
  shape?: 'block' | 'text' | 'circle';
  /** For shape="text": how many lines to imprint. */
  lines?: number;
  width?: number | string; height?: number | string; radius?: string;
}
const LINE_WIDTHS = ['100%', '94%', '82%', '97%', '64%'];
/** An imprint of the content to come, pressed into the page; when the content arrives it rises out of its imprint. */
export function Skeleton({ loaded, shape = 'block', lines = 3, width, height, radius, className, style, children, ...rest }: SkeletonProps) {
  const [reveal, setReveal] = React.useState<number | null>(null);
  const was = React.useRef(loaded);
  React.useEffect(() => { if (loaded && !was.current) setReveal(riseDelay()); if (!loaded) setReveal(null); was.current = loaded; }, [loaded]);
  if (loaded) {
    return (
      <div className={cx('alt-reveal', className)} data-reveal={reveal !== null ? '' : undefined}
        style={{ ...(reveal ? { ['--alt-rise-delay' as any]: reveal + 'ms' } : null), ...style }} {...rest}>
        <div className="alt-reveal-inner">{children}</div>
      </div>
    );
  }
  if (shape === 'text') {
    return (
      <div className={cx('alt-skeleton-lines', className)} aria-hidden="true" style={{ width, ...style }} {...rest}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="alt-skeleton" data-shape="text" style={{ width: i === lines - 1 && lines > 1 ? '60%' : LINE_WIDTHS[i % LINE_WIDTHS.length], height: height ?? 12, ['--i' as any]: i }} />
        ))}
      </div>
    );
  }
  const d = shape === 'circle' ? (width ?? height ?? 40) : undefined;
  return <div className={cx('alt-skeleton', className)} data-shape={shape} aria-hidden="true"
    style={{ width: d ?? width, height: d ?? height ?? 14, borderRadius: radius, ...style }} {...rest} />;
}

/* ───────────────────────── Alert ───────────────────────── */

const toneIcon = { neutral: Icons.Info, accent: Icons.Info, positive: Icons.CircleCheck, caution: Icons.AlertTriangle, critical: Icons.AlertCircle };
export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>, Pick<DepthProps, 'settle'> {
  tone?: 'neutral' | 'accent' | 'positive' | 'caution' | 'critical';
  /** flat (default): a sheet laid on the page, it informs. raised: a card above the page, it asks you to act. */
  variant?: 'flat' | 'raised';
  title?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode;
  /** Shows a dismiss button; the sheet lifts off the page and the gap closes, then this is called. */
  onDismiss?: () => void;
}
/** Status as a sheet laid on the page: it rests on the ground (you can see its edge and its contact shadow) and never floats. When it asks the person to act it becomes a raised card. */
export function Alert({ tone = 'neutral', variant = 'flat', title, action, icon, onDismiss, settle, className, style, children, ...rest }: AlertProps) {
  const I = toneIcon[tone];
  const [closing, setClosing] = React.useState(false);
  const { style: depthStyle, ...depth } = useDepth({ settle });
  const dismiss = () => { setClosing(true); window.setTimeout(() => onDismiss?.(), 400); };
  return (
    <div role={tone === 'critical' ? 'alert' : 'status'} className={cx('alt-alert', className)} data-tone={tone} data-variant={variant}
      data-closing={closing ? '' : undefined} {...depth} style={{ ...depthStyle, ...style }} {...rest}>
      <div className="alt-alert-inner">
        <span className="alt-alert-icon" aria-hidden="true">{icon ?? <I size={18} />}</span>
        <div className="alt-alert-body">
          {title && <p className="alt-alert-title">{title}</p>}
          {children && <div className="alt-alert-text">{children}</div>}
        </div>
        {action && <div className="alt-alert-action">{action}</div>}
        {onDismiss && <button type="button" className="alt-alert-close" aria-label="Dismiss" onClick={dismiss}><Icons.X size={14} /></button>}
      </div>
    </div>
  );
}

export interface AlertStackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alert elements, most important first. Give each a key. */
  children: React.ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Label for the count while stacked. Default "+N more". */
  moreLabel?: (hidden: number) => React.ReactNode;
  /** Label for collapsing. Default "Show less". */
  lessLabel?: React.ReactNode;
}
/**
 * Several alerts as a stack of sheets: the first lies on top and the others peek out beneath it, each tinted by its
 * own tone, with a count. Opening the stack fans them out; dismissing the top one lifts it off and the next comes up.
 */
export function AlertStack({ children, expanded, defaultExpanded = false, onExpandedChange, moreLabel = (n) => `+${n} more`, lessLabel = 'Show less', className, ...rest }: AlertStackProps) {
  const list = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<AlertProps>[];
  const [open, setOpen] = useControllable(expanded, defaultExpanded, onExpandedChange);
  const topKey = list[0]?.key;
  const prevTop = React.useRef(topKey);
  const [risen, setRisen] = React.useState(0);
  React.useEffect(() => { if (prevTop.current !== topKey) { prevTop.current = topKey; if (topKey != null) setRisen((r) => r + 1); } }, [topKey]);
  const hidden = list.length - 1;
  const all = open || hidden < 1;
  return (
    <div className={cx('alt-alert-stack', className)} data-expanded={all ? '' : undefined} data-sheets={all ? undefined : Math.min(hidden, 2)} {...rest}>
      {all ? list.map((el, i) => <div key={el.key} className="alt-alert-stack-item" style={{ ['--i' as any]: i }}>{el}</div>) : (
        <>
          {list.slice(1, 3).map((el, i) => <span key={el.key} className="alt-alert-sheet" aria-hidden="true" data-tone={el.props.tone ?? 'neutral'} style={{ ['--i' as any]: i + 1 }} />)}
          <div key={String(topKey) + risen} className="alt-alert-stack-top" data-risen={risen ? '' : undefined}>{list[0]}</div>
        </>
      )}
      {hidden > 0 && <button type="button" className="alt-alert-more" aria-expanded={all} onClick={() => setOpen(!open)}>{all ? lessLabel : moreLabel(hidden)}</button>}
    </div>
  );
}

/* ───────────────────────── Accordion ───────────────────────── */

export interface AccordionItem { value: string; title: React.ReactNode; content: React.ReactNode }
export interface AccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  items: AccordionItem[];
  type?: 'single' | 'multiple';
  defaultValue?: string[];
}
export function Accordion({ items, type = 'single', defaultValue = [], className, ...rest }: AccordionProps) {
  const [open, setOpen] = React.useState<string[]>(defaultValue);
  const id = React.useId();
  const toggle = (v: string) => setOpen((o) => o.includes(v) ? o.filter((x) => x !== v) : type === 'single' ? [v] : [...o, v]);
  return (
    <div className={cx('alt-acc', className)} {...rest}>
      {items.map((it) => {
        const on = open.includes(it.value);
        return (
          <div key={it.value} className="alt-acc-item" data-state={on ? 'open' : 'closed'}>
            <h3 className="alt-acc-heading">
              <button type="button" className="alt-acc-trigger" aria-expanded={on} aria-controls={`${id}-${it.value}`} onClick={() => toggle(it.value)}>
                <span>{it.title}</span><Icons.ChevronDown className="alt-acc-chevron" size={18} />
              </button>
            </h3>
            <div className="alt-acc-panel" id={`${id}-${it.value}`} role="region" {...(on ? {} : inert)}>
              <div><div className="alt-acc-content">{it.content}</div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── HoldButton ───────────────────────── */

export interface HoldButtonProps extends Omit<ButtonProps, 'loading'> {
  /** Called once the button has been held for `duration`. */
  onConfirm: () => void;
  /** Milliseconds. Default 1000 (dur-hold). */
  duration?: number;
  holdingLabel?: React.ReactNode;
  doneLabel?: React.ReactNode;
  /**
   * By default a completed hold is final: the button settles flat, shows doneLabel and can't be pressed again.
   * Set true for actions that can be repeated; the button re-arms after a moment.
   */
  repeatable?: boolean;
}
/** Commitment as depth: holding pushes the button down through the ground into a trench. Let go early and it springs back. */
export function HoldButton({ onConfirm, duration = 1000, variant = 'danger', holdingLabel, doneLabel, repeatable = false, className, children, style, disabled, onClick, ...rest }: HoldButtonProps) {
  const [state, setState] = React.useState<'idle' | 'holding' | 'done'>('idle');
  const timer = React.useRef<number | undefined>(undefined);
  const done = state === 'done';
  const start = () => {
    if (disabled || state !== 'idle') return;
    setState('holding');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setState('done');
      onConfirm();
      if (repeatable) timer.current = window.setTimeout(() => setState('idle'), 1800);
    }, duration);
  };
  const cancel = () => { if (state !== 'holding') return; window.clearTimeout(timer.current); setState('idle'); };
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const label = done ? doneLabel ?? children : state === 'holding' ? holdingLabel ?? children : children;
  return (
    <Button {...rest} disabled={disabled} variant={variant} className={cx('alt-hold', className)} data-hold={state}
      data-final={done && !repeatable ? '' : undefined} aria-disabled={(done && !repeatable) || undefined}
      style={{ ['--alt-hold-dur' as any]: duration + 'ms', ...style }}
      onClick={(e) => { if (done) { e.preventDefault(); return; } onClick?.(e); }}
      onPointerDown={(e) => { if (e.button === 0) start(); }} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') cancel(); }}
      onContextMenu={(e) => e.preventDefault()}>
      <span className="alt-hold-fill" aria-hidden="true" />
      <span className="alt-hold-text">{label}</span>
      <span className="alt-sr" aria-live="polite">{state === 'holding' ? 'Keep holding to confirm' : done ? 'Confirmed' : ''}</span>
    </Button>
  );
}

/* ───────────────────────── ScrollArea ───────────────────────── */

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A header that sits flush at the top and rises once content scrolls beneath it. */
  header?: React.ReactNode;
  maxHeight?: number | string;
  'aria-label'?: string;
}
/** Overflow as depth: where content continues past an edge, the edge curves away (an inner lip); content passing under the header lifts it. */
export function ScrollArea({ header, maxHeight = 280, className, children, ...rest }: ScrollAreaProps) {
  const body = React.useRef<HTMLDivElement>(null);
  const inner = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ top: false, bottom: false });
  const update = React.useCallback(() => {
    const el = body.current; if (!el) return;
    const top = el.scrollTop > 1, bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
  }, []);
  useIsoLayoutEffect(() => {
    update();
    const ro = new ResizeObserver(update);
    if (body.current) ro.observe(body.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [update]);
  return (
    <div className={cx('alt-scroll', className)} data-top={edges.top ? '' : undefined} data-bottom={edges.bottom ? '' : undefined} {...rest}>
      {header && <div className="alt-scroll-header">{header}</div>}
      <div className="alt-scroll-body" ref={body} onScroll={update} style={{ maxHeight }} tabIndex={0} aria-label={rest['aria-label']}>
        <div ref={inner}>{children}</div>
      </div>
      <span className="alt-scroll-lip" data-edge="top" aria-hidden="true" />
      <span className="alt-scroll-lip" data-edge="bottom" aria-hidden="true" />
    </div>
  );
}

/* ───────────────────────── DropZone ───────────────────────── */

export interface DropZoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrop'> {
  onFiles?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  /** Force a visual state, for documentation: idle, armed (a file is being dragged somewhere on the page) or over. */
  state?: 'idle' | 'armed' | 'over';
}
/** Receptacles open when they're needed: a drop zone is flush until a file is dragged anywhere on the page, then sinks open; over it, it deepens. */
export function DropZone({ onFiles, accept, multiple = true, state, className, children, ...rest }: DropZoneProps) {
  const [armed, setArmed] = React.useState(false);
  const [over, setOver] = React.useState(false);
  const [landed, setLanded] = React.useState(0);
  const input = React.useRef<HTMLInputElement>(null);
  const { style: depthStyle, ...depth } = useDepth({ settle: landed || undefined });
  React.useEffect(() => {
    let n = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');
    const enter = (e: DragEvent) => { if (!hasFiles(e)) return; n++; setArmed(true); };
    const leave = (e: DragEvent) => { if (!hasFiles(e)) return; n = Math.max(0, n - 1); if (!n) { setArmed(false); setOver(false); } };
    const end = () => { n = 0; setArmed(false); setOver(false); };
    window.addEventListener('dragenter', enter); window.addEventListener('dragleave', leave);
    window.addEventListener('drop', end); window.addEventListener('dragend', end);
    return () => { window.removeEventListener('dragenter', enter); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', end); window.removeEventListener('dragend', end); };
  }, []);
  const take = (files: File[]) => { if (!files.length) return; onFiles?.(files); setLanded((x) => x + 1); };
  const visual = state ?? (over ? 'over' : armed ? 'armed' : 'idle');
  return (
    <div className={cx('alt-drop', className)} data-drop={visual} role="button" tabIndex={0} {...depth} style={depthStyle}
      onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); setArmed(false); take(Array.from(e.dataTransfer.files)); }} {...rest}>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => take(Array.from(e.target.files || []))} />
      {children}
    </div>
  );
}

/* ───────────────────────── SortableList ───────────────────────── */

export interface SortableListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, state: { held: boolean }) => React.ReactNode;
  /** Accessible name for each item, used in announcements. */
  getLabel?: (item: T) => string;
  gap?: number;
  className?: string;
  'aria-label'?: string;
}
const move = <T,>(arr: T[], from: number, to: number) => { const a = arr.slice(); const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };

/** Possession as depth: the item you pick up comes into your hand (level 3), the slot it will land in opens as a well, and it lands with a settle. */
export function SortableList<T>({ items, getKey, onReorder, renderItem, getLabel = (i) => String(getKey(i)), gap = 8, className, ...rest }: SortableListProps<T>) {
  const nodes = React.useRef(new Map<string, HTMLDivElement>());
  const before = React.useRef(new Map<string, number>());
  const start = React.useRef<{ y: number; key: string; from: number; tops: number[]; hs: number[]; id: number } | null>(null);
  const [drag, setDrag] = React.useState<{ key: string; from: number; to: number; dy: number } | null>(null);
  const [kb, setKb] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState('');

  const snapshot = () => { before.current.clear(); nodes.current.forEach((el, k) => before.current.set(k, el.getBoundingClientRect().top)); };
  useIsoLayoutEffect(() => {
    nodes.current.forEach((el, k) => {
      const prev = before.current.get(k); if (prev === undefined) return;
      const d = prev - el.getBoundingClientRect().top;
      if (Math.abs(d) < 0.5) return;
      el.style.transition = 'none'; el.style.transform = `translateY(${d}px)`;
      el.getBoundingClientRect();
      el.style.transition = ''; el.style.transform = '';
    });
    before.current.clear();
  }, [items]);

  const keys = items.map(getKey);
  const onPointerDown = (e: React.PointerEvent, key: string, index: number) => {
    if (e.button !== 0) return;
    const els = keys.map((k) => nodes.current.get(k)!);
    start.current = { y: e.clientY, key, from: index, tops: els.map((el) => el.offsetTop), hs: els.map((el) => el.offsetHeight), id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return;
    const dy = e.clientY - s.y;
    if (!drag && Math.abs(dy) < 4) return;
    if (!drag) (e.currentTarget as HTMLElement).setPointerCapture(s.id);
    const center = s.tops[s.from] + s.hs[s.from] / 2 + dy;
    let to = 0;
    s.tops.forEach((t, i) => { if (i !== s.from && t + s.hs[i] / 2 < center) to++; });
    setDrag({ key: s.key, from: s.from, to, dy });
  };
  const onPointerUp = () => {
    const s = start.current; start.current = null;
    if (!drag || !s) { setDrag(null); return; }
    const { from, to } = drag;
    if (from !== to) snapshot();
    setDrag(null);
    if (from !== to) { onReorder(move(items, from, to)); setMsg(`${getLabel(items[from])} moved to position ${to + 1} of ${items.length}.`); }
  };
  const onKeyDown = (e: React.KeyboardEvent, key: string, index: number) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (kb === key) { setKb(null); setMsg(`${getLabel(items[index])} dropped at position ${index + 1}.`); } else { setKb(key); setMsg(`${getLabel(items[index])} picked up. Use the arrow keys to move it, Space to drop.`); } }
    else if (kb === key && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const to = Math.max(0, Math.min(items.length - 1, index + (e.key === 'ArrowUp' ? -1 : 1)));
      if (to !== index) { snapshot(); onReorder(move(items, index, to)); setMsg(`Position ${to + 1} of ${items.length}.`); requestAnimationFrame(() => nodes.current.get(key)?.focus()); }
    } else if (e.key === 'Escape' && kb) { setKb(null); }
  };

  const s = start.current;
  const h = drag && s ? s.hs[drag.from] + gap : 0;
  const slotTop = drag && s ? (drag.to <= drag.from ? s.tops[drag.to] : s.tops[drag.to] + s.hs[drag.to] - s.hs[drag.from]) : 0;
  return (
    <div className={cx('alt-sort', className)} style={{ gap }} role="list" aria-label={rest['aria-label']} data-dragging={drag ? '' : undefined}>
      {drag && s && <div className="alt-sort-slot" aria-hidden="true" style={{ top: slotTop, height: s.hs[drag.from] }} />}
      {items.map((item, i) => {
        const key = keys[i];
        const held = drag?.key === key || kb === key;
        let shift = 0;
        if (drag && key !== drag.key) {
          if (drag.from < drag.to && i > drag.from && i <= drag.to) shift = -h;
          if (drag.to < drag.from && i >= drag.to && i < drag.from) shift = h;
        }
        const transform = drag?.key === key ? `translateY(${drag.dy}px)` : shift ? `translateY(${shift}px)` : undefined;
        return (
          <div key={key} ref={(el) => { if (el) nodes.current.set(key, el); else nodes.current.delete(key); }} role="listitem" tabIndex={0}
            className="alt-sort-item" data-held={held ? '' : undefined} data-following={drag?.key === key ? '' : undefined}
            aria-roledescription="sortable item" aria-grabbed={held}
            style={{ transform }} onPointerDown={(e) => onPointerDown(e, key, i)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            onKeyDown={(e) => onKeyDown(e, key, i)}>
            <span className="alt-sort-grip" aria-hidden="true">
              <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><circle cx="3" cy="3" r="1.3" /><circle cx="9" cy="3" r="1.3" /><circle cx="3" cy="8" r="1.3" /><circle cx="9" cy="8" r="1.3" /><circle cx="3" cy="13" r="1.3" /><circle cx="9" cy="13" r="1.3" /></svg>
            </span>
            <div className="alt-sort-body">{renderItem(item, { held })}</div>
          </div>
        );
      })}
      <span className="alt-sr" aria-live="assertive">{msg}</span>
    </div>
  );
}
