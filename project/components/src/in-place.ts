import * as React from 'react';
import { cssMs, useIsoLayoutEffect } from './core';

/* Editing in place: the motion InlineEdit and EditRegion share. Nothing here is exported from the package. */

const cssVar = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();
const travels = (el: Element) => parseFloat(cssVar(el, '--alt-travel') || '1') !== 0;

/** A change of size at one level: dur-travel-3 up to 120px, then a little longer per pixel (capped), so a long push stays readable. */
export const glideMs = (el: Element, distance: number) => {
  const base = cssMs(getComputedStyle(el), '--dur-travel-3', 220);
  return Math.min(base + 140, base + Math.max(0, distance - 120) * 0.9);
};

/** Where a value's text starts: an input's content box, or the first line of text inside anything else. */
export function textOrigin(el: Element) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { x: r.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), y: r.top + r.height / 2 };
  }
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
  const text = walker.nextNode();
  if (text) {
    const range = document.createRange();
    range.selectNodeContents(text);
    const r = range.getClientRects()[0];
    if (r) return { x: r.left, y: r.top + r.height / 2 };
  }
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top + r.height / 2 };
}

type Snapshot = { height: number; slotWidth?: number; values: Map<string, { x: number; y: number }> };

/**
 * Call the returned capture() just before a state change that alters the box. After that render:
 * - the box's own height glides from the old value to the new one, so everything below is pushed continuously, not jumped;
 * - with `widths`, the box's one [data-slot] glides its width, even when the read slot was replaced by the editor's (a
 *   well growing sideways from its text). Only for a slot whose siblings don't depend on its width;
 * - parts marked [data-arrive] fade in as the moving edge reaches them;
 * - with `values`, each [data-field] control whose read value ([data-value-for]) was somewhere else fades in, while
 *   controls whose text lands where their value was simply appear: nothing slides, so nothing seems to jump around.
 * Under reduced motion (--alt-travel 0) the new layout applies at once.
 */
export function useInPlaceMotion(box: React.RefObject<HTMLElement | null>, { widths = false, values = false } = {}) {
  const snap = React.useRef<Snapshot | null>(null);
  const capture = () => {
    const el = box.current;
    if (!el) return;
    snap.current = {
      height: el.getBoundingClientRect().height,
      slotWidth: widths ? el.querySelector('[data-slot]')?.getBoundingClientRect().width : undefined,
      values: new Map(values ? [...el.querySelectorAll<HTMLElement>('[data-value-for]')].map((v) => [v.dataset.valueFor!, textOrigin(v)] as const) : []),
    };
  };
  useIsoLayoutEffect(() => {
    const was = snap.current, el = box.current;
    snap.current = null;
    if (!was || !el || typeof el.animate !== 'function') return;
    for (const a of el.getAnimations()) if (a.id === 'alt-glide' && (a.effect as KeyframeEffect | null)?.target === el) a.cancel();
    if (!travels(el)) return;
    const top = el.getBoundingClientRect().top, to = el.getBoundingClientRect().height;
    const distance = Math.abs(to - was.height), duration = glideMs(el, distance);
    const easing = cssVar(el, to >= was.height ? '--ease-glide' : '--ease-sink') || 'ease';
    if (distance >= 1) {
      // Clipped at the moving bottom edge only, and with clip-path rather than overflow, so a popup opened mid-glide (a
      // Select's list) still measures its room against the page, and the box's own shadow and focus rings stay whole.
      const clip = 'inset(-32px -32px 0 -32px)';
      el.animate([{ height: was.height + 'px', clipPath: clip }, { height: to + 'px', clipPath: clip }], { duration: duration * (to >= was.height ? 1 : 0.7), easing }).id = 'alt-glide';
    }
    if (widths) {
      const before = was.slotWidth;
      const slot = el.querySelector<HTMLElement>('[data-slot]');
      if (slot && before !== undefined) {
        const now = slot.getBoundingClientRect().width;
        if (Math.abs(now - before) >= 1) slot.animate([{ flex: '0 0 auto', width: before + 'px' }, { flex: '0 0 auto', width: now + 'px' }], { duration, easing });
      }
    }
    if (values && was.values.size) for (const control of el.querySelectorAll<HTMLElement>('[data-field]')) {
      const from = was.values.get(control.dataset.field!);
      if (!from) continue;
      const now = textOrigin(control);
      if (Math.abs(now.x - from.x) <= 4 && Math.abs(now.y - from.y) <= 24) continue;
      const part = control.closest<HTMLElement>('.alt-input, .alt-select, .alt-switch-row, .alt-checkbox-row') ?? control;
      part.animate([{ opacity: 0 }, { opacity: 1 }], { duration: Math.min(duration, 200), delay: 40, easing: 'linear', fill: 'backwards' });
    }
    if (to > was.height + 1) for (const part of el.querySelectorAll<HTMLElement>('[data-arrive]')) {
      const at = Math.max(0, Math.min(1, (part.getBoundingClientRect().top - top - was.height) / (to - was.height)));
      part.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: duration * at * 0.85, easing: 'linear', fill: 'backwards' });
    }
  });
  return capture;
}

/** A polite status for assistive technology, cleared after dur-linger so nothing lingers in the accessibility tree. */
export function useLingeringStatus() {
  const [text, setText] = React.useState('');
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const say = React.useCallback((next: string) => {
    setText(next);
    clearTimeout(timer.current);
    if (next) timer.current = setTimeout(() => setText(''), 2000);
  }, []);
  return [text, say] as const;
}
