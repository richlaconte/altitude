import * as React from 'react';
import { cx, Icons, Layer, useControllable, useIsoLayoutEffect, useOutside, usePresence } from './core';
import { Button } from './controls';
import { ModalOwner, modalDocument, tabbables, useAltitudeContext } from './modal-state';

const EXIT_3 = 160; // ≈ dur-travel-3 × 0.7
const EXIT_4 = 190; // ≈ dur-travel-4 × 0.7
const EXIT_5 = 220; // ≈ dur-travel-5 × 0.7

/* ───────────────────────── Tooltip ───────────────────────── */

let lastTipClose = 0; // shared warm-up: once one tooltip has shown, neighbours open instantly
/** The shared warm-up, for floating readouts outside this module (a chart's readout): warm if one closed within 400ms. */
export const tipIsWarm = () => Date.now() - lastTipClose < 400;
export const markTipClosed = () => { lastTipClose = Date.now(); };
let openCard: (() => void) | null = null; // the HoverCard currently open, if any

export interface TooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'bottom';
  delay?: number;
  defaultOpen?: boolean;
  children: React.ReactElement<any>;
}
export function Tooltip({ content, side = 'top', delay = 450, defaultOpen = false, children }: TooltipProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [warm, setWarm] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);
  const id = React.useId();
  const { mounted, state } = usePresence(open, EXIT_3);
  const show = () => {
    const isWarm = Date.now() - lastTipClose < 400;
    setWarm(isWarm);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), isWarm ? 0 : delay);
  };
  const hide = () => { window.clearTimeout(timer.current); setOpen((o) => { if (o) lastTipClose = Date.now(); return false; }); };
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <span className="alt-tip-anchor" onPointerEnter={show} onPointerLeave={hide}
      onFocus={() => { window.clearTimeout(timer.current); setWarm(true); setOpen(true); }} onBlur={hide}
      onKeyDown={(e) => { if (e.key === 'Escape') hide(); }}>
      {React.cloneElement(children, { 'aria-describedby': open ? id : undefined })}
      {mounted && <span role="tooltip" id={id} className="alt-tip" data-side={side} data-state={state} data-warm={warm ? '' : undefined}>{content}</span>}
    </span>
  );
}

/* ───────────────────────── Popover ───────────────────────── */

export interface PopoverProps {
  trigger: React.ReactElement<any>;
  children: React.ReactNode;
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (o: boolean) => void;
  side?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end';
  className?: string;
  'aria-label'?: string;
}
export function Popover({ trigger, children, open, defaultOpen = false, onOpenChange, side = 'bottom', align = 'start', className, ...rest }: PopoverProps) {
  const [isOpen, set] = useControllable(open, defaultOpen, onOpenChange);
  const ref = React.useRef<HTMLSpanElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const { mounted, state } = usePresence(isOpen, EXIT_3);
  const close = React.useCallback(() => set(false), [set]);
  useOutside(ref, isOpen, close);
  React.useEffect(() => {
    if (state !== 'open' || !panel.current) return;
    const f = panel.current.querySelector<HTMLElement>('input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])');
    (f || panel.current).focus({ preventScroll: true });
  }, [state]);
  return (
    <span className="alt-pop-anchor" ref={ref}>
      {React.cloneElement(trigger, { 'aria-expanded': isOpen, 'aria-controls': id, 'aria-haspopup': 'dialog', onClick: (e: any) => { trigger.props.onClick?.(e); set(!isOpen); } })}
      {mounted && (
        <div ref={panel} id={id} role="dialog" aria-label={rest['aria-label']} tabIndex={-1} className={cx('alt-pop', className)}
          data-state={state} data-side={side} data-align={align}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); (ref.current?.firstElementChild as HTMLElement)?.focus(); } }}>
          {children}
        </div>
      )}
    </span>
  );
}

/* ───────────────────────── DropdownMenu ───────────────────────── */

export interface MenuItem {
  type?: 'item'; label: React.ReactNode; icon?: React.ReactNode; shortcut?: React.ReactNode; onSelect?: () => void; tone?: 'critical'; disabled?: boolean;
  /** Ephemeral adaptation: predicted items appear at once, the rest fade in over dur-onset. Only worth it when predictions are right most of the time. */
  predicted?: boolean;
}
export type MenuEntry =
  | MenuItem
  | { type: 'separator' }
  | { type: 'label'; label: React.ReactNode };
export interface DropdownMenuProps {
  trigger: React.ReactElement<any>;
  items: MenuEntry[];
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
  defaultOpen?: boolean;
  className?: string;
}
export function DropdownMenu({ trigger, items, align = 'start', side = 'bottom', defaultOpen = false, className }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [active, setActive] = React.useState(-1);
  const [hl, setHl] = React.useState<{ y: number; h: number } | null>(null);
  const anchor = React.useRef<HTMLSpanElement>(null);
  const menu = React.useRef<HTMLDivElement>(null);
  const refs = React.useRef<(HTMLDivElement | null)[]>([]);
  const id = React.useId();
  const { mounted, state } = usePresence(open, EXIT_3);
  const close = React.useCallback(() => { setOpen(false); setActive(-1); }, []);
  useOutside(anchor, open, close);
  const enabled = items.map((it, i) => (!it.type || it.type === 'item') && !(it as any).disabled ? i : -1).filter((i) => i >= 0);

  useIsoLayoutEffect(() => {
    const el = active >= 0 ? refs.current[active] : null;
    setHl(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
  }, [active, mounted]);
  React.useEffect(() => { if (state === 'open') menu.current?.focus({ preventScroll: true }); }, [state]);

  const choose = (i: number) => {
    const it = items[i] as any;
    if (!it || it.disabled) return;
    close();
    (anchor.current?.firstElementChild as HTMLElement)?.focus();
    it.onSelect?.();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const pos = enabled.indexOf(active);
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(enabled[(pos + 1) % enabled.length]); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(enabled[(pos - 1 + enabled.length) % enabled.length]); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(enabled[0]); }
    else if (e.key === 'End') { e.preventDefault(); setActive(enabled[enabled.length - 1]); }
    else if ((e.key === 'Enter' || e.key === ' ') && active >= 0) { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape' || e.key === 'Tab') { close(); (anchor.current?.firstElementChild as HTMLElement)?.focus(); }
  };
  let n = 0;
  const activeTone = active >= 0 ? (items[active] as any).tone : undefined;
  return (
    <span className="alt-pop-anchor" ref={anchor}>
      {React.cloneElement(trigger, {
        'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-controls': id,
        onClick: (e: any) => { trigger.props.onClick?.(e); open ? close() : setOpen(true); },
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); setActive(enabled[0]); } },
      })}
      {mounted && (
        <div ref={menu} id={id} role="menu" tabIndex={-1} className={cx('alt-pop alt-menu', className)} data-state={state} data-side={side} data-align={align}
          data-ephemeral={items.some((it: any) => it.predicted) ? '' : undefined}
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined} onKeyDown={onKeyDown} onPointerLeave={() => setActive(-1)}>
          <span className="alt-menu-hl" aria-hidden="true" data-tone={activeTone}
            style={hl ? { transform: `translateY(${hl.y}px)`, height: hl.h, opacity: 1 } : { opacity: 0 }} />
          {items.map((it, i) => {
            if (it.type === 'separator') return <div key={i} className="alt-menu-sep" role="separator" />;
            if (it.type === 'label') return <div key={i} className="alt-menu-label" style={{ ['--i' as any]: n++ }}>{it.label}</div>;
            const item = it as MenuItem;
            return (
              <div key={i} id={`${id}-${i}`} ref={(el) => { refs.current[i] = el; }} role="menuitem" aria-disabled={item.disabled || undefined}
                className="alt-menu-item" data-tone={item.tone} data-predicted={(item as any).predicted ? '' : undefined} style={{ ['--i' as any]: n++ }}
                onPointerMove={() => !item.disabled && active !== i && setActive(i)} onClick={() => choose(i)}>
                {item.icon && <span className="alt-menu-icon">{item.icon}</span>}
                <span className="alt-menu-text">{item.label}</span>
                {item.shortcut && <span className="alt-menu-shortcut">{item.shortcut}</span>}
              </div>
            );
          })}
        </div>
      )}
    </span>
  );
}

/* ───────────────────────── HoverCard ───────────────────────── */

export interface HoverCardProps {
  /** What you hover or focus: usually a link or an avatar. It must do its own job (navigate, open) without the card. */
  trigger: React.ReactElement<any>;
  children: React.ReactNode;
  /** Default 'bottom'. */
  side?: 'top' | 'bottom';
  /** Default 'start'. */
  align?: 'start' | 'center' | 'end';
  /** Hover intent: how long the pointer must rest before it opens. Default 400ms. */
  openDelay?: number;
  /** How long it stays after the pointer leaves, so the pointer can travel into it. Default 250ms. */
  closeDelay?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}
/**
 * A richer preview that rises from its trigger at level 3, after hover intent or on keyboard focus. It shares Tooltip's
 * warm-up: once one has shown, a neighbour opens at once. Its content is supplementary, never the only way to reach anything.
 */
export function HoverCard({ trigger, children, side = 'bottom', align = 'start', openDelay = 400, closeDelay = 250, open, defaultOpen = false, onOpenChange, className }: HoverCardProps) {
  const [isOpen, set] = useControllable(open, defaultOpen, onOpenChange);
  const { mounted, state } = usePresence(isOpen, EXIT_3);
  const timer = React.useRef<number | undefined>(undefined);
  const closeMe = React.useRef(() => set(false));
  closeMe.current = () => set(false);
  // One preview at a time: opening a card hands over from whichever card is open (warm, so it's instant).
  React.useEffect(() => {
    if (!isOpen) return;
    const mine = () => closeMe.current();
    if (openCard && openCard !== mine) { openCard(); lastTipClose = Date.now(); }
    openCard = mine;
    return () => { if (openCard === mine) openCard = null; };
  }, [isOpen]);
  const show = (delay: number) => {
    window.clearTimeout(timer.current);
    const warm = Date.now() - lastTipClose < 400;
    timer.current = window.setTimeout(() => set(true), warm ? 0 : delay);
  };
  const hide = (delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { set(false); if (isOpen) lastTipClose = Date.now(); }, delay);
  };
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <span className="alt-pop-anchor alt-hovercard-anchor"
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') show(openDelay); }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') hide(closeDelay); }}
      onFocus={() => show(openDelay)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) hide(closeDelay); }}
      onKeyDown={(e) => { if (e.key === 'Escape' && isOpen) { e.stopPropagation(); window.clearTimeout(timer.current); set(false); lastTipClose = Date.now(); } }}>
      {trigger}
      {mounted && (
        <div className={cx('alt-pop alt-hovercard', className)} data-state={state} data-side={side} data-align={align}
          onPointerEnter={() => window.clearTimeout(timer.current)}>
          {children}
        </div>
      )}
    </span>
  );
}

/* ───────────────────────── Modal layers ───────────────────────── */

/** The summit is shared by every provider in the same document. */
export const summitTaken = (doc: Document = document) => !!modalDocument(doc).owners.find(o => o.summit && !o.retired);

export interface ModalOptions {
  open: boolean;
  onDismiss: () => void;
  exitMs: number;
  panel: React.RefObject<HTMLElement | null>;
  modal?: boolean;
  dismissible?: boolean;
  summit?: boolean;
  autoFocus?: boolean;
  focusSelector?: string;
  restoreFocus?: boolean;
  background?: 'recede' | 'stationary';
  returnFocus?: () => HTMLElement | null;
}
export const MODAL_FOCUS = '[data-autofocus], input, textarea, select';
export function useModal({ open, onDismiss, exitMs, panel, modal = true, dismissible = true, summit = false, autoFocus = true,
  focusSelector = MODAL_FOCUS, restoreFocus = autoFocus, background = 'recede', returnFocus }: ModalOptions) {
  const ctx = useAltitudeContext();
  const [rejected, setRejected] = React.useState(false);
  const presence = usePresence(open && !rejected, exitMs);
  const owner = React.useRef<ModalOwner | null>(null);
  const invoker = React.useRef<HTMLElement | null>(null);
  const wasOpen = React.useRef(false);
  const explicitInvoker = React.useRef(false);
  if (open && !wasOpen.current) {
    if (!explicitInvoker.current && typeof document !== 'undefined') invoker.current = document.activeElement as HTMLElement;
    explicitInvoker.current = false;
  }
  wasOpen.current = open;
  const latest = React.useRef({ open, modal, summit, autoFocus, restoreFocus, focusSelector, background, returnFocus, provider: ctx?.provider ?? null });
  latest.current = { open, modal, summit, autoFocus, restoreFocus, focusSelector, background, returnFocus, provider: ctx?.provider ?? null };
  if (owner.current) Object.assign(owner.current, latest.current);
  const rootRef = React.useCallback((root: HTMLDivElement | null) => {
    if (!root) {
      const previous = owner.current;
      if (previous) modalDocument(previous.panel.ownerDocument).remove(previous);
      owner.current = null;
      return;
    }
    if (!panel.current || !latest.current.open) return;
    const captured = invoker.current?.ownerDocument === root.ownerDocument ? invoker.current : root.ownerDocument.activeElement as HTMLElement;
    const next: ModalOwner = { ...latest.current, root, panel: panel.current, invoker: captured, retired: false };
    owner.current = next;
    if (!modalDocument(root.ownerDocument).add(next)) setRejected(true);
  }, [panel]);
  useIsoLayoutEffect(() => {
    if (!open && rejected) setRejected(false);
    const own = owner.current;
    if (own) {
      const state = modalDocument(own.panel.ownerDocument);
      // A handoff retires the root before its exit unmounts. A fresh open during
      // that interval must reacquire ownership; no ref callback will run again.
      if (open && own.retired && !rejected) {
        own.retired = false; own.root.hidden = false; own.lastFocus = null;
        own.invoker = invoker.current?.ownerDocument === own.panel.ownerDocument ? invoker.current : own.panel.ownerDocument.activeElement as HTMLElement;
        if (!state.add(own)) setRejected(true);
      } else state.reconcile();
    }
  });
  const onKeyDown = (e: React.KeyboardEvent) => {
    const own = owner.current;
    if (!own || own.retired || (modal && modalDocument(own.panel.ownerDocument).active !== own)) return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Escape' && dismissible && !e.repeat && open) { e.preventDefault(); e.stopPropagation(); onDismiss(); }
    if (!modal || e.key !== 'Tab') return;
    const controls = tabbables(own.panel);
    const focused = own.panel.ownerDocument.activeElement;
    const i = controls.indexOf(focused as HTMLElement);
    if (!controls.length) { e.preventDefault(); own.panel.focus({ preventScroll: true }); }
    else if (i < 0 || (e.shiftKey ? i === 0 : i === controls.length - 1)) {
      e.preventDefault(); controls[e.shiftKey ? controls.length - 1 : 0].focus({ preventScroll: true });
    }
  };
  return { ...presence, mounted: presence.mounted && !rejected, onKeyDown, rootRef,
    captureInvoker: (el: HTMLElement) => { explicitInvoker.current = true; invoker.current = el; if (owner.current) owner.current.invoker = el; } };
}

/* ───────────────────────── Dialog ───────────────────────── */

export interface DialogProps {
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (o: boolean) => void;
  /** Uncontrolled convenience: an element that opens the dialog. */
  trigger?: React.ReactElement<any>;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Set false for decisions that must be answered: the scrim and Escape won't close it. */
  dismissible?: boolean;
  /** Initial focus: the first field (default), the title, or false for a safe panel fallback until the application moves focus inside. */
  initialFocus?: 'first-field' | 'title' | false;
  /** What 'first-field' looks for. Default '[data-autofocus], input, textarea, select'; the panel itself if nothing matches. */
  focusSelector?: string;
  /** Keep the background in place and remove scrim blur; default 'recede'. Modality is unchanged. */
  background?: 'recede' | 'stationary';
  /** Lazy fallback when the captured invoker can no longer receive focus. */
  returnFocus?: () => HTMLElement | null;
  className?: string;
}
export function Dialog({ open, defaultOpen = false, onOpenChange, trigger, title, description, children, footer, size = 'md', dismissible = true,
  initialFocus = 'first-field', focusSelector = MODAL_FOCUS, background = 'recede', returnFocus, className }: DialogProps) {
  const [isOpen, set] = useControllable(open, defaultOpen, onOpenChange);
  const panel = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const { mounted, state, onKeyDown, rootRef, captureInvoker } = useModal({ open: isOpen, onDismiss: () => set(false), exitMs: EXIT_5, panel, dismissible, summit: true,
    autoFocus: initialFocus !== false, focusSelector: initialFocus === 'title' ? '.alt-dialog-title' : focusSelector, restoreFocus: true, background, returnFocus });

  return (
    <>
      {trigger && React.cloneElement(trigger, { 'aria-haspopup': 'dialog', onClick: (e: any) => { trigger.props.onClick?.(e); captureInvoker(e.currentTarget); set(true); } })}
      {mounted && (
        <Layer>
          <div ref={rootRef} className="alt-dialog-root" data-state={state} data-background={background} onKeyDown={onKeyDown}>
            <div className="alt-scrim" onClick={() => dismissible && set(false)} />
            <div ref={panel} role="dialog" aria-labelledby={`${id}-t`} aria-describedby={description ? `${id}-d` : undefined}
              tabIndex={-1} className={cx('alt-dialog', className)} data-size={size}>
              <div className="alt-dialog-head">
                <h2 className="alt-dialog-title" id={`${id}-t`} tabIndex={initialFocus === 'title' ? -1 : undefined}>{title}</h2>
                {description && <p className="alt-dialog-desc" id={`${id}-d`}>{description}</p>}
              </div>
              {children && <div className="alt-dialog-body">{children}</div>}
              {footer && <div className="alt-dialog-footer">{footer}</div>}
              {dismissible && (
                <Button variant="ghost" size="sm" square aria-label="Close" className="alt-dialog-close" onClick={() => set(false)}><Icons.X /></Button>
              )}
            </div>
          </div>
        </Layer>
      )}
    </>
  );
}

/* ───────────────────────── Toast ───────────────────────── */

export type ToastTone = 'neutral' | 'positive' | 'caution' | 'critical';
export interface ToastOptions { title: React.ReactNode; description?: React.ReactNode; tone?: ToastTone; duration?: number; action?: { label: string; onClick: () => void } }
type ToastItem = ToastOptions & { id: number; leaving?: boolean; entered?: boolean };

let toasts: ToastItem[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const patch = (id: number, p: Partial<ToastItem>) => { toasts = toasts.map((t) => (t.id === id ? { ...t, ...p } : t)); emit(); };

export function toast(input: ToastOptions | string) {
  const opts = typeof input === 'string' ? { title: input } : input;
  const item: ToastItem = { tone: 'neutral', duration: 5000, ...opts, id: ++seq };
  toasts = [item, ...toasts];
  emit();
  requestAnimationFrame(() => requestAnimationFrame(() => patch(item.id, { entered: true })));
  return item.id;
}
toast.dismiss = (id: number) => {
  patch(id, { leaving: true });
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); emit(); }, EXIT_4);
};

const toastIcon = { neutral: Icons.Info, positive: Icons.CircleCheck, caution: Icons.AlertTriangle, critical: Icons.AlertCircle };
const STACK = 3, GAP = 8;

export function Toaster({ className }: { className?: string }) {
  const [, force] = React.useReducer((n) => n + 1, 0);
  const [expanded, setExpanded] = React.useState(false);
  const heights = React.useRef(new Map<number, number>());
  const remaining = React.useRef(new Map<number, number>());
  const [element, setElement] = React.useState<HTMLElement | null>(null);
  const documentState = element ? modalDocument(element.ownerDocument) : null;
  const activeModal = React.useSyncExternalStore(
    React.useCallback((fn) => documentState?.subscribe(fn) ?? (() => {}), [documentState]),
    React.useCallback(() => documentState?.active ?? null, [documentState]), () => null);
  const blocked = !!activeModal;
  React.useEffect(() => { subs.add(force); return () => { subs.delete(force); }; }, []);

  // Keep the remaining lifetime, including while a modal owns the document.
  React.useEffect(() => {
    const liveIds = new Set(toasts.map(t => t.id));
    for (const id of remaining.current.keys()) if (!liveIds.has(id)) remaining.current.delete(id);
    if (expanded || blocked) return;
    const began = performance.now();
    const running = toasts.filter(t => !t.leaving && t.duration! > 0).map(t => {
      const left = remaining.current.get(t.id) ?? t.duration!;
      remaining.current.set(t.id, left);
      return { id: t.id, timer: setTimeout(() => toast.dismiss(t.id), left) };
    });
    return () => running.forEach(({ id, timer }) => {
      clearTimeout(timer); remaining.current.set(id, Math.max(0, (remaining.current.get(id) ?? 0) - (performance.now() - began)));
    });
  });
  React.useEffect(() => {
    if (!blocked || !element || !documentState) return;
    for (const item of toasts.filter(t => !t.leaving)) {
      const text = element.querySelector(`[data-toast-id="${item.id}"] .alt-toast-body`)?.textContent;
      if (text) documentState.announce(item.id, text);
    }
  });

  const live = toasts.filter((t) => !t.leaving);
  const frontH = live[0] ? heights.current.get(live[0].id) || 64 : 64;
  let offset = 0;
  const total = live.slice(0, 5).reduce((a, t) => a + (heights.current.get(t.id) || 64) + GAP, 0);

  return (
    <Layer>
      <section ref={setElement} aria-label="Notifications" aria-live={blocked ? "off" : "polite"} className={cx('alt-toaster', className)}
        style={{ height: expanded ? total : frontH }}
        onPointerEnter={() => setExpanded(true)} onPointerLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setExpanded(false); }}>
        {toasts.map((t) => {
          const i = live.indexOf(t);
          const h = heights.current.get(t.id) || 64;
          let y: string, s: number, o: number, sh: string, behind = false;
          if (t.leaving) { y = `calc(${-offset}px + 8px * var(--alt-travel))`; s = 0.96; o = 0; sh = 'var(--elev-1)'; }
          else if (!t.entered) { y = 'calc(24px * var(--alt-travel))'; s = 0.96; o = 0; sh = 'var(--elev-1)'; }
          else if (expanded) { y = `${-offset}px`; s = 1; o = i < 5 ? 1 : 0; sh = 'var(--elev-4)'; }
          else { y = `calc(${-i * 10}px * var(--alt-travel) - ${i * 2}px)`; s = 1 - i * 0.05; o = i < STACK ? 1 - i * 0.12 : 0; sh = `var(--elev-${Math.max(2, 4 - i)})`; behind = i > 0; }
          if (!t.leaving && i >= 0) offset += h + GAP;
          const I = toastIcon[t.tone || 'neutral'];
          return (
            <div key={t.id} className="alt-toast" data-toast-id={t.id} data-tone={t.tone} data-behind={behind ? '' : undefined} role={blocked ? undefined : t.tone === 'critical' ? 'alert' : 'status'}
              ref={(el) => { if (el) { const nh = el.offsetHeight; if (heights.current.get(t.id) !== nh && !behind) { heights.current.set(t.id, nh); } } }}
              style={{ transform: `translateY(${y}) scale(${s})`, opacity: o, boxShadow: sh, zIndex: 100 - Math.max(i, 0), height: behind ? frontH : undefined, pointerEvents: o ? undefined : 'none' }}>
              <span className="alt-toast-icon"><I size={18} /></span>
              <div className="alt-toast-body">
                <p className="alt-toast-title">{t.title}</p>
                {t.description && <p className="alt-toast-desc">{t.description}</p>}
              </div>
              {t.action && <Button size="sm" variant="secondary" className="alt-toast-action" onClick={() => { t.action!.onClick(); toast.dismiss(t.id); }}>{t.action.label}</Button>}
              <button type="button" className="alt-toast-close" aria-label="Dismiss" onClick={() => toast.dismiss(t.id)}><Icons.X size={14} /></button>
            </div>
          );
        })}
      </section>
    </Layer>
  );
}
