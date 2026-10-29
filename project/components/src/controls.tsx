import * as React from 'react';
import { cx, DepthProps, Icons, inert, riseDelay, Spinner, useApproach, useControllable, useDepth, useIsoLayoutEffect, useKeyFocus, usePrimaryRegistration } from './core';
import { Arrive, Await, hasPromise, hint, isPromise, LoadingScope, Promised, readChildren, readPromised, SkeletonOption, TextImprint, useArrival, useHasWaited, useReportWaiting, useScopeWaiting } from './suspense';

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
  const own = React.useRef<HTMLButtonElement | null>(null);
  usePrimaryRegistration(own, variant === 'primary');
  const setRef = React.useCallback((el: HTMLButtonElement | null) => { own.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; }, [ref]);
  return (
    <button ref={setRef} type={type} className={cx('alt-btn', className)} data-variant={variant} data-size={size}
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
  /**
   * The card holds a Suspense boundary: while anything of yours inside it suspends, the card stays up and its body is an
   * imprint (a title line and `lines` lines of text, default 3). `false` lets it suspend to your own boundary.
   * It's also a loading scope: its optional parts (description, body text) wait while its required parts do.
   */
  skeleton?: SkeletonOption;
}
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive, className, onKeyDown, settle, status, heldBy, relevance, style, skeleton, children, ...rest }, ref) {
  const actionable = interactive && !!rest.onClick;
  const { style: depthStyle, ...depth } = useDepth({ settle, status, heldBy, relevance });
  const { lines = 3 } = hint(skeleton);
  return <div ref={ref} className={cx('alt-card', interactive && 'alt-lift', className)}
    role={actionable ? 'button' : undefined} tabIndex={actionable ? 0 : undefined}
    onKeyDown={actionable ? (e) => { onKeyDown?.(e); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } } : onKeyDown}
    {...depth} style={{ ...depthStyle, ...style }} {...rest}>
    <LoadingScope>
      <Await shape="none" enabled={skeleton !== false} imprint={
        <span className="alt-await-card">
          <TextImprint className="alt-card-title" width="45%" />
          <TextImprint className="alt-await-card-body" lines={lines} />
        </span>
      }>{children}</Await>
    </LoadingScope>
  </div>;
});
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cx('alt-card-header', className)} {...p} />;

/**
 * Text that may still be on its way: `undefined` while your data loads (`{user?.name}`), a promise, or one promise among
 * plain text. `null` renders nothing.
 */
type PromisedText<E> = Omit<React.HTMLAttributes<E>, 'children'> & {
  children?: React.ReactNode | PromiseLike<React.ReactNode> | Array<React.ReactNode | PromiseLike<React.ReactNode>>;
  /** While the text is on its way, its imprint: `lines` (one for a title, two for a description) and `width`. `false`: render what you pass as it is, and let promises suspend to your own boundary. */
  skeleton?: SkeletonOption;
};
const Promised$ = ({ children }: { children: unknown }) => <>{readChildren(children)}</>;
/**
 * Required text (a title) waits while it's undefined and tells its card so. Optional text (a description, a card's body)
 * waits only while its card is waiting, so a field that's simply missing renders as nothing instead of an imprint.
 */
function usePendingText(children: unknown, skeleton: SkeletonOption | undefined, required: boolean) {
  const scopeWaiting = useScopeWaiting();
  const missing = skeleton !== false && children === undefined && (required || scopeWaiting);
  useReportWaiting(required && skeleton !== false && (children === undefined || hasPromise(children)));
  const arrival = useArrival(missing);
  const waited = useHasWaited(missing || hasPromise(children));
  return { arrival, waited };
}
function PendingText({ children, skeleton, lines, width, required }: { children: unknown; skeleton?: SkeletonOption; lines: number; width?: string; required: boolean }) {
  const { arrival, waited } = usePendingText(children, skeleton, required);
  if (!waited) return <>{children as React.ReactNode}</>;
  const h = hint(skeleton);
  return (
    <Await shape="text" enabled={skeleton !== false} imprint={<TextImprint lines={h.lines ?? lines} width={h.width ?? width} />}>
      <Arrive when={arrival}><Promised$>{children}</Promised$></Arrive>
    </Await>
  );
}
export const CardTitle = ({ className, children, skeleton, ...p }: PromisedText<HTMLHeadingElement>) =>
  <h3 className={cx('alt-card-title', className)} {...p}><PendingText skeleton={skeleton} lines={1} width="55%" required>{children}</PendingText></h3>;
export const CardDescription = ({ className, children, skeleton, ...p }: PromisedText<HTMLParagraphElement>) =>
  <p className={cx('alt-card-desc', className)} {...p}><PendingText skeleton={skeleton} lines={2} required={false}>{children}</PendingText></p>;
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The body holds a Suspense boundary: while anything of yours inside it suspends, or its text (`{user?.bio}`) is undefined while the card's other parts are, it's `lines` lines of imprint (default 3). `false` suspends to your own boundary. */
  skeleton?: SkeletonOption;
}
export const CardContent = ({ className, skeleton, children, ...p }: CardContentProps) => {
  const { lines = 3 } = hint(skeleton);
  // Body text passed straight in (`{user?.bio}`) is optional: it waits only while the card does.
  const scopeWaiting = useScopeWaiting();
  const missing = skeleton !== false && children === undefined && scopeWaiting;
  const arrival = useArrival(missing);
  return <div className={cx('alt-card-content', className)} {...p}>
    <Await shape="none" enabled={skeleton !== false} imprint={<TextImprint lines={lines} />}><Arrive when={arrival}>{children}</Arrive></Await>
  </div>;
};
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
  const describedBy = [...new Set([children.props['aria-describedby'], hint && id + '-hint', error && id + '-error']
    .filter(Boolean).join(' ').split(/\s+/).filter(Boolean))].join(' ') || undefined;
  return (
    <div className={cx('alt-field', className)}>
      <label className="alt-field-label" htmlFor={controlId}>{label}{required && <span className="alt-field-req" aria-hidden="true"> *</span>}</label>
      {React.cloneElement(children, { id: controlId, 'aria-describedby': describedBy, invalid: !!error || children.props.invalid, required: required ?? children.props.required })}
      {hint && <p className="alt-field-hint" id={id + '-hint'}>{hint}</p>}
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
export function TabsContent({ value, forceMount, className, ...rest }: React.HTMLAttributes<HTMLDivElement> & { value: string; forceMount?: boolean }) {
  const t = React.useContext(TabsCtx)!;
  const on = t.value === value;
  if (!on && !forceMount) return null;
  // forceMount keeps an unchosen panel mounted (it holds state, or the two cross-fade), inert and hidden from assistive technology.
  return <div role="tabpanel" id={`${t.id}-p-${value}`} aria-labelledby={`${t.id}-t-${value}`} tabIndex={0} className={cx('alt-tabs-content', className)}
    data-state={forceMount ? (on ? 'active' : 'inactive') : undefined} aria-hidden={on ? undefined : true} {...(on ? {} : inert)} {...rest} />;
}

/* ───────────────────────── Slider ───────────────────────── */

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value?: number; defaultValue?: number; onValueChange?: (v: number) => void;
  min?: number; max?: number; step?: number; disabled?: boolean;
  /** Format the value shown in the bubble that floats above the thumb while dragging. */
  format?: (v: number) => React.ReactNode;
  'aria-label'?: string;
}
/** A range: two thumbs with the raised fill between them. */
export interface SliderRangeProps extends Omit<SliderProps, 'value' | 'defaultValue' | 'onValueChange' | 'aria-label'> {
  value?: [number, number]; defaultValue?: [number, number]; onValueChange?: (v: [number, number]) => void;
  /** Steps the thumbs keep between them, so they can't meet. Default 0. */
  minStepsBetween?: number;
  /** A name per thumb, or one name for the pair (each thumb is then "<name>, minimum" and "<name>, maximum"). */
  'aria-label'?: string | [string, string];
}
export function Slider(props: SliderProps): React.ReactElement;
export function Slider(props: SliderRangeProps): React.ReactElement;
export function Slider(props: SliderProps | SliderRangeProps) {
  return Array.isArray(props.value ?? props.defaultValue) ? <RangeSlider {...(props as SliderRangeProps)} /> : <OneSlider {...(props as SliderProps)} />;
}
function OneSlider({ value, defaultValue = 50, onValueChange, min = 0, max = 100, step = 1, disabled, format = (v) => v, className, ...rest }: SliderProps) {
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

/** Two values on one track: what the range Slider and ChartBrush share. A thumb can't cross the other or come within
 *  `minStepsBetween` of it; dragging between the thumbs pans both; pressing outside them moves the nearer one there,
 *  or with `outside: 'centre'` centres the pair there and pans from it. */
export function useRange({ value, defaultValue, onValueChange, min, max, step, minStepsBetween = 0, disabled, outside = 'nearer' }: {
  value?: [number, number]; defaultValue?: [number, number]; onValueChange?: (v: [number, number]) => void;
  min: number; max: number; step: number; minStepsBetween?: number; disabled?: boolean; outside?: 'nearer' | 'centre';
}) {
  const [v, set] = useControllable(value, defaultValue ?? [min, max], onValueChange);
  const track = React.useRef<HTMLDivElement>(null);
  // Which thumb is held: 0, 1, 'both' while panning, or 'tie' when the pressed thumbs sit together until the first move picks one.
  const [held, setHeld] = React.useState<0 | 1 | 'both' | 'tie' | null>(null);
  const grab = React.useRef({ at: 0, lo: 0, hi: 0 });
  const gap = minStepsBetween * step;
  const dp = (String(step).split('.')[1] || '').length;
  const snap = (n: number) => +(Math.round((n - min) / step) * step + min).toFixed(dp);
  const lo = v[0], hi = v[1];
  const bounds = (i: 0 | 1): [number, number] => (i === 0 ? [min, hi - gap] : [lo + gap, max]);
  const put = (i: 0 | 1, n: number) => {
    const [a, b] = bounds(i), x = Math.min(b, Math.max(a, snap(n)));
    if (x !== v[i]) set(i === 0 ? [x, hi] : [lo, x]);
  };
  const pan = (d: number, from = grab.current) => {
    const s = Math.min(max - from.hi, Math.max(min - from.lo, snap(min + d) - min));
    const next: [number, number] = [+(from.lo + s).toFixed(dp), +(from.hi + s).toFixed(dp)];
    if (next[0] !== lo || next[1] !== hi) set(next);
  };
  /** Moves both by d, keeping the span, stopping at the ends. */
  const shift = (d: number) => pan(d, { at: 0, lo, hi });
  const at = (x: number) => { const r = track.current!.getBoundingClientRect(); return min + ((x - r.left) / r.width) * (max - min); };
  const pct = (n: number) => ((n - min) / (max - min)) * 100;
  const press = (e: React.PointerEvent<HTMLElement>, thumb?: 0 | 1) => {
    if (disabled || e.button > 0) return;
    // Keep the mousedown that follows from taking focus back off the thumb we focus.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const n = at(e.clientX);
    grab.current = { at: n, lo, hi };
    if (thumb !== undefined) { setHeld(lo === hi ? 'tie' : thumb); return thumb; }
    if (n > lo && n < hi) { setHeld('both'); return 'both' as const; }
    if (outside === 'centre') {
      const a = Math.min(max - (hi - lo), Math.max(min, snap(n - (hi - lo) / 2)));
      grab.current = { at: n, lo: a, hi: +(a + hi - lo).toFixed(dp) };
      if (a !== lo) set([grab.current.lo, grab.current.hi]);
      setHeld('both'); return 'both' as const;
    }
    const i: 0 | 1 = n <= lo ? 0 : 1;
    put(i, n); grab.current = { at: snap(n), lo: i === 0 ? snap(n) : lo, hi: i === 1 ? snap(n) : hi };
    setHeld(i); return i;
  };
  const drag = (e: React.PointerEvent<HTMLElement>) => {
    if (held === null) return;
    const n = at(e.clientX), d = n - grab.current.at;
    if (held === 'both') pan(d);
    else if (held === 'tie') { if (Math.abs(d) >= step / 2) { const i: 0 | 1 = d < 0 ? 0 : 1; setHeld(i); put(i, grab.current[i === 0 ? 'lo' : 'hi'] + d); } }
    else put(held, grab.current[held === 0 ? 'lo' : 'hi'] + d);
  };
  const release = () => setHeld(null);
  const keys = (i: 0 | 1) => (e: React.KeyboardEvent) => {
    const big = (max - min) / 10, [a, b] = bounds(i), x = v[i];
    const map: Record<string, number> = { ArrowRight: x + step, ArrowUp: x + step, ArrowLeft: x - step, ArrowDown: x - step, PageUp: x + big, PageDown: x - big, Home: a, End: b };
    if (e.key in map) { e.preventDefault(); put(i, map[e.key]); }
  };
  return { value: v, set, held, track, bounds, pct, press, drag, release, keys, shift };
}

function RangeSlider({ value, defaultValue, onValueChange, min = 0, max = 100, step = 1, minStepsBetween, disabled, format = (v) => v, className, 'aria-label': label, ...rest }: SliderRangeProps) {
  const r = useRange({ value, defaultValue, onValueChange, min, max, step, minStepsBetween, disabled });
  const [lo, hi] = r.value;
  const thumbs = React.useRef<(HTMLDivElement | null)[]>([]);
  const names = Array.isArray(label) ? label : label ? [`${label}, minimum`, `${label}, maximum`] : [undefined, undefined];
  const text = (n: number) => { const f = format(n); return typeof f === 'string' || typeof f === 'number' ? String(f) : undefined; };
  const isHeld = (i: 0 | 1) => r.held === i || r.held === 'both' || r.held === 'tie';
  return (
    <div className={cx('alt-slider', className)} data-range="" data-dragging={r.held !== null ? '' : undefined} data-disabled={disabled ? '' : undefined}
      role="group" aria-label={typeof label === 'string' ? label : undefined}
      onPointerDown={(e) => {
        const t = (e.target as HTMLElement).closest('.alt-slider-thumb') as HTMLElement | null;
        const i = r.press(e, t ? (Number(t.dataset.thumb) as 0 | 1) : undefined);
        if (i === 0 || i === 1) thumbs.current[i]?.focus();
      }}
      onPointerMove={r.drag} onPointerUp={r.release} onPointerCancel={r.release} {...rest}>
      <div className="alt-slider-track" ref={r.track}>
        <div className="alt-slider-fill" aria-hidden="true" data-grabbed={r.held === 'both' ? '' : undefined} style={{ left: r.pct(lo) + '%', width: r.pct(hi) - r.pct(lo) + '%' }} />
      </div>
      {([0, 1] as const).map((i) => {
        const [a, b] = r.bounds(i), x = r.value[i];
        return (
          <div key={i} ref={(el) => { thumbs.current[i] = el; }} className="alt-slider-thumb" role="slider" data-thumb={i} tabIndex={disabled ? -1 : 0}
            aria-valuemin={a} aria-valuemax={b} aria-valuenow={x} aria-valuetext={text(x)} aria-label={names[i]} aria-disabled={disabled || undefined}
            data-grabbed={r.held !== null && isHeld(i) ? '' : undefined} data-rest={r.held !== null && !isHeld(i) ? '' : undefined}
            style={{ left: r.pct(x) + '%' }} onKeyDown={r.keys(i)}>
            <span className="alt-slider-bubble" aria-hidden="true">{format(x)}</span>
          </div>
        );
      })}
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

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
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
  /** The label. Undefined while your data loads, or a promise: until it arrives the badge is a plate-shaped imprint. */
  children?: React.ReactNode | PromiseLike<React.ReactNode> | Array<React.ReactNode | PromiseLike<React.ReactNode>>;
  /** While the label is on its way: the imprint's `width` (default 64px; a count is round). `false`: render what you pass as it is, and let promises suspend to your own boundary. */
  skeleton?: SkeletonOption;
}
/** A label stamped into the record. Status carries a lamp that relights when it changes; a changed label is re-stamped. */
export function Badge({ children, skeleton, ...props }: BadgeProps) {
  const missing = skeleton !== false && children === undefined;
  useReportWaiting(missing || (skeleton !== false && hasPromise(children)));
  const arrival = useArrival(missing);
  if (!useHasWaited(missing || hasPromise(children))) return <BadgeFace {...props}>{children as React.ReactNode}</BadgeFace>;
  const h = hint(skeleton);
  return (
    <Await inline shape="block" enabled={skeleton !== false}
      imprint={<span className="alt-skeleton alt-badge-imprint" data-variant={props.variant === 'count' ? 'count' : undefined} style={{ width: h.width }} />}>
      <Arrive when={arrival}><BadgeLanded {...props}>{children}</BadgeLanded></Arrive>
    </Await>
  );
}
function BadgeLanded({ children, ...props }: Omit<BadgeProps, 'skeleton'>) {
  return <BadgeFace {...props}>{readChildren(children)}</BadgeFace>;
}
function BadgeFace({ tone = 'neutral', variant = 'plate', lamp, dot, className, children, ...rest }: Omit<BadgeProps, 'skeleton' | 'children'> & { children?: React.ReactNode }) {
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

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The accessible label. Undefined while your data loads (`user?.name`), or a promise: until it arrives the avatar is an imprint of its size and shape. */
  name: Promised<string> | undefined;
  /** May be a promise, like `name`. If the image fails to load, the initials show instead. */
  src?: Promised<string | undefined>;
  /** In pixels. Default 36. */
  size?: number;
  /** `circle` (default) for a person; `square` for a team, an organisation, a bot or an agent. */
  shape?: 'circle' | 'square';
  /** Presence: active and idle people are here, so they rest on the page (a filled lamp or an empty one says which); offline people lie flat in it, grey. */
  status?: 'active' | 'idle' | 'offline';
  /** Speaking, typing or presenting right now: the face leaves the ground and drifts above its shadow. */
  live?: boolean;
  /** Ties the person to their presence colour, the same ring they wear on anything they're holding. */
  presence?: 1 | 2 | 3;
  /** The status lamp (filled green active, empty amber ring idle). Default: shown when there is a status and the avatar is 24px or larger. Never shown inside AvatarGroup. */
  lamp?: boolean;
  /** `false`: no imprint. An undefined `name` renders an empty face; a promised one suspends to your own boundary. */
  skeleton?: boolean;
}
/** A disc resting on the page while the person is here, flush in it when they're not; live, it lifts off its shadow. */
export function Avatar({ skeleton, ...props }: AvatarProps) {
  const missing = skeleton !== false && props.name === undefined;
  const promised = isPromise(props.name) || isPromise(props.src);
  useReportWaiting(missing || (skeleton !== false && isPromise(props.name)));
  const arrival = useArrival(missing);
  if (!useHasWaited(missing || promised)) return <AvatarFace {...props} name={(props.name as string | undefined) ?? ''} src={props.src as string | undefined} />;
  const size = props.size ?? 36;
  const square = props.shape === 'square';
  return (
    <Await inline shape={square ? 'block' : 'circle'} enabled={skeleton !== false}
      imprint={<span className="alt-skeleton alt-avatar-imprint" data-shape={square ? 'block' : 'circle'}
        style={{ width: size, height: size, borderRadius: square ? avatarRadius(size) : undefined }} />}>
      <Arrive when={arrival}><AvatarLanded {...props} /></Arrive>
    </Await>
  );
}
function AvatarLanded(props: Omit<AvatarProps, 'skeleton'>) {
  return <AvatarFace {...props} name={readPromised(props.name) ?? ''} src={readPromised(props.src)} />;
}
/** The first letter of the first and last words, skipping punctuation and emoji ("Mara de Quist" is MQ); one letter on small faces. */
function avatarInitials(name: string, count: 1 | 2) {
  const firsts = name.split(/\s+/).map((w) => w.match(/[\p{L}\p{N}]/u)?.[0]).filter((c): c is string => !!c);
  return (firsts.length > 1 && count === 2 ? firsts[0]! + firsts[firsts.length - 1]! : firsts[0] ?? '').toUpperCase();
}
/** A square face's corners grow with it, as every surface's do. */
function avatarRadius(size: number) {
  return `var(--radius-${size <= 24 ? 'xs' : size <= 36 ? 'sm' : size <= 48 ? 'md' : 'lg'})`;
}
function AvatarFace({ name, src, size = 36, shape, status, live, presence, lamp, className, style, onClick, ...rest }: Omit<AvatarProps, 'skeleton' | 'name' | 'src'> & { name: string; src?: string }) {
  const initials = avatarInitials(name, size < 28 ? 1 : 2);
  const [broken, setBroken] = React.useState<string>();
  const label = [name, status, live && 'live'].filter(Boolean).join(', ');
  const showLamp = (lamp ?? size >= 24) && (status === 'active' || status === 'idle');
  return (
    <span className={cx('alt-avatar', className)} data-shape={shape === 'square' ? 'square' : undefined} data-status={status} data-live={live ? '' : undefined}
      data-presence={presence ? String(presence) : undefined} data-interactive={onClick ? '' : undefined}
      role={onClick ? 'button' : 'img'} tabIndex={onClick ? 0 : undefined} aria-label={label} title={label} onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } } : undefined}
      style={{ ['--size' as any]: size + 'px', ...(shape === 'square' && { ['--av-r' as any]: avatarRadius(size) }), ...style }} {...rest}>
      <span className="alt-avatar-shadow" aria-hidden="true" />
      <span className="alt-avatar-face" data-one={[...initials].length === 1 ? '' : undefined}>{src && broken !== src ? <img src={src} alt="" onError={() => setBroken(src)} /> : initials}</span>
      {showLamp && <span className="alt-avatar-lamp" aria-hidden="true" />}
    </span>
  );
}
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show at most this many faces; the rest become a "+N" plate that names them. */
  max?: number;
  /** In pixels, for every face that doesn't set its own. Default: the first face's size, or 36. */
  size?: number;
}
/** Faces standing on one ground line, each cut out of the one before it. */
export function AvatarGroup({ className, children, max, size: groupSize, style, ...rest }: AvatarGroupProps) {
  const all = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<AvatarProps>[];
  const size = groupSize ?? all[0]?.props.size ?? 36;
  const sized = groupSize ? all.map((c) => (c.props.size ? c : React.cloneElement(c, { size: groupSize }))) : all;
  const shown = max ? sized.slice(0, max) : sized;
  const hidden = sized.slice(shown.length);
  const names = hidden.map((c) => c.props.name).filter((n): n is string => typeof n === 'string');
  const more = hidden.length ? `${hidden.length} more${names.length === hidden.length ? ': ' + names.join(', ') : ''}` : '';
  return (
    <div className={cx('alt-avatar-group', className)} role="group" aria-label={`${all.length} ${all.length === 1 ? 'person' : 'people'}`}
      style={{ ['--size' as any]: size + 'px', ...style }} {...rest}>
      {shown}
      {hidden.length > 0 && (
        <span className="alt-avatar" data-more="" role="img" aria-label={more} title={more} style={{ ['--size' as any]: size + 'px' }}>
          <span className="alt-avatar-shadow" aria-hidden="true" />
          <span className="alt-avatar-face">+{hidden.length}</span>
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
  /** The dismiss button's words ("Remind me tomorrow"). Default: an × named "Dismiss". */
  dismissLabel?: string;
  /** 'page': a banner for the whole app or page, edge to edge with no side rounding, in a labelled region. Default 'inline'. */
  placement?: 'inline' | 'page';
  /** With placement="page": stays at the top while the page scrolls. */
  sticky?: boolean;
}
/** Status as a sheet laid on the page: it rests on the ground (you can see its edge and its contact shadow) and never floats. When it asks the person to act it becomes a raised card. */
export function Alert({ tone = 'neutral', variant = 'flat', title, action, icon, onDismiss, dismissLabel, placement = 'inline', sticky, settle, className, style, children, ...rest }: AlertProps) {
  const I = toneIcon[tone];
  const [closing, setClosing] = React.useState(false);
  const { style: depthStyle, ...depth } = useDepth({ settle });
  const page = placement === 'page';
  const dismiss = () => {
    setClosing(true);
    // A page banner's button disappears with it, so focus goes to the page's main content.
    if (page) window.setTimeout(() => document.querySelector<HTMLElement>('#alt-main, main')?.focus({ preventScroll: true }), 0);
    window.setTimeout(() => onDismiss?.(), 400);
  };
  const alert = (
    <div role={tone === 'critical' ? 'alert' : 'status'} className={cx('alt-alert', className)} data-tone={tone} data-variant={variant}
      data-placement={page ? 'page' : undefined} data-sticky={page && sticky ? '' : undefined}
      data-closing={closing ? '' : undefined} {...depth} style={{ ...depthStyle, ...style }} {...rest}>
      <div className="alt-alert-inner">
        <span className="alt-alert-icon" aria-hidden="true">{icon ?? <I size={18} />}</span>
        <div className="alt-alert-body">
          {title && <p className="alt-alert-title">{title}</p>}
          {children && <div className="alt-alert-text">{children}</div>}
        </div>
        {action && <div className="alt-alert-action">{action}</div>}
        {onDismiss && (dismissLabel
          ? <button type="button" className="alt-alert-close" data-labelled="" onClick={dismiss}>{dismissLabel}</button>
          : <button type="button" className="alt-alert-close" aria-label="Dismiss" onClick={dismiss}><Icons.X size={14} /></button>)}
      </div>
    </div>
  );
  // A page banner is a labelled region, so it can be found and skipped.
  return page ? <section className="alt-banner" aria-label={typeof title === 'string' ? title : 'Notice'} data-sticky={sticky ? '' : undefined}>{alert}</section> : alert;
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
  /** 'page': a stack of page banners, edge to edge. Give each Alert placement="page" too. */
  placement?: 'inline' | 'page';
}
/**
 * Several alerts as a stack of sheets: the first lies on top and the others peek out beneath it, each tinted by its
 * own tone, with a count. Opening the stack fans them out; dismissing the top one lifts it off and the next comes up.
 */
export function AlertStack({ children, expanded, defaultExpanded = false, onExpandedChange, moreLabel = (n) => `+${n} more`, lessLabel = 'Show less', placement = 'inline', className, ...rest }: AlertStackProps) {
  const list = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<AlertProps>[];
  const [open, setOpen] = useControllable(expanded, defaultExpanded, onExpandedChange);
  const topKey = list[0]?.key;
  const prevTop = React.useRef(topKey);
  const [risen, setRisen] = React.useState(0);
  React.useEffect(() => { if (prevTop.current !== topKey) { prevTop.current = topKey; if (topKey != null) setRisen((r) => r + 1); } }, [topKey]);
  const hidden = list.length - 1;
  const all = open || hidden < 1;
  return (
    <div className={cx('alt-alert-stack', className)} data-placement={placement === 'page' ? 'page' : undefined} data-expanded={all ? '' : undefined} data-sheets={all ? undefined : Math.min(hidden, 2)} {...rest}>
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
  // Every label is laid out in the same cell, so the button is as wide as its longest and never changes width.
  const labels: [string, React.ReactNode][] = [['idle', children]];
  if (holdingLabel != null) labels.push(['holding', holdingLabel]);
  if (doneLabel != null) labels.push(['done', doneLabel]);
  const shown = labels.some(([k]) => k === state) ? state : 'idle';
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
      <span className="alt-hold-text">
        {labels.map(([k, l]) => <span key={k} className="alt-hold-label" data-shown={k === shown ? '' : undefined} aria-hidden={k === shown ? undefined : true}>{l}</span>)}
      </span>
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
  /** The files you're handling, shown as slats under the zone: uploading (a Progress fill), processing (hovering, pending), done (lands and settles) or failed (a trench with Retry). */
  queue?: UploadItem[];
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRemove?: (id: string) => void;
}
export interface UploadItem {
  id: string;
  name: string;
  /** Bytes. */
  size?: number;
  state: 'uploading' | 'processing' | 'done' | 'failed';
  /** 0–100, while uploading. */
  progress?: number;
  /** Why it failed, in words. */
  error?: string;
}
/** Receptacles open when they're needed: a drop zone is flush until a file is dragged anywhere on the page, then sinks open; over it, it deepens. */
export function DropZone({ onFiles, accept, multiple = true, state, queue, onRetry, onCancel, onRemove, className, children, ...rest }: DropZoneProps) {
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
  const zone = (
    <div className={cx('alt-drop', className)} data-drop={visual} role="button" tabIndex={0} {...depth} style={depthStyle}
      onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); setArmed(false); take(Array.from(e.dataTransfer.files)); }} {...rest}>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => take(Array.from(e.target.files || []))} />
      {children}
    </div>
  );
  if (!queue) return zone;
  return <div className="alt-drop-wrap">{zone}<UploadQueue items={queue} onRetry={onRetry} onCancel={onCancel} onRemove={onRemove} /></div>;
}

/** The files under a DropZone. Progress is said at 25, 50, 75 and 100%, and on finishing or failing, never continuously. */
function UploadQueue({ items, onRetry, onCancel, onRemove }: { items: UploadItem[]; onRetry?: (id: string) => void; onCancel?: (id: string) => void; onRemove?: (id: string) => void }) {
  const [said, setSaid] = React.useState('');
  const last = React.useRef(new Map<string, string>());
  React.useEffect(() => {
    const words: string[] = [];
    for (const it of items) {
      const step = it.state === 'uploading' ? `u${Math.floor((it.progress ?? 0) / 25) * 25}` : it.state;
      const was = last.current.get(it.id);
      if (was !== undefined && was !== step) {
        if (it.state === 'uploading' && (it.progress ?? 0) >= 25) words.push(`${it.name}, ${Math.floor((it.progress ?? 0) / 25) * 25}% uploaded`);
        else if (it.state === 'processing') words.push(`${it.name} uploaded, processing`);
        else if (it.state === 'done') words.push(`${it.name} done`);
        else if (it.state === 'failed') words.push(`${it.name} failed${it.error ? `: ${it.error}` : ''}`);
      }
      last.current.set(it.id, step);
    }
    if (words.length) setSaid(words.join('. ') + '.');
  }, [items]);
  return (
    <>
      <ul className="alt-upload-list" aria-label="Files">{items.map((it) => <UploadSlat key={it.id} item={it} onRetry={onRetry} onCancel={onCancel} onRemove={onRemove} />)}</ul>
      <span className="alt-sr" aria-live="polite">{said}</span>
    </>
  );
}
const bytes = (n?: number) => { if (n === undefined) return ''; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return `${i ? n.toFixed(1) : n} ${u[i]}`; };
function UploadSlat({ item, onRetry, onCancel, onRemove }: { item: UploadItem; onRetry?: (id: string) => void; onCancel?: (id: string) => void; onRemove?: (id: string) => void }) {
  // Uploading is a task (a Progress fill in its trench); processing is a write the server hasn't confirmed, so it hovers;
  // done lands and settles; failed drops to a trench.
  const [doneKey, setDoneKey] = React.useState(0);
  const was = React.useRef(item.state);
  React.useEffect(() => { if (item.state === 'done' && was.current !== 'done') setDoneKey((k) => k + 1); was.current = item.state; }, [item.state]);
  const status = item.state === 'processing' ? 'pending' : item.state === 'failed' ? 'failed' : item.state === 'done' ? 'committed' : undefined;
  const { style: depthStyle, ...depth } = useDepth({ status, settle: doneKey || undefined });
  const words = item.state === 'uploading' ? `Uploading, ${Math.round(item.progress ?? 0)}%` : item.state === 'processing' ? 'Processing' : item.state === 'done' ? 'Uploaded' : item.error ?? 'Upload failed';
  return (
    <li className="alt-upload" data-state={item.state} {...depth} style={depthStyle}>
      <div className="alt-upload-text">
        <span className="alt-upload-name">{item.name}</span>
        <span className="alt-upload-state">{item.size !== undefined && <span className="alt-upload-size">{bytes(item.size)} · </span>}{item.state === 'failed' && <Icons.AlertCircle size={14} />}{words}</span>
        {item.state === 'uploading' && <Progress value={item.progress ?? null} aria-label={`Uploading ${item.name}`} />}
      </div>
      <div className="alt-upload-actions">
        {item.state === 'failed' && onRetry && <Button size="sm" variant="secondary" onClick={() => onRetry(item.id)} aria-label={`Retry upload of ${item.name}`}>Retry</Button>}
        {(item.state === 'uploading' || item.state === 'processing') && onCancel && <Button size="sm" variant="ghost" onClick={() => onCancel(item.id)} aria-label={`Cancel upload of ${item.name}`}>Cancel</Button>}
        {(item.state === 'done' || item.state === 'failed') && onRemove && <Button size="sm" variant="ghost" square onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}><Icons.X size={14} /></Button>}
      </div>
    </li>
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

  // Where each item is drawn, relative to its layout box's parent. From the centre, so a held item's tilt and scale don't count.
  const snapshot = () => {
    before.current.clear();
    nodes.current.forEach((el, k) => {
      const r = el.getBoundingClientRect(), p = (el.offsetParent as HTMLElement | null)?.getBoundingClientRect().top ?? 0;
      before.current.set(k, (r.top + r.bottom) / 2 - p - el.offsetHeight / 2);
    });
  };
  // Carry each item from where it was drawn to its new place. Layout offsets don't see transforms, and every item's own
  // transition is held off for the frame, so a drag offset coming off doesn't also play.
  useIsoLayoutEffect(() => {
    const moved: HTMLDivElement[] = [];
    nodes.current.forEach((el, k) => {
      const prev = before.current.get(k); if (prev === undefined) return;
      const d = prev - el.offsetTop;
      el.style.transition = 'none'; el.style.transform = Math.abs(d) < 0.5 ? '' : `translateY(${d}px)`;
      moved.push(el);
    });
    moved.forEach((el) => getComputedStyle(el).transform);
    moved.forEach((el) => { el.style.transition = ''; el.style.transform = ''; });
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
