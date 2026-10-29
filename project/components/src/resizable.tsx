import * as React from 'react';
import { cx, inert } from './core';

/* ───────────────────────── Resizable ───────────────────────── */

type PanelInfo = { defaultSize?: number; minSize: number; maxSize: number; collapsible: boolean; id: string; label?: string };
type GroupCtxT = {
  direction: 'horizontal' | 'vertical'; sizes: number[]; panels: PanelInfo[]; animate: boolean;
  resize: (handle: number, deltaPct: number) => void; setSize: (panel: number, size: number) => void; toggle: (panel: number) => void;
  box: React.RefObject<HTMLDivElement | null>;
};
const GroupCtx = React.createContext<GroupCtxT | null>(null);
const IndexCtx = React.createContext(0);

const read = (key?: string) => { try { return key ? JSON.parse(localStorage.getItem('altitude:resizable:' + key) || 'null') : null; } catch { return null; } };
const write = (key: string | undefined, sizes: number[]) => { try { if (key) localStorage.setItem('altitude:resizable:' + key, JSON.stringify(sizes)); } catch { /* storage may be blocked */ } };

export interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** horizontal (default): panes side by side; vertical: stacked. */
  direction?: 'horizontal' | 'vertical';
  /** Remembers the sizes in this browser under this name. */
  autoSaveId?: string;
  onLayout?: (sizes: number[]) => void;
}
/**
 * Panes beside each other on the ground, parted by dividers you can drag. The panes never lift (a detail pane opening
 * beside its list stays on the ground, unlike a Sheet); only the grip is live, and it floats while held.
 */
export function ResizablePanelGroup({ direction = 'horizontal', autoSaveId, onLayout, className, children, ...rest }: ResizablePanelGroupProps) {
  const kids = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<any>[];
  const panels: PanelInfo[] = kids.filter((k) => k.type === ResizablePanel).map((k, i) => ({
    defaultSize: k.props.defaultSize, minSize: k.props.minSize ?? 10, maxSize: k.props.maxSize ?? 90, collapsible: !!k.props.collapsible,
    id: k.props.id ?? `${autoSaveId ?? 'panel'}-${i}`, label: k.props['aria-label'],
  }));
  const initial = () => {
    const saved = read(autoSaveId);
    if (Array.isArray(saved) && saved.length === panels.length) return saved as number[];
    const given = panels.reduce((t, p) => t + (p.defaultSize ?? 0), 0), open = panels.filter((p) => p.defaultSize === undefined).length;
    return panels.map((p) => p.defaultSize ?? (100 - given) / Math.max(1, open));
  };
  const [sizes, setSizes] = React.useState<number[]>(initial);
  const restore = React.useRef<number[]>([]);
  const [animate, setAnimate] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);
  const commit = (next: number[]) => { setSizes(next); write(autoSaveId, next); onLayout?.(next); };
  const clampPair = (s: number[], a: number, wantA: number) => {
    const b = a + 1, total = s[a] + s[b];
    const lo = Math.max(panels[a].minSize, total - panels[b].maxSize), hi = Math.min(panels[a].maxSize, total - panels[b].minSize);
    const na = Math.min(hi, Math.max(lo, wantA));
    const next = [...s]; next[a] = na; next[b] = total - na;
    return next;
  };
  const ctx: GroupCtxT = {
    direction, sizes, panels, animate, box,
    resize: (h, d) => setSizes((s) => { const n = clampPair(s, h, s[h] + d); write(autoSaveId, n); onLayout?.(n); return n; }),
    setSize: (p, size) => commit(clampPair(sizes, p, size)),
    toggle: (p) => {
      if (!panels[p].collapsible) return;
      const b = p + 1 < panels.length ? p + 1 : p - 1;
      const next = [...sizes];
      if (sizes[p] > 0) { restore.current[p] = sizes[p]; next[b] += sizes[p]; next[p] = 0; }
      else { const back = restore.current[p] ?? panels[p].defaultSize ?? panels[p].minSize; next[p] = back; next[b] -= back; }
      setAnimate(true); window.setTimeout(() => setAnimate(false), 400);
      commit(next);
    },
  };
  let panel = -1, handle = -1;
  return (
    <GroupCtx.Provider value={ctx}>
      <div ref={box} className={cx('alt-resizable', className)} data-direction={direction} data-animate={animate ? '' : undefined} {...rest}>
        {kids.map((k, i) => {
          if (k.type === ResizablePanel) panel++;
          if (k.type === ResizableHandle) handle++;
          return <IndexCtx.Provider key={k.key ?? i} value={k.type === ResizablePanel ? panel : handle}>{k}</IndexCtx.Provider>;
        })}
      </div>
    </GroupCtx.Provider>
  );
}

export interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Percent of the group. Panels without one share what's left. */
  defaultSize?: number;
  /** Percent. Default 10. */
  minSize?: number;
  /** Percent. Default 90. */
  maxSize?: number;
  /** Enter on the handle before it collapses it to nothing, and restores it. */
  collapsible?: boolean;
  /** Names the pane, and the handle that resizes it. */
  'aria-label'?: string;
}
/** A pane: settled, on the ground. A collapsed pane is inert. */
export function ResizablePanel({ defaultSize: _d, minSize: _min, maxSize: _max, collapsible: _c, className, style, id, ...rest }: ResizablePanelProps) {
  const g = React.useContext(GroupCtx)!;
  const i = React.useContext(IndexCtx);
  const size = g.sizes[i] ?? 0;
  const collapsed = size === 0;
  return <div id={g.panels[i]?.id} role="region" className={cx('alt-resizable-panel', className)} data-collapsed={collapsed ? '' : undefined}
    aria-hidden={collapsed || undefined} {...(collapsed ? inert : {})} style={{ flexBasis: `${size}%`, ...style }} {...rest} />;
}

export interface ResizableHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show the grip plate. Default true. */
  withGrip?: boolean;
  /** Its name. Default "Resize {the pane before it}". */
  label?: string;
}
/**
 * The divider between two panes: 1px of line with a grip. The grip is flush at rest, lifts one level when pointed at,
 * and floats at level 3 while held. A window splitter: arrows resize, Home and End go to the limits, Enter collapses.
 */
export function ResizableHandle({ withGrip = true, label, className, ...rest }: ResizableHandleProps) {
  const g = React.useContext(GroupCtx)!;
  const i = React.useContext(IndexCtx);
  const [held, setHeld] = React.useState(false);
  const p = g.panels[i], size = g.sizes[i] ?? 0;
  const horizontal = g.direction === 'horizontal';
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget, rect = g.box.current!.getBoundingClientRect(), span = horizontal ? rect.width : rect.height;
    let last = horizontal ? e.clientX : e.clientY;
    el.setPointerCapture(e.pointerId); setHeld(true);
    const move = (ev: PointerEvent) => { const now = horizontal ? ev.clientX : ev.clientY; g.resize(i, ((now - last) / span) * 100); last = now; };
    const up = () => { setHeld(false); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 5;
    const more = horizontal ? 'ArrowRight' : 'ArrowDown', less = horizontal ? 'ArrowLeft' : 'ArrowUp';
    if (e.key === more || e.key === less) { e.preventDefault(); g.resize(i, e.key === more ? step : -step); }
    else if (e.key === 'Home') { e.preventDefault(); g.setSize(i, p.minSize); }
    else if (e.key === 'End') { e.preventDefault(); g.setSize(i, p.maxSize); }
    else if (e.key === 'Enter') { e.preventDefault(); g.toggle(i); }
  };
  return (
    <div role="separator" tabIndex={0} aria-orientation={horizontal ? 'vertical' : 'horizontal'} aria-controls={p?.id}
      aria-label={label ?? (p?.label ? `Resize ${p.label.toLowerCase()}` : 'Resize')} aria-valuenow={Math.round(size)} aria-valuemin={p?.collapsible ? 0 : p?.minSize} aria-valuemax={p?.maxSize}
      aria-valuetext={size === 0 ? `${p?.label ?? 'Pane'} collapsed` : `${Math.round(size)}%`}
      className={cx('alt-resizable-handle', className)} data-held={held ? '' : undefined} onPointerDown={onPointerDown} onKeyDown={onKeyDown} {...rest}>
      {withGrip && <span className="alt-resizable-grip" aria-hidden="true" />}
    </div>
  );
}
