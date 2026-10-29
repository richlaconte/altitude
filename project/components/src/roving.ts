import * as React from 'react';
import { useIsoLayoutEffect } from './core';

/* Roving focus: a group of controls with one tab stop, whose arrow keys move between them (the APG toolbar and radio
   group patterns). Shared by Toolbar and ToggleGroup. Nothing here is exported from the package. */

/** True inside a roving container: its buttons mark themselves as items (data-roving-item). */
export const RovingCtx = React.createContext(false);

/** What a control looks like when a toolbar moves it into its "More" menu. */
export type OverflowEntry = { label?: string; onSelect: () => void; checked?: boolean; disabled?: boolean };
/** Set by a Toolbar with overflow="menu": its controls register how to show themselves in the menu. */
export const OverflowCtx = React.createContext<React.MutableRefObject<Map<HTMLElement, OverflowEntry>> | null>(null);
/** Registers a control (by its element) with the nearest overflowing Toolbar. The entry is read when the menu renders. */
export function useOverflowEntry(el: React.RefObject<HTMLElement | null>, entry: OverflowEntry) {
  const registry = React.useContext(OverflowCtx);
  useIsoLayoutEffect(() => { if (registry && el.current) registry.current.set(el.current, entry); });
  React.useEffect(() => { const node = el.current; return () => { if (registry && node) registry.current.delete(node); }; }, [registry, el]);
}
/** One ref for a forwarded ref and our own. */
export function useMergedRef<T>(forwarded: React.ForwardedRef<T>) {
  const own = React.useRef<T | null>(null);
  const set = React.useCallback((el: T | null) => {
    own.current = el;
    if (typeof forwarded === 'function') forwarded(el); else if (forwarded) forwarded.current = el;
  }, [forwarded]);
  return [own, set] as const;
}
/** A control's name for a menu: its aria-label, else its text. */
export const nameOf = (el: HTMLElement | null) => el?.getAttribute('aria-label') || el?.textContent?.trim() || '';

/** The items a roving container owns: marked with data-roving-item, not disabled, not inside a nested roving container. */
const itemsOf = (box: HTMLElement) => [...box.querySelectorAll<HTMLElement>('[data-roving-item]')]
  .filter((el) => el.closest('[data-roving]') === box && !(el as HTMLButtonElement).disabled);

export interface RovingOptions {
  orientation?: 'horizontal' | 'vertical';
  /** Off: the items keep their own tab stops (a ToggleGroup inside a Toolbar leaves roving to the Toolbar). */
  enabled?: boolean;
  /** Moving also chooses (a radio group): called with the item focus moved to. */
  onMove?: (el: HTMLElement) => void;
  /** The item that holds the tab stop when focus hasn't been in the group yet (the chosen one). Default the first. */
  initial?: (box: HTMLElement) => HTMLElement | null | undefined;
}
/**
 * Spread the result onto the container. One item holds tabIndex 0: the last one focused, so returning to the group
 * lands where you left it.
 */
export function useRoving<T extends HTMLElement>({ orientation = 'horizontal', enabled = true, onMove, initial }: RovingOptions = {}) {
  const ref = React.useRef<T>(null);
  const last = React.useRef<HTMLElement | null>(null);
  useIsoLayoutEffect(() => {
    const box = ref.current;
    if (!box || !enabled) return;
    const items = itemsOf(box);
    const current = (last.current && items.includes(last.current) ? last.current : null) ?? initial?.(box) ?? items[0];
    items.forEach((el) => { el.tabIndex = el === current ? 0 : -1; });
  });
  if (!enabled) return { ref };
  const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight', prev = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
  return {
    ref,
    'data-roving': '',
    'aria-orientation': orientation,
    onFocus: (e: React.FocusEvent) => {
      const box = ref.current, el = (e.target as HTMLElement).closest<HTMLElement>('[data-roving-item]');
      if (!box || !el || el.closest('[data-roving]') !== box) return;
      last.current = el;
      itemsOf(box).forEach((it) => { it.tabIndex = it === el ? 0 : -1; });
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      const box = ref.current;
      if (!box || ![next, prev, 'Home', 'End'].includes(e.key)) return;
      const items = itemsOf(box), at = items.indexOf(document.activeElement as HTMLElement);
      if (at < 0) return;
      const to = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (at + (e.key === next ? 1 : -1) + items.length) % items.length;
      e.preventDefault();
      items[to].focus();
      onMove?.(items[to]);
    },
  };
}
