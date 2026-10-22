import * as React from 'react';
import { cx, useControllable, useOutside, usePresence } from './core';

export interface PileProps<T = unknown> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** How many items the pile holds; defaults to items.length. 1 → no sheets, 2–3 → one, 4–9 → two, 10+ → three. */
  count?: number;
  /** Hover and focus lift the top and fan the sheets. Implied when `items` is set. */
  interactive?: boolean;
  /** The items in the pile. With renderItem, clicking the pile fans these out below it, floating over the page. */
  items?: T[];
  renderItem?: (item: T, state: { index: number }) => React.ReactNode;
  getKey?: (item: T, index: number) => string;
  /** Called when a fanned-out item is clicked. */
  onSelect?: (item: T, index: number) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Tallest the fanned-out list grows before it scrolls. Default 360px. */
  maxHeight?: number | string;
}

/**
 * Quantity as thickness, and a pile you can fan out. Closed, the sheets beneath say roughly how many
 * (the badge says exactly); reaching for it fans them a little. Click it and the items slide out from under
 * the top card over the page below it, each casting its own shadow; click one to choose it; click the top,
 * press Escape or click away and they slide back.
 */
export function Pile<T>({ count, interactive, items, renderItem, getKey, onSelect, open, defaultOpen = false, onOpenChange,
  maxHeight = 360, className, children, ...rest }: PileProps<T>) {
  const n = count ?? items?.length ?? 1;
  const sheets = n <= 1 ? 0 : n <= 3 ? 1 : n <= 9 ? 2 : 3;
  const openable = !!(items && items.length && renderItem);
  const live = interactive || openable;
  const [isOpen, setOpen] = useControllable(open, defaultOpen, onOpenChange);
  const { mounted, state } = usePresence(openable && isOpen, 260);
  const root = React.useRef<HTMLDivElement>(null);
  const top = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const toggle = () => { if (openable) setOpen(!isOpen); };
  const close = React.useCallback(() => setOpen(false), [setOpen]);
  useOutside(root, openable && isOpen, close);
  return (
    <div ref={root} className={cx('alt-pile', live && 'alt-pile-live', className)} data-sheets={sheets} data-open={openable && isOpen ? '' : undefined}
      {...rest}>
      {Array.from({ length: sheets }, (_, i) => <span key={i} className="alt-pile-sheet" aria-hidden="true" style={{ ['--i' as any]: i + 1 }} />)}
      <div ref={top} className="alt-pile-top" tabIndex={live ? 0 : undefined} role={openable ? 'button' : undefined}
        aria-expanded={openable ? isOpen : undefined} aria-controls={openable ? id : undefined}
        onClick={toggle} onKeyDown={(e) => { if (openable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } }}>
        {children}
      </div>
      {n > 1 && <span className="alt-pile-count" aria-label={`${n} items`}>{n}</span>}
      {openable && mounted && (
        <div className="alt-pile-list" id={id} data-state={state}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); top.current?.focus(); } }}>
          <ul className="alt-pile-list-inner" style={{ maxHeight }}>
            {items!.map((it, i) => (
              <li key={getKey ? getKey(it, i) : i}>
                <button type="button" className="alt-pile-item" style={{ ['--i' as any]: Math.min(i, 10) }} onClick={() => onSelect?.(it, i)}>
                  {renderItem!(it, { index: i })}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
