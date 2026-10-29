import * as React from 'react';
import { cx, Icons, Layer, ModePlate, PrimaryScope, useApproach, useControllable, useIsoLayoutEffect } from './core';
import { Button } from './controls';
import { useModal } from './overlays';

const EXIT_4 = 190; // ≈ dur-travel-4 × 0.7

type SheetCtxT = { titleId: string; descId: string; setTitled: (on: boolean) => void; setDescribed: (on: boolean) => void };
const SheetCtx = React.createContext<SheetCtxT | null>(null);

export interface SheetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Uncontrolled convenience: an element that opens the sheet. */
  trigger?: React.ReactElement<any>;
  /** The edge it's anchored to. Default 'right'. */
  side?: 'right' | 'left' | 'bottom';
  /** Width: sm 360, md 440, lg 560px (a bottom sheet: 480, 720, 960px). Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** false: a side panel that doesn't block the page; no scrim, no receding page, no focus trap. Default true. */
  modal?: boolean;
  /** false: only your own controls close it (no Escape, scrim, close button or drag). Default true. */
  dismissible?: boolean;
}

/**
 * A large sheet laid over the page at level 4, anchored to an edge. It rises at that edge (16px of travel at most,
 * a fade, its shadow growing from elev-1 to elev-4) while the page recedes behind it; closing lifts it off.
 */
export function Sheet({ open, defaultOpen = false, onOpenChange, trigger, side = 'right', size = 'md', modal = true, dismissible = true,
  className, style, children, ...rest }: SheetProps) {
  const [isOpen, set] = useControllable(open, defaultOpen, onOpenChange);
  const panel = React.useRef<HTMLDivElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const inner = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const [titled, setTitled] = React.useState(false);
  const [described, setDescribed] = React.useState(false);
  const [edges, setEdges] = React.useState({ top: false, bottom: false });
  const [drag, setDrag] = React.useState<{ dy: number; leaving?: boolean } | null>(null);
  const pull = React.useRef<{ y: number; t: number } | null>(null);
  // Layer mounts its portal a render later; measuring waits for the panel to exist.
  const [panelEl, setPanelEl] = React.useState<HTMLDivElement | null>(null);
  const panelRef = React.useCallback((el: HTMLDivElement | null) => { (panel as React.MutableRefObject<HTMLDivElement | null>).current = el; setPanelEl(el); }, []);
  // The document's active owner decides whether this Sheet can take focus.
  // A Sheet below a summit stays suspended without consulting another document.
  const close = React.useCallback(() => set(false), [set]);
  const { mounted, state, onKeyDown, rootRef, captureInvoker } = useModal({ open: isOpen, onDismiss: close, exitMs: EXIT_4, panel, modal, dismissible });
  useApproach(side === 'bottom' && dismissible);
  React.useEffect(() => { if (isOpen) setDrag(null); }, [isOpen]);

  const measure = React.useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const top = el.scrollTop > 1, bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
  }, []);
  useIsoLayoutEffect(() => {
    if (!panelEl) return;
    measure();
    const ro = new ResizeObserver(measure);
    if (scroller.current) ro.observe(scroller.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [panelEl, measure]);

  // A bottom sheet can be pulled down by its finger pull; past a third of its height (or flicked), it goes.
  const onPullDown = (e: React.PointerEvent) => {
    if (!dismissible || e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pull.current = { y: e.clientY, t: performance.now() };
    setDrag({ dy: 0 });
  };
  const onPullMove = (e: React.PointerEvent) => {
    const p = pull.current;
    if (!p) return;
    const raw = e.clientY - p.y;
    setDrag({ dy: raw > 0 ? raw : Math.max(-8, raw / 4) });
  };
  const onPullUp = (e: React.PointerEvent) => {
    const p = pull.current;
    pull.current = null;
    if (!p) return;
    const dy = e.clientY - p.y, v = dy / Math.max(1, performance.now() - p.t), h = panel.current?.offsetHeight || 320;
    if (dy > Math.min(160, h / 3) || (dy > 24 && v > 0.6)) { setDrag({ dy, leaving: true }); close(); } else setDrag(null);
  };

  const ctx = React.useMemo<SheetCtxT>(() => ({ titleId: `${id}-t`, descId: `${id}-d`, setTitled, setDescribed }), [id]);
  const dragging = !!drag && !drag.leaving && !!pull.current;
  const dragStyle: React.CSSProperties | undefined = drag
    ? drag.leaving ? { transform: `translateY(${drag.dy + 24}px)` } : { transform: `translateY(${drag.dy}px)`, transition: dragging ? 'none' : undefined }
    : undefined;
  return (
    <>
      {trigger && React.cloneElement(trigger, {
        'aria-haspopup': 'dialog', 'aria-expanded': isOpen,
        onClick: (e: any) => { trigger.props.onClick?.(e); captureInvoker(e.currentTarget); set(modal ? true : !isOpen); },
      })}
      {mounted && (
        <Layer>
          <SheetCtx.Provider value={ctx}>
            <div ref={rootRef} className="alt-sheet-root" data-state={state} data-exit={!isOpen ? '' : undefined} data-modal={modal ? '' : undefined} onKeyDown={onKeyDown}>
              {modal && <div className="alt-scrim" onClick={() => dismissible && close()} />}
              <div ref={panelRef} role="dialog" aria-labelledby={titled ? ctx.titleId : undefined}
                aria-describedby={described ? ctx.descId : undefined} tabIndex={-1} className={cx('alt-sheet', className)}
                data-side={side} data-size={size} data-top={edges.top ? '' : undefined} data-bottom={edges.bottom ? '' : undefined}
                data-dragging={dragging ? '' : undefined} style={{ ...style, ...dragStyle }} {...rest}>
                {side === 'bottom' && dismissible && (
                  <span className="alt-sheet-pull" aria-hidden="true" data-approach="48"
                    onPointerDown={onPullDown} onPointerMove={onPullMove} onPointerUp={onPullUp} onPointerCancel={onPullUp} />
                )}
                <div className="alt-sheet-scroll" ref={scroller} onScroll={measure}>
                  <div className="alt-sheet-inner" ref={inner}><PrimaryScope name="sheet">{children}</PrimaryScope></div>
                </div>
                {dismissible && (
                  <Button variant="ghost" size="sm" square aria-label="Close" className="alt-sheet-close" onClick={close}><Icons.X /></Button>
                )}
              </div>
            </div>
          </SheetCtx.Provider>
        </Layer>
      )}
    </>
  );
}

/** The title block. It stays at the top while the sheet scrolls, and rises once content passes under it. */
export function SheetHeader({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('alt-sheet-header', className)} {...p}><ModePlate />{children}</div>;
}
export function SheetTitle({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) {
  const c = React.useContext(SheetCtx);
  React.useEffect(() => { c?.setTitled(true); return () => c?.setTitled(false); }, [c]);
  return <h2 id={c?.titleId} className={cx('alt-sheet-title', className)} {...p} />;
}
export function SheetDescription({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) {
  const c = React.useContext(SheetCtx);
  React.useEffect(() => { c?.setDescribed(true); return () => c?.setDescribed(false); }, [c]);
  return <p id={c?.descId} className={cx('alt-sheet-desc', className)} {...p} />;
}
/** Actions, right-aligned. It stays at the bottom; where content continues beneath it, its top edge curves away. */
export function SheetFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('alt-sheet-footer', className)} {...p} />;
}
