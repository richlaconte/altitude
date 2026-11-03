import * as React from 'react';
import { cx, riseDelay, useIsoLayoutEffect } from './core';
import { Avatar } from './controls';

declare const process: { env: { NODE_ENV?: string } } | undefined;

/* InboxList (#468): the list in a list-and-detail frame, worked through one item at a time. Rows are the record, flush;
   pointing at one lifts it because it opens; the open row is selected (accent-soft, raised one level). Unread is a dot
   and weight 600, never a height. A new row arrives tinted and lifted and settles (afterglow), and never moves the row
   under your pointer or your focus: the list keeps that row where it was on screen. A listbox, single select, where
   selection doesn't follow focus: arrows move, Enter or Space opens. */

interface OptionCtxT { base: string }
const OptionCtx = React.createContext<OptionCtxT | null>(null);

export interface InboxListHandle {
  /** Focus an item's row, as when the detail closes and focus returns to the list. */
  focusItem: (key: string) => void;
}

export interface InboxListProps<T> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onSelect' | 'defaultValue'> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** The items, in your order. Keys that weren't here before arrive with the afterglow. */
  items: T[];
  getKey: (item: T) => string;
  /** An InboxItem for each item. */
  renderItem: (item: T) => React.ReactNode;
  /** The open item's key. Controlled with onSelectedChange, or uncontrolled with defaultSelected. */
  selected?: string | null;
  defaultSelected?: string | null;
  /** Called on Enter, Space or a click, never on the arrow keys, so moving through the list doesn't open every item. */
  onSelectedChange?: (key: string) => void;
  /** Say new items politely as they arrive ("New: Refund for order 4471, from Priya Natarajan"). Default true. */
  announceArrivals?: boolean;
}

export interface InboxItemProps {
  /** What it's about: a ticket's subject, a message's subject. */
  title: React.ReactNode;
  /** Who it's from. */
  from?: React.ReactNode;
  /** One line of what it says, clipped; complete in the row's description. */
  preview?: React.ReactNode;
  /** When, usually a RelativeTime with tooltip={false} (nothing in a row can take focus). */
  time?: React.ReactNode;
  /** Its status in words, usually a Badge plate. */
  status?: React.ReactNode;
  /** Not read yet: a dot, weight 600, and "Unread" first in the row's name. */
  unread?: boolean;
  /** Other people looking at it right now. */
  viewers?: { name: string; presence?: 1 | 2 | 3; replying?: boolean }[];
  className?: string;
}

const optionId = (base: string, part: string) => `${base}-${part}`;

/** One row of an InboxList: fixed slots, so the list can name every row in the same order. */
export function InboxItem({ title, from, preview, time, status, unread = false, viewers, className }: InboxItemProps) {
  const ctx = React.useContext(OptionCtx);
  const base = ctx?.base ?? 'alt-inbox';
  const watching = viewers?.length ? viewers.map((v) => `${v.name} is ${v.replying ? 'replying' : 'viewing'}`).join('. ') + '.' : '';
  return (
    <div className={cx('alt-inbox-item', className)} data-unread={unread ? '' : undefined}>
      <div className="alt-inbox-line">
        {unread ? <span className="alt-inbox-dot" aria-hidden="true" /> : null}
        <span id={optionId(base, 'unread')} className="alt-sr">{unread ? 'Unread.' : ''}</span>
        <span id={optionId(base, 'title')} className="alt-inbox-title">{title}</span>
        {time !== undefined && <span id={optionId(base, 'time')} className="alt-inbox-time">{time}</span>}
      </div>
      {(from !== undefined || status !== undefined || viewers?.length) ? <div className="alt-inbox-line alt-inbox-meta">
        {from !== undefined && <span id={optionId(base, 'from')} className="alt-inbox-from"><span className="alt-sr">from </span>{from}</span>}
        {status !== undefined && <span id={optionId(base, 'status')} className="alt-inbox-status">{status}</span>}
        {viewers?.length ? <span className="alt-inbox-viewers" aria-hidden="true">
          {viewers.slice(0, 3).map((v) => <Avatar key={v.name} name={v.name} size={20} presence={v.presence ?? 1} lamp={false} />)}
        </span> : null}
        <span id={optionId(base, 'viewers')} className="alt-sr">{watching}</span>
      </div> : null}
      {preview !== undefined && <div id={optionId(base, 'preview')} className="alt-inbox-preview">{preview}</div>}
    </div>
  );
}

/** Nearest ancestor that scrolls, or the page. */
function scrollerOf(el: HTMLElement): HTMLElement {
  for (let p: HTMLElement | null = el; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

function InboxListInner<T>({ items, getKey, renderItem, selected: selectedProp, defaultSelected = null, onSelectedChange, announceArrivals = true,
  className, onKeyDown, ...rest }: InboxListProps<T>, ref: React.ForwardedRef<InboxListHandle>) {
  const auto = React.useId().replace(/:/g, '');
  const box = React.useRef<HTMLDivElement>(null);
  const [own, setOwn] = React.useState<string | null>(defaultSelected);
  const selected = selectedProp !== undefined ? selectedProp : own;
  const keys = items.map(getKey);
  const [focusKey, setFocusKey] = React.useState<string | null>(null);
  const stop = focusKey && keys.includes(focusKey) ? focusKey : selected && keys.includes(selected) ? selected : keys[0] ?? null;
  const optionEl = (key: string) => box.current?.querySelector<HTMLElement>(`[data-inbox-key="${CSS.escape(key)}"]`) ?? null;
  const base = (i: number) => `${auto}-o${i}`;

  React.useImperativeHandle(ref, () => ({ focusItem: (key) => { setFocusKey(key); optionEl(key)?.focus(); } }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (key: string) => { setFocusKey(key); if (selectedProp === undefined) setOwn(key); onSelectedChange?.(key); };

  // Arrivals: keys that weren't here at the last render. Up to four arrive with the afterglow (the attention budget);
  // more arrive settled, and one message gives the count.
  const seen = React.useRef<Set<string> | null>(null);
  const [glows, setGlows] = React.useState<Record<string, { gen: 'a' | 'b'; delay: number }>>({});
  const [said, setSaid] = React.useState('');
  // Nothing moves under you: the row under the pointer, or the focused one, keeps its place on screen.
  const hovered = React.useRef<string | null>(null);
  const tops = React.useRef(new Map<string, number>());
  const anchorKey = () => {
    const active = document.activeElement as HTMLElement | null;
    const focused = active && box.current?.contains(active) ? active.closest<HTMLElement>('[data-inbox-key]')?.dataset.inboxKey : undefined;
    return focused ?? hovered.current;
  };
  useIsoLayoutEffect(() => {
    // Keep the anchor row (focused, else under the pointer) where it was at the last render.
    const k = anchorKey(), was = k ? tops.current.get(k) : undefined, el = k ? optionEl(k) : null;
    if (el && was !== undefined) { const shift = el.offsetTop - was; if (shift) scrollerOf(el).scrollTop += shift; }
    tops.current = new Map(Array.from(box.current?.querySelectorAll<HTMLElement>('[data-inbox-key]') ?? []).map((r) => [r.dataset.inboxKey!, r.offsetTop]));

    const now = new Set(keys);
    if (seen.current === null) { seen.current = now; return; }
    const fresh = keys.filter((x) => !seen.current!.has(x));
    seen.current = now;
    if (!fresh.length) return;
    if (fresh.length <= 4) {
      setGlows((g) => {
        const next = { ...g };
        fresh.forEach((x) => { next[x] = { gen: g[x]?.gen === 'a' ? 'b' : 'a', delay: riseDelay() }; });
        return next;
      });
    }
    if (!announceArrivals) return;
    if (fresh.length > 4) { setSaid(`${fresh.length} new items.`); return; }
    const words = fresh.map((x) => {
      const i = keys.indexOf(x), t = document.getElementById(optionId(base(i), 'title'))?.textContent?.trim();
      const f = document.getElementById(optionId(base(i), 'from'))?.textContent?.replace(/^from /, '').trim();
      return t ? `${t}${f ? `, from ${f}` : ''}` : '';
    }).filter(Boolean);
    if (words.length) setSaid(`New: ${words.join('; ')}.`);
  });

  // Rows can't hold anything focusable: a listbox option's children are presentational.
  React.useEffect(() => {
    if (typeof process === 'undefined' || process?.env.NODE_ENV === 'production') return;
    const bad = box.current?.querySelector('[role="option"] :is(a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]))');
    if (bad) console.warn('InboxList: a row holds something focusable (a link, a button, a RelativeTime with its tooltip). A listbox option can\'t contain one: put actions in the detail, and pass RelativeTime tooltip={false}.');
  });

  const move = (to: number) => { const key = keys[Math.max(0, Math.min(keys.length - 1, to))]; if (key) { setFocusKey(key); optionEl(key)?.focus(); } };
  const typed = React.useRef({ text: '', at: 0 });
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || !stop) return;
    const i = keys.indexOf(stop);
    if (e.key === 'ArrowDown') { e.preventDefault(); move(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(keys.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(stop); }
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && /\S/.test(e.key)) {
      // Type-ahead: the next row whose title starts with what was typed in the last half second.
      const t = typed.current, nowMs = performance.now();
      t.text = nowMs - t.at < 500 ? t.text + e.key.toLowerCase() : e.key.toLowerCase(); t.at = nowMs;
      const title = (k: number) => document.getElementById(optionId(base(k), 'title'))?.textContent?.trim().toLowerCase() ?? '';
      const from = t.text.length === 1 ? i + 1 : i;
      for (let n = 0; n < keys.length; n++) { const k = (from + n) % keys.length; if (title(k).startsWith(t.text)) { move(k); break; } }
    }
  };

  return <>
    <div ref={box} role="listbox" aria-orientation="vertical" className={cx('alt-inbox', className)} onKeyDown={onKey}
      onPointerLeave={() => { hovered.current = null; }} {...rest}>
      {items.map((item, i) => {
        const key = keys[i], b = base(i), glow = glows[key];
        const parts = ['unread', 'title', 'from', 'status', 'time', 'viewers'].map((p) => optionId(b, p));
        return (
          <div key={key} role="option" id={optionId(b, 'row')} className="alt-inbox-row" data-inbox-key={key}
            aria-selected={selected === key} data-selected={selected === key ? '' : undefined} tabIndex={key === stop ? 0 : -1}
            aria-labelledby={parts.join(' ')} aria-describedby={optionId(b, 'preview')}
            data-settle={glow?.gen} style={glow?.delay ? ({ '--alt-rise-delay': `${glow.delay}ms` } as React.CSSProperties) : undefined}
            onClick={() => open(key)} onFocus={() => setFocusKey(key)} onPointerEnter={() => { hovered.current = key; }}>
            <OptionCtx.Provider value={{ base: b }}>{renderItem(item)}</OptionCtx.Provider>
          </div>
        );
      })}
    </div>
    <span className="alt-sr" aria-live="polite">{said}</span>
  </>;
}

/** The list in a list-and-detail frame: a queue you work through one item at a time (#468). */
export const InboxList = React.forwardRef(InboxListInner) as <T>(props: InboxListProps<T> & { ref?: React.Ref<InboxListHandle> }) => React.ReactElement;
