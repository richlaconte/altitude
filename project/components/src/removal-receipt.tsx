import * as React from 'react';
import { cx, DepthProps, Icons, Spinner, useDepth, useIsoLayoutEffect } from './core';
import { modalDocument, tabbables } from './modal-state';

/*
 * Left in place, then closed. An item that leaves its list shows the result in its own slot, at the height it had, so
 * nothing moves when it goes. The receipt holds for dur-linger (paused while it's pointed at, focused or under a
 * modal, and waiting while a mouse is still over the list), lifts off as an Alert does, and only then is the gap
 * glided closed. Receipts that come due within the attention-budget window close together, as one change.
 */

const ms = (cs: CSSStyleDeclaration, name: string, fallback: number) => parseFloat(cs.getPropertyValue(name)) || fallback;
const BATCH = 250;
const TICK = 100;
interface Live { remaining: () => number | null; close: () => void }
const live = new Set<Live>();
// The last pointer's type, so a hover already in place when the hold starts counts, except after a tap (touch has no hover).
let lastPointer = '';
const watchPointer = (doc: Document) => {
  if ((doc as any).__altReceiptPointer) return;
  (doc as any).__altReceiptPointer = true;
  doc.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; }, true);
  doc.addEventListener('pointermove', (e) => { lastPointer = e.pointerType; }, true);
};

/**
 * Glides a slot shut: its height, padding, margins and borders to nothing over `duration` (a token, default
 * dur-travel-3) on ease-glide, then calls done. Under reduced motion it calls done at once. Returns a cancel.
 */
export function glideShut(el: HTMLElement, done: () => void, duration = '--dur-travel-3'): () => void {
  const cs = getComputedStyle(el);
  if (parseFloat(cs.getPropertyValue('--alt-travel')) === 0) { done(); return () => {}; }
  const glide = el.animate([box(el, cs), NOTHING], { duration: ms(cs, duration, 220), easing: cs.getPropertyValue('--ease-glide').trim() || 'ease', fill: 'forwards' });
  glide.onfinish = done;
  return () => glide.cancel();
}
// A slot's whole height, and nothing: padding, margins and borders travel with it, so it neither jumps nor leaves a sliver.
const box = (el: HTMLElement, cs: CSSStyleDeclaration) => ({ height: el.offsetHeight - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth) - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) + 'px',
  minHeight: '0px', paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: cs.marginTop, marginBottom: cs.marginBottom,
  borderTopWidth: cs.borderTopWidth, borderBottomWidth: cs.borderBottomWidth, overflow: 'hidden', boxSizing: 'content-box' });
const NOTHING = { height: '0px', minHeight: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', overflow: 'hidden', boxSizing: 'content-box' };

export interface RemovalReceiptProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'>, Pick<DepthProps, 'settle'> {
  /** The slot's element. Use `li` inside a list. Default `div`. */
  as?: 'div' | 'li' | 'section' | 'article';
  /** false: the item itself (children). true: the receipt in the item's slot, held, then closed. */
  removed: boolean;
  /** The write isn't confirmed yet: the receipt hovers as pending and the hold hasn't started. */
  pending?: boolean;
  /** What happened, in past tense: “Brand guidelines.pdf archived.” Announced politely when it appears. */
  title?: React.ReactNode;
  /** Undo, a route to where the item went. Keep it to one or two buttons. */
  action?: React.ReactNode;
  /** critical: the result changed under you (an Undo that's no longer valid). */
  tone?: 'neutral' | 'critical';
  icon?: React.ReactNode;
  /** How long the receipt holds before it closes, in ms. Default dur-linger. */
  hold?: number;
  /** The gap has closed. Drop the item from your list here. */
  onClosed?: () => void;
  /** Where focus goes when it's inside the slot as it closes and no neighbouring slot has anything to focus. */
  focusFallback?: () => HTMLElement | null;
  /** When mounted, the slot glides open from nothing (an item brought back from elsewhere), then settles. */
  arrive?: boolean;
}

/** An item's slot that keeps its place when the item leaves: the result shows where the item was, then the gap closes. */
export function RemovalReceipt({ as = 'div', removed, pending = false, title, action, tone = 'neutral', icon, hold, onClosed,
  focusFallback, arrive = false, settle, className, style, children, ...rest }: RemovalReceiptProps) {
  const ref = React.useRef<HTMLElement | null>(null);
  const height = React.useRef(0);
  const [phase, setPhase] = React.useState<'held' | 'leaving'>('held');
  const [restored, setRestored] = React.useState(0);
  const wasRemoved = React.useRef(removed);
  const closed = React.useRef(onClosed);
  closed.current = onClosed;
  const fallback = React.useRef(focusFallback);
  fallback.current = focusFallback;
  const { style: depthStyle, ...depth } = useDepth({ settle: restored || settle, status: removed && pending ? 'pending' : undefined });

  React.useEffect(() => { if (ref.current) watchPointer(ref.current.ownerDocument); }, []);
  // The item's own height, measured while it's there, becomes the receipt's: the slot doesn't change shape.
  useIsoLayoutEffect(() => {
    if (!removed && ref.current) height.current = ref.current.getBoundingClientRect().height;
  });
  React.useEffect(() => {
    if (wasRemoved.current && !removed) { setPhase('held'); setRestored((n) => n + 1); }
    wasRemoved.current = removed;
  }, [removed]);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!arrive || !el) return;
    // The afterglow is a tint, so it stays under reduced motion; only the glide open is travel.
    setRestored((n) => n + 1);
    const cs = getComputedStyle(el);
    if (parseFloat(cs.getPropertyValue('--alt-travel')) === 0) return;
    const open = el.animate([{ ...NOTHING, opacity: 0 }, { ...box(el, cs), opacity: 1 }],
      { duration: ms(cs, '--dur-travel-3', 220), easing: cs.getPropertyValue('--ease-glide').trim() || 'ease' });
    // StrictMode runs this twice: the second run must measure the slot, not the first run's opening frame.
    return () => open.cancel();
  // Only on mount: arriving is how the slot came to be, not a state it returns to.
  }, []);

  // Hold, then close.
  React.useEffect(() => {
    const el = ref.current;
    if (!removed || pending || phase !== 'held' || !el) return;
    const cs = getComputedStyle(el);
    const length = hold ?? ms(cs, '--dur-linger', 2000), cap = ms(cs, '--dur-settle', 8000);
    const doc = el.ownerDocument, list = el.parentElement;
    watchPointer(doc);
    const hovered = (t: Element | null) => !!t && lastPointer !== 'touch' && t.matches(':hover');
    let over = hovered(el), overList = hovered(list), elapsed = 0, last = performance.now();
    const began = last;
    const pointer = (set: (v: boolean) => void, v: boolean) => (e: PointerEvent) => { if (e.pointerType !== 'touch') set(v); };
    const on: Array<[EventTarget, string, EventListener]> = [
      [el, 'pointerenter', pointer((v) => { over = v; }, true) as EventListener],
      [el, 'pointerleave', pointer((v) => { over = v; }, false) as EventListener],
    ];
    if (list) on.push([list, 'pointerenter', pointer((v) => { overList = v; }, true) as EventListener],
      [list, 'pointerleave', pointer((v) => { overList = v; }, false) as EventListener]);
    on.forEach(([t, n, f]) => t.addEventListener(n, f));
    const paused = () => over || el.contains(doc.activeElement) || !!modalDocument(doc).active;
    const entry: Live = {
      remaining: () => (paused() ? null : Math.max(0, length - elapsed)),
      close: () => { live.delete(entry); setPhase('leaving'); },
    };
    live.add(entry);
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!paused()) elapsed += now - last;
      last = now;
      if (elapsed < length || paused()) return;
      // A mouse still over the list may be reaching for the next row: wait for it to leave, up to dur-settle.
      if (overList && now - began < cap) return;
      entry.close();
      for (const other of Array.from(live)) { const r = other.remaining(); if (r !== null && r <= BATCH) other.close(); }
    }, TICK);
    return () => { window.clearInterval(timer); live.delete(entry); on.forEach(([t, n, f]) => t.removeEventListener(n, f)); };
  }, [removed, pending, phase, hold]);

  // Lift off, then glide the gap closed.
  React.useEffect(() => {
    const el = ref.current;
    if (phase !== 'leaving' || !el) return;
    const doc = el.ownerDocument;
    if (el.contains(doc.activeElement)) {
      const near = [el.nextElementSibling, el.previousElementSibling].map((s) => (s instanceof HTMLElement ? tabbables(s)[0] : undefined)).find(Boolean);
      (near ?? fallback.current?.() ?? null)?.focus({ preventScroll: true });
    }
    const lift = ms(getComputedStyle(el), '--dur-travel-3', 220) * 0.7;
    let cancel: (() => void) | undefined;
    const timer = window.setTimeout(() => { cancel = glideShut(el, () => closed.current?.()); }, lift);
    return () => { window.clearTimeout(timer); cancel?.(); };
  }, [phase]);

  const showing = removed;
  return React.createElement(as, {
    ref, className: cx('alt-receipt', className), 'data-removed': showing ? '' : undefined, 'data-leaving': showing && phase === 'leaving' ? '' : undefined,
    'data-tone': showing ? tone : undefined, ...depth, ...rest,
    style: { ...depthStyle, ...(showing && height.current ? { minHeight: height.current } : null), ...style },
  },
    !showing && <div className="alt-receipt-item">{children}</div>,
    // Present from the first render, so what's put in it is announced.
    <div className="alt-receipt-note" role="status" aria-live="polite" aria-atomic="true">
      {showing && <>
        <span className="alt-receipt-icon" aria-hidden="true">{pending ? <Spinner size={16} /> : icon ?? (tone === 'critical' ? <Icons.AlertCircle size={16} /> : <Icons.Check size={16} />)}</span>
        <span className="alt-receipt-title">{title}</span>
      </>}
    </div>,
    showing && action && !pending && <div className="alt-receipt-action">{action}</div>,
  );
}
