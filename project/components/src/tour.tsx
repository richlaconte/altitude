import * as React from 'react';
import { cx, Icons, Layer, useControllable, useIsoLayoutEffect } from './core';
import { Button } from './controls';

/* ───────────────────────── Tour ───────────────────────── */

export interface TourStep {
  /** What it points at: a CSS selector or an element. */
  target: string | HTMLElement | null;
  title: string;
  body?: React.ReactNode;
}
export interface TourProps {
  steps: TourStep[];
  /** Whether it's showing. Start it by setting this (or defaultOpen); it ends with onFinish. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called once, when the last step's Done is pressed ('done') or the tour is skipped or dismissed ('skipped'). */
  onFinish?: (how: 'done' | 'skipped') => void;
  onStepChange?: (index: number) => void;
}

const find = (t: TourStep['target']) => (typeof t === 'string' ? document.querySelector<HTMLElement>(t) : t);

/**
 * A few steps pointing at parts of the interface, without taking it over. One step at a time floats at level 3 beside
 * its target, which is marked with a 2px accent-ink ring (a ring, not a lift: it may not be something you press). It
 * never dims the page (receding is the summit's privilege) and isn't modal: the target stays usable.
 */
export function Tour({ steps, open, defaultOpen = false, onOpenChange, onFinish, onStepChange }: TourProps) {
  const [isOpen, setOpen] = useControllable(open, defaultOpen, onOpenChange);
  const [i, setI] = React.useState(0);
  const [pos, setPos] = React.useState<{ top: number; left: number; side: 'below' | 'above' } | null>(null);
  const card = React.useRef<HTMLDivElement>(null);
  const returnTo = React.useRef<HTMLElement | null>(null);
  const id = React.useId();
  const step = steps[i];

  React.useEffect(() => { if (isOpen) { returnTo.current = document.activeElement as HTMLElement; setI(0); } }, [isOpen]);
  const end = (how: 'done' | 'skipped') => { setOpen(false); onFinish?.(how); requestAnimationFrame(() => returnTo.current?.focus?.()); };
  const go = (n: number) => { setI(n); onStepChange?.(n); };

  // The target: marked with a ring and described by the step while it's showing; scrolled into view if it's off screen.
  useIsoLayoutEffect(() => {
    if (!isOpen || !step) return;
    const el = find(step.target);
    if (!el) return;
    const r0 = el.getBoundingClientRect();
    if (r0.bottom < 0 || r0.top > innerHeight) el.scrollIntoView({ block: 'center' });
    el.setAttribute('data-tour-target', '');
    const had = el.getAttribute('aria-describedby');
    el.setAttribute('aria-describedby', [had, `${id}-b`].filter(Boolean).join(' '));
    const place = () => {
      const r = el.getBoundingClientRect(), h = card.current?.offsetHeight ?? 160, w = card.current?.offsetWidth ?? 300;
      const below = r.bottom + 12 + h < innerHeight || r.top - 12 - h < 0;
      setPos({ top: below ? r.bottom + 12 : r.top - 12 - h, left: Math.max(8, Math.min(innerWidth - w - 8, r.left)), side: below ? 'below' : 'above' });
    };
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);
      el.removeAttribute('data-tour-target');
      if (had) el.setAttribute('aria-describedby', had); else el.removeAttribute('aria-describedby');
    };
  }, [isOpen, i, step]);
  React.useEffect(() => { if (isOpen && pos) card.current?.focus({ preventScroll: true }); }, [isOpen, i, !!pos]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); end('skipped'); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !step) return null;
  const last = i === steps.length - 1;
  return (
    <Layer>
      {/* Keyed by step: moving on lifts this one off and the next rises at its target; nothing flies across the screen. */}
      <div key={i} ref={card} role="dialog" aria-modal="false" aria-labelledby={`${id}-t`} aria-describedby={`${id}-b`} tabIndex={-1}
        className="alt-tour" data-side={pos?.side} style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}>
        <p className="alt-tour-count">Step {i + 1} of {steps.length}</p>
        <h2 className="alt-tour-title" id={`${id}-t`}>{step.title}</h2>
        {step.body && <div className="alt-tour-body" id={`${id}-b`}>{step.body}</div>}
        <div className="alt-tour-foot">
          <span className="alt-tour-dots" aria-hidden="true">{steps.map((_, n) => <i key={n} data-on={n === i ? '' : undefined} />)}</span>
          <Button size="sm" variant="ghost" onClick={() => end('skipped')}>Skip tour</Button>
          {i > 0 && <Button size="sm" variant="secondary" onClick={() => go(i - 1)}>Back</Button>}
          <Button size="sm" variant="primary" onClick={() => (last ? end('done') : go(i + 1))}>{last ? 'Done' : 'Next'}</Button>
        </div>
        <Button size="sm" variant="ghost" square className="alt-tour-close" aria-label="End tour" onClick={() => end('skipped')}><Icons.X size={14} /></Button>
      </div>
    </Layer>
  );
}
