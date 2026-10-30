import * as React from 'react';
import { cx, riseDelay, useIsoLayoutEffect } from './core';

export interface StepperStep {
  /** Stable key. Default: the step's position. */
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
}
export interface StepperProps extends Omit<React.OlHTMLAttributes<HTMLOListElement>, 'onChange'> {
  steps: StepperStep[];
  /** The index of the step being worked on. steps.length means every step is complete. */
  current: number;
  /** Makes completed steps buttons that go back to them. */
  onStepChange?: (index: number) => void;
  /**
   * Default 'horizontal'. 'auto' (#264): horizontal when every step fits on one line in its container, vertical when
   * not, so a phone never shows connectors that lead to the next line.
   */
  orientation?: 'horizontal' | 'vertical' | 'auto';
}

const Tick = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-6.5" pathLength={16} />
  </svg>
);
const word = { done: 'completed', current: 'current', upcoming: 'not started' } as const;

/**
 * A process as a staircase of plates on one ground line, in the breadcrumb's vocabulary. Completed steps are settled into
 * the record: flush plates with a stamped check. The current step is a raised slab with a wall. Steps to come are imprints
 * pressed into the page. Advancing presses the current step down into the record, stamps its check in, then raises the
 * next one out of its imprint.
 */
export function Stepper({ steps, current, onStepChange, orientation: orientationProp = 'horizontal', className, ...rest }: StepperProps) {
  // 'auto' (#264): try horizontal at each width; if the steps wrap, lay them out vertically. Layout, so no motion.
  const list = React.useRef<HTMLOListElement>(null);
  const [width, setWidth] = React.useState(0);
  const [fits, setFits] = React.useState(true);
  React.useEffect(() => {
    const el = list.current?.parentElement;
    if (orientationProp !== 'auto' || !el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [orientationProp]);
  React.useEffect(() => { setFits(true); }, [width, steps.length]);
  useIsoLayoutEffect(() => {
    const items = list.current?.querySelectorAll(':scope > li');
    if (orientationProp !== 'auto' || !fits || !items || items.length < 2) return;
    if ((items[items.length - 1] as HTMLElement).offsetTop > (items[0] as HTMLElement).offsetTop + 2) setFits(false);
  }, [fits, width]);
  const orientation = orientationProp === 'auto' ? (fits ? 'horizontal' : 'vertical') : orientationProp;
  // The motion is derived in the same render that changes the states, so the rise's delay is in place before its
  // transition starts (setting it in an effect would be a frame late and the new step would rise at once).
  const [seen, setSeen] = React.useState(current);
  const [motion, setMotion] = React.useState<{ pressed: number; risen: number; stamp: number; delay: number; key: number } | null>(null);
  const [said, setSaid] = React.useState('');
  if (seen !== current) {
    setSeen(current);
    // Forward: the old step presses down and is stamped, then the new one rises. Back: the old one sinks, the chosen one rises.
    setMotion({ pressed: seen, risen: current, stamp: current > seen ? seen : -1, delay: (current > seen ? 150 : 60) + riseDelay(), key: (motion?.key ?? 0) + 1 });
  }
  React.useEffect(() => {
    if (!motion) return;
    const t = steps[current];
    setSaid(t ? `Step ${current + 1} of ${steps.length}: ${typeof t.title === 'string' ? t.title : ''}` : 'All steps complete');
    const done = setTimeout(() => setMotion(null), 900);
    return () => clearTimeout(done);
  }, [motion?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <ol ref={list} className={cx('alt-stepper', className)} data-orientation={orientation} aria-label={rest['aria-label'] ?? 'Progress'} {...rest}>
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
        const back = state === 'done' && !!onStepChange;
        const rising = motion && motion.risen === i;
        const stamped = motion && motion.stamp === i;
        // One element in every state (a completed step that goes back is a role="button"), so the plate's height animates
        // from state to state instead of being swapped for a new element.
        return (
          <li key={s.id ?? i} className="alt-step-item" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <div className="alt-step" data-state={state} data-motion={rising ? 'rise' : motion && motion.pressed === i ? 'press' : undefined}
              {...(back ? { role: 'button', tabIndex: 0, onClick: () => onStepChange!(i),
                onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStepChange!(i); } } } : {})}
              style={rising ? ({ ['--alt-rise-delay' as any]: motion!.delay + 'ms' } as React.CSSProperties) : undefined}>
              <span className="alt-step-mark" data-stamp={stamped ? (motion!.key % 2 ? 'a' : 'b') : undefined}>{state === 'done' ? <Tick /> : i + 1}</span>
              <span className="alt-step-text">
                <span className="alt-sr">Step {i + 1} of {steps.length}, {word[state]}: </span>
                <span className="alt-step-title">{s.title}</span>
                {s.description && <span className="alt-step-desc">{s.description}</span>}
              </span>
            </div>
            {i < steps.length - 1 && <span className="alt-step-line" aria-hidden="true" data-done={i < current ? '' : undefined} />}
          </li>
        );
      })}
    </ol>
    <span className="alt-sr" aria-live="polite">{said}</span>
    </>
  );
}
