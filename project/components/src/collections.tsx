import * as React from 'react';
import { cx, Icons, riseDelay, useControllable, useDepth, useIsoLayoutEffect } from './core';
import { Badge, Button, Checkbox } from './controls';
import { Pile } from './pile';
import { Arrive, Await, hint, isPromise, Promised, readPromised, SkeletonOption, useArrival, useHasWaited, useReportWaiting } from './suspense';

/* ───────────────────────── shared: carrying things to their new places (FLIP) ───────────────────────── */

/** Positions recorded at the moment of a drop (where things visibly were), used instead of the last layout's. */
const dropSnapshots = new WeakMap<HTMLElement, Map<string, { x: number; y: number }>>();
const ms = (cs: CSSStyleDeclaration, name: string, fallback: number) => parseFloat(cs.getPropertyValue(name)) || fallback;

/**
 * Where an element sits in the page, from layout offsets: transforms (a lift, a drag, a running animation) don't count,
 * so nothing has to be cancelled to measure. Scroll offsets along the way are subtracted.
 */
function pagePlace(el: HTMLElement) {
  let x = 0, y = 0;
  for (let n: HTMLElement | null = el; n;) {
    x += n.offsetLeft; y += n.offsetTop;
    const p = n.offsetParent as HTMLElement | null;
    if (p) { x -= p.scrollLeft; y -= p.scrollTop; }
    n = p;
  }
  return { x, y };
}
/** Where an element sits relative to `host`. Both are measured from the page, so it holds whichever offset parent each has
 *  (a row made position: relative while it's held reports to the scroll area instead of the table). */
function placeIn(el: HTMLElement, host: HTMLElement) {
  const a = pagePlace(el), b = pagePlace(host);
  return { x: a.x - b.x, y: a.y - b.y };
}
/**
 * After every commit, items (matched by `selector`, keyed by `attr`) whose place changed are carried there from where
 * they were, instead of jumping (FLIP). Positions are measured in `host`, so moves between containers travel too.
 */
function useCarry(host: React.RefObject<HTMLElement | null>, selector: string, attr: string, durToken = '--dur-travel-3') {
  const prev = React.useRef<Map<string, { x: number; y: number }> | null>(null);
  useIsoLayoutEffect(() => {
    const root = host.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(selector));
    const now = new Map<string, { x: number; y: number }>();
    els.forEach((el) => now.set(el.getAttribute(attr)!, placeIn(el, root)));
    const dropped = dropSnapshots.get(root);
    const before = dropped ?? prev.current;
    dropSnapshots.delete(root);
    prev.current = now;
    if (!before) return;
    // On a drop, the drag offsets just came off: without this their CSS transitions would run (and win over the
    // animations below), sending rows that slid aside back by a whole slot before they glide in again.
    if (dropped) {
      els.forEach((el) => { el.style.transition = 'none'; });
      els.forEach((el) => { getComputedStyle(el).transform; el.style.transition = ''; });
    }
    const cs = getComputedStyle(root);
    if (parseFloat(cs.getPropertyValue('--alt-travel')) === 0) return;
    const opts = { duration: ms(cs, durToken, 220), easing: cs.getPropertyValue('--ease-glide').trim() || 'ease' };
    // Something that was let go lands: it settles into place with a slight overshoot instead of gliding.
    const landing = { duration: ms(cs, durToken, 220), easing: cs.getPropertyValue('--ease-settle').trim() || 'ease-out' };
    els.forEach((el) => {
      const k = el.getAttribute(attr)!, a = before.get(k), b = now.get(k)!;
      if (!a) return;
      const dx = a.x - b.x, dy = a.y - b.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], el.hasAttribute('data-landing') ? landing : opts);
    });
  });
}
const moveItem = <T,>(arr: T[], from: number, to: number) => { const a = arr.slice(); const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };

/* ───────────────────────── Table ───────────────────────── */

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** The table scrolls under its header past this height. */
  maxHeight?: number | string;
  /** Drawn inside the scroll area, beneath the rows (DataTable puts its landing slot here). */
  underlay?: React.ReactNode;
}
/**
 * Rows are the record: they sit on the ground with `line` dividers. The header stays flush until rows scroll under it,
 * then rises. Rows that change place are carried there. Each row's height is drawn as one slab by its first cell.
 */
export const Table = React.forwardRef<HTMLTableElement, TableProps>(function Table({ maxHeight, underlay, className, children, ...rest }, ref) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const table = React.useRef<HTMLTableElement>(null);
  React.useImperativeHandle(ref, () => table.current as HTMLTableElement);
  const [edges, setEdges] = React.useState({ top: false, bottom: false });
  const measure = React.useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const top = el.scrollTop > 1, bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
  }, []);
  useIsoLayoutEffect(() => {
    const t = table.current;
    if (!t) return;
    const fit = () => { t.style.setProperty('--alt-row-w', t.offsetWidth + 'px'); measure(); };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(t);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [measure]);
  useCarry(table, 'tbody > tr[data-row]', 'data-row');
  const scrolls = maxHeight !== undefined;
  return (
    <div ref={wrap} className="alt-table-wrap" data-top={edges.top ? '' : undefined} data-bottom={edges.bottom ? '' : undefined}
      style={scrolls ? { maxHeight } : undefined} onScroll={measure}
      {...(scrolls ? { tabIndex: 0, role: 'region', 'aria-label': rest['aria-label'] } : {})}>
      {underlay}
      <table ref={table} className={cx('alt-table', className)} {...rest}>{children}</table>
    </div>
  );
});
export const TableHeader = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className={cx('alt-table-head', className)} {...p} />;
export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(function TableBody({ className, ...p }, ref) {
  return <tbody ref={ref} className={cx('alt-table-body', className)} {...p} />;
});
export const TableFooter = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => <tfoot className={cx('alt-table-foot', className)} {...p} />;
export const TableCaption = ({ className, ...p }: React.HTMLAttributes<HTMLTableCaptionElement>) => <caption className={cx('alt-table-caption', className)} {...p} />;

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** A stable id. With it, a row whose place changes (re-sorting, reordering) is carried there instead of jumping. */
  rowId?: string;
  /** Selected rows are tinted accent-soft and raised one level. Pair it with a checked Checkbox in the row. */
  selected?: boolean;
  /** Lifts on hover. Only when clicking the row does something. */
  interactive?: boolean;
  /** Focus+context filtering: match rises one level, miss sinks into a well. */
  relevance?: 'match' | 'miss';
  /** Afterglow: when the value changes, the row lifts, tints and settles back over dur-settle. true settles once on mount. */
  settle?: unknown;
  /** In someone's hand while it's being moved: level 3, tilted. */
  held?: boolean;
}
export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { rowId, selected, interactive, relevance, settle, held, className, style, ...rest }, ref) {
  const [glow, setGlow] = React.useState<'a' | 'b' | undefined>(undefined);
  const [delay, setDelay] = React.useState(0);
  const first = React.useRef(true);
  React.useEffect(() => {
    const wasFirst = first.current;
    first.current = false;
    if (settle === undefined || settle === null || settle === false || (wasFirst && settle !== true)) return;
    setDelay(riseDelay());
    setGlow((g) => (g === 'a' ? 'b' : 'a'));
  }, [settle]);
  return (
    <tr ref={ref} className={cx('alt-tr', className)} data-row={rowId} data-selected={selected ? '' : undefined}
      data-interactive={interactive ? '' : undefined}
      data-row-relevance={relevance} data-row-held={held ? '' : undefined} data-row-settle={glow}
      style={delay ? ({ ['--alt-rise-delay' as any]: delay + 'ms', ...style } as React.CSSProperties) : style} {...rest} />
  );
});

const SortIcon = () => (
  <svg className="alt-table-sort-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 15l6-6 6 6" />
  </svg>
);
export interface TableHeadProps extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'end';
  /** This column's sort. With onSort, the header becomes a button and the th carries aria-sort. */
  sort?: 'ascending' | 'descending' | 'none';
  onSort?: () => void;
}
export function TableHead({ align, sort, onSort, className, children, ...rest }: TableHeadProps) {
  return (
    <th scope="col" className={cx('alt-th', className)} data-align={align} aria-sort={onSort ? sort ?? 'none' : undefined} {...rest}>
      {onSort ? <button type="button" className="alt-table-sort" data-sort={sort ?? 'none'} onClick={onSort}>{children}<SortIcon /></button> : children}
    </th>
  );
}
export interface TableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> { align?: 'start' | 'end' }
export function TableCell({ align, className, ...rest }: TableCellProps) {
  return <td className={cx('alt-td', className)} data-align={align} {...rest} />;
}

/* ───────────────────────── DataTable ───────────────────────── */

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Cell content. Default: the row's value at `key`. */
  cell?: (row: T) => React.ReactNode;
  /** Makes the column sortable by this value. */
  sortValue?: (row: T) => string | number;
  align?: 'start' | 'end';
  width?: number | string;
}
export type TableSort = { key: string; direction: 'ascending' | 'descending' } | null;
export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /** The rows. Undefined while your data loads, or a promise: until they arrive the table is its header over `skeleton.lines` imprinted rows (default 5). */
  rows: Promised<T[]> | undefined;
  /** While the rows are on their way: how many rows to imprint (`lines`). `false`: undefined rows render as empty, and a promise suspends to your own boundary. */
  skeleton?: SkeletonOption;
  getRowId: (row: T) => string;
  /** A row's name, for screen readers (its checkbox, its move handle, announcements) and its button with onRowClick. */
  getRowLabel?: (row: T) => string;
  /** A checkbox column; selected rows rise, and the toolbar counts them. */
  selectable?: boolean;
  selected?: string[];
  defaultSelected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  /** Toolbar actions for the selected rows, shown beside their count. */
  actions?: (ids: string[]) => React.ReactNode;
  /** Anything else for the toolbar's end (a filter field, a button). */
  toolbar?: React.ReactNode;
  sort?: TableSort;
  defaultSort?: TableSort;
  onSortChange?: (sort: TableSort) => void;
  /** Makes rows interactive: the first column becomes the row's button, and clicking anywhere on the row calls this. */
  onRowClick?: (row: T) => void;
  /** Filter in place: matches rise, misses sink. Return undefined when no filter is active. */
  relevance?: (row: T) => 'match' | 'miss' | undefined;
  /** Adds move handles: rows can be picked up and dropped (pointer, or Space and the arrow keys). Hidden while sorted. */
  onReorder?: (rows: T[]) => void;
  maxHeight?: number | string;
  /** Shown when there are no rows. */
  empty?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

const GripIcon = () => (
  <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
    <circle cx="3" cy="3" r="1.3" /><circle cx="9" cy="3" r="1.3" /><circle cx="3" cy="8" r="1.3" /><circle cx="9" cy="8" r="1.3" /><circle cx="3" cy="13" r="1.3" /><circle cx="9" cy="13" r="1.3" />
  </svg>
);

/**
 * A table from data: sortable columns whose rows are carried to their new places, a checkbox column whose selected rows
 * rise (counted by a floating Badge in the toolbar), filtering in place, interactive rows and reordering by hand.
 */
export function DataTable<T>({ skeleton, ...props }: DataTableProps<T>) {
  const missing = skeleton !== false && props.rows === undefined;
  useReportWaiting(missing || (skeleton !== false && isPromise(props.rows)));
  const arrival = useArrival(missing);
  if (!useHasWaited(missing || isPromise(props.rows))) return <DataTableFace {...props} rows={(props.rows as T[] | undefined) ?? []} />;
  const { lines = 5 } = hint(skeleton);
  const { columns, selectable, toolbar, maxHeight, className } = props;
  return (
    <Await shape="none" enabled={skeleton !== false} imprint={
      <div className={cx('alt-data-table', className)}>
        {(selectable || toolbar) && <div className="alt-table-tools">{toolbar && <div className="alt-table-tools-end">{toolbar}</div>}</div>}
        <Table maxHeight={maxHeight} aria-label={props['aria-label']}>
          <TableHeader>
            <TableRow>
              {selectable && <TableHead className="alt-th-check"><span className="alt-skeleton alt-check-imprint" /></TableHead>}
              {columns.map((c) => <TableHead key={c.key} align={c.align} style={{ width: c.width }}>{c.header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: lines }, (_, i) => (
              <TableRow key={i}>
                {selectable && <TableCell className="alt-td-check"><span className="alt-skeleton alt-check-imprint" /></TableCell>}
                {columns.map((c, ci) => (
                  <TableCell key={c.key} align={c.align}>
                    <span className="alt-skeleton alt-cell-imprint" data-shape="text" style={{ width: CELL_WIDTHS[(i + ci) % CELL_WIDTHS.length], ['--i' as string]: i }} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    }>
      <Arrive when={arrival}><DataTableLanded {...props} /></Arrive>
    </Await>
  );
}
const CELL_WIDTHS = ['72%', '54%', '86%', '63%', '78%'];
function DataTableLanded<T>(props: Omit<DataTableProps<T>, 'skeleton'>) {
  return <DataTableFace {...props} rows={readPromised(props.rows) ?? []} />;
}
function DataTableFace<T>({ columns, rows, getRowId, getRowLabel, selectable, selected, defaultSelected = [], onSelectedChange, actions, toolbar,
  sort, defaultSort = null, onSortChange, onRowClick, relevance, onReorder, maxHeight, empty = 'Nothing here yet.', className, ...rest }: Omit<DataTableProps<T>, 'skeleton' | 'rows'> & { rows: T[] }) {
  const [sel, setSel] = useControllable(selected, defaultSelected, onSelectedChange);
  const [srt, setSrt] = useControllable<TableSort>(sort, defaultSort, onSortChange);
  const [said, setSaid] = React.useState('');
  const table = React.useRef<HTMLTableElement>(null);
  const body = React.useRef<HTMLTableSectionElement>(null);
  const name = (r: T) => getRowLabel?.(r) ?? getRowId(r);
  const view = React.useMemo(() => {
    const col = srt && columns.find((c) => c.key === srt.key);
    if (!srt || !col?.sortValue) return rows;
    const d = srt.direction === 'descending' ? -1 : 1;
    return rows.map((r, i) => ({ r, i, v: col.sortValue!(r) }))
      .sort((a, b) => (typeof a.v === 'string' || typeof b.v === 'string' ? String(a.v).localeCompare(String(b.v), undefined, { numeric: true }) : (a.v as number) - (b.v as number)) * d || a.i - b.i)
      .map((x) => x.r);
  }, [rows, srt, columns]);
  const ids = view.map(getRowId);
  const chosen = new Set(sel);
  const all = ids.length > 0 && ids.every((id) => chosen.has(id));
  const some = !all && ids.some((id) => chosen.has(id));
  const movable = !!onReorder && !srt;

  const cycle = (c: DataTableColumn<T>) => {
    const next: TableSort = srt?.key !== c.key ? { key: c.key, direction: 'ascending' } : srt.direction === 'ascending' ? { key: c.key, direction: 'descending' } : null;
    setSrt(next);
    setSaid(next ? `Sorted by ${typeof c.header === 'string' ? c.header : c.key}, ${next.direction}.` : 'Sort cleared.');
  };
  const toggle = (id: string, on: boolean) => setSel(on ? [...sel.filter((x) => x !== id), id] : sel.filter((x) => x !== id));

  // Reordering by hand: pick a row up by its handle; the slot it will land in opens as a well; it lands where you drop it.
  const start = React.useRef<{ y: number; id: string; from: number; tops: number[]; hs: number[] } | null>(null);
  const [drag, setDrag] = React.useState<{ id: string; from: number; to: number; dy: number } | null>(null);
  const [held, setHeld] = React.useState<{ id: string; origin: number } | null>(null);
  const rowEls = () => Array.from(body.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row]') ?? []);
  // Where each row was drawn when it was let go (its layout place plus the drag offset), so the drop travels from there.
  const snapshot = (at: (i: number) => number) => {
    if (!table.current) return;
    const m = new Map<string, { x: number; y: number }>();
    ids.forEach((id, i) => m.set(id, { x: 0, y: at(i) }));
    dropSnapshots.set(table.current, m);
  };
  const onGripDown = (e: React.PointerEvent, id: string, index: number) => {
    if (e.button !== 0) return;
    const els = rowEls();
    start.current = { y: e.clientY, id, from: index, tops: els.map((el) => el.offsetTop), hs: els.map((el) => el.offsetHeight) };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onGripMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dy = e.clientY - s.y;
    if (!drag && Math.abs(dy) < 4) return;
    const center = s.tops[s.from] + s.hs[s.from] / 2 + dy;
    let to = 0;
    s.tops.forEach((t, i) => { if (i !== s.from && t + s.hs[i] / 2 < center) to++; });
    setDrag({ id: s.id, from: s.from, to, dy });
  };
  const onGripUp = () => {
    const s = start.current;
    start.current = null;
    if (!drag || !s) { setDrag(null); return; }
    const { from, to } = drag, hs = s.hs[from];
    snapshot((i) => s.tops[i] + (i === from ? drag.dy : drag.from < drag.to && i > from && i <= to ? -hs : drag.to < drag.from && i >= to && i < from ? hs : 0));
    setDrag(null);
    if (from !== to) { onReorder!(moveItem(view, from, to)); setSaid(`${name(view[from])} moved to position ${to + 1} of ${view.length}.`); }
  };
  const focusGrip = (id: string) => requestAnimationFrame(() => body.current?.querySelector<HTMLElement>(`tr[data-row="${CSS.escape(id)}"] .alt-table-grip`)?.focus());
  const onGripKey = (e: React.KeyboardEvent, id: string, index: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (held?.id === id) { setHeld(null); setSaid(`${name(view[index])} dropped at position ${index + 1} of ${view.length}.`); }
      else { setHeld({ id, origin: index }); setSaid(`${name(view[index])} picked up, position ${index + 1} of ${view.length}. Use the arrow keys to move it, Space to drop it, Escape to cancel.`); }
    } else if (held?.id === id && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const to = Math.max(0, Math.min(view.length - 1, index + (e.key === 'ArrowUp' ? -1 : 1)));
      if (to !== index) { onReorder!(moveItem(view, index, to)); setSaid(`Position ${to + 1} of ${view.length}.`); focusGrip(id); }
    } else if (held?.id === id && e.key === 'Escape') {
      e.preventDefault();
      if (held.origin !== index) { onReorder!(moveItem(view, index, held.origin)); focusGrip(id); }
      setHeld(null); setSaid(`Move cancelled; ${name(view[index])} is back at position ${held.origin + 1}.`);
    }
  };
  React.useEffect(() => { if (!movable) setHeld(null); }, [movable]);

  const s = start.current;
  const h = drag && s ? s.hs[drag.from] : 0;
  const slotTop = drag && s ? (drag.to <= drag.from ? s.tops[drag.to] : s.tops[drag.to] + s.hs[drag.to] - s.hs[drag.from]) : 0;
  const span = columns.length + (selectable ? 1 : 0) + (movable ? 1 : 0);
  return (
    <div className={cx('alt-data-table', className)}>
      {(selectable || toolbar) && (
        <div className="alt-table-tools">
          {sel.length > 0 && (
            <div className="alt-table-selection">
              <Badge variant="count" tone="accent" aria-hidden="true">{sel.length}</Badge>
              <span>selected</span>
              {actions?.(sel)}
              <Button size="sm" variant="ghost" onClick={() => setSel([])}>Clear</Button>
            </div>
          )}
          {toolbar && <div className="alt-table-tools-end">{toolbar}</div>}
        </div>
      )}
      <Table ref={table} maxHeight={maxHeight} aria-label={rest['aria-label']} data-dragging={drag ? '' : undefined}
        underlay={drag && s ? <span className="alt-table-slot" aria-hidden="true" style={{ top: slotTop + (table.current?.offsetTop ?? 0), height: h }} /> : null}>
        <TableHeader>
          <TableRow>
            {movable && <TableHead className="alt-th-grip"><span className="alt-sr">Move</span></TableHead>}
            {selectable && (
              <TableHead className="alt-th-check">
                <Checkbox aria-label="Select all rows" checked={all} indeterminate={some} onCheckedChange={(on) => setSel(on ? Array.from(new Set([...sel, ...ids])) : sel.filter((x) => !ids.includes(x)))} />
              </TableHead>
            )}
            {columns.map((c) => (
              <TableHead key={c.key} align={c.align} style={{ width: c.width }} sort={srt?.key === c.key ? srt.direction : 'none'} onSort={c.sortValue ? () => cycle(c) : undefined}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody ref={body}>
          {!view.length && <tr><td className="alt-td alt-table-empty" colSpan={span}>{empty}</td></tr>}
          {view.map((r, i) => {
            const id = ids[i];
            let shift = 0;
            if (drag && id !== drag.id && h) {
              if (drag.from < drag.to && i > drag.from && i <= drag.to) shift = -h;
              if (drag.to < drag.from && i >= drag.to && i < drag.from) shift = h;
            }
            const following = drag?.id === id;
            return (
              <TableRow key={id} rowId={id} selected={selectable && chosen.has(id)} interactive={!!onRowClick} relevance={relevance?.(r)}
                held={following || held?.id === id} data-following={following ? '' : undefined}
                style={following ? { transform: `translateY(${drag!.dy}px)` } : shift ? { transform: `translateY(${shift}px)` } : undefined}
                onClick={onRowClick ? (e) => { if (!(e.target as HTMLElement).closest('button, a, input, label, select, textarea')) onRowClick(r); } : undefined}>
                {movable && (
                  <TableCell className="alt-td-grip">
                    <button type="button" className="alt-table-grip" aria-label={`Move ${name(r)}`} aria-pressed={held?.id === id}
                      onPointerDown={(e) => onGripDown(e, id, i)} onPointerMove={onGripMove} onPointerUp={onGripUp} onPointerCancel={onGripUp}
                      onKeyDown={(e) => onGripKey(e, id, i)} onBlur={() => { if (held?.id === id && !drag) setTimeout(() => setHeld((x) => (x?.id === id && document.activeElement?.closest(`tr[data-row="${CSS.escape(id)}"]`) === null ? null : x)), 0); }}>
                      <GripIcon />
                    </button>
                  </TableCell>
                )}
                {selectable && (
                  <TableCell className="alt-td-check"><Checkbox aria-label={`Select ${name(r)}`} checked={chosen.has(id)} onCheckedChange={(on) => toggle(id, on)} /></TableCell>
                )}
                {columns.map((c, ci) => {
                  const content = c.cell ? c.cell(r) : String((r as any)[c.key] ?? '');
                  return (
                    <TableCell key={c.key} align={c.align}>
                      {onRowClick && ci === 0 ? <button type="button" className="alt-table-rowbtn" onClick={() => onRowClick(r)}>{content}</button> : content}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <span className="alt-sr" aria-live="polite">{selectable && sel.length ? `${sel.length} selected. ` : ''}{said}</span>
    </div>
  );
}

/* ───────────────────────── Board ───────────────────────── */

export interface BoardPlace { column: string; index: number }
export interface BoardMove { cardId: string; from: BoardPlace; to: BoardPlace }
type SnapCard = { id: string; x: number; y: number; w: number; h: number };
type SnapCol = { id: string; title: string; x: number; w: number; listTop: number; gap: number; collapsed: boolean; count: number; cards: SnapCard[] };
type Carry = { id: string; from: BoardPlace; to: BoardPlace; dx: number; dy: number; h: number; gap: number; shifts: Record<string, number>; slotTop: number };
type BoardCtxT = {
  carry: Carry | null; kb: { id: string; origin: BoardPlace; at: BoardPlace } | null; landing: string | null; hintId: string;
  onPointerDown: (e: React.PointerEvent, id: string) => void; onPointerMove: (e: React.PointerEvent) => void; onPointerUp: () => void;
  onKeyDown: (e: React.KeyboardEvent, id: string) => void; onBlur: (id: string) => void; swallowClick: () => boolean;
};
const BoardCtx = React.createContext<BoardCtxT | null>(null);

function readBoard(root: HTMLElement): SnapCol[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-board-col]')).map((col) => {
    const list = col.querySelector<HTMLElement>('.alt-board-list');
    const p = placeIn(col, root);
    const cards = list ? Array.from(list.querySelectorAll<HTMLElement>(':scope > [data-board-card]')).map((c) => {
      const q = placeIn(c, root);
      return { id: c.dataset.boardCard!, x: q.x, y: q.y, w: c.offsetWidth, h: c.offsetHeight };
    }) : [];
    return {
      id: col.dataset.boardCol!, title: col.getAttribute('aria-label') || col.dataset.boardCol!, x: p.x, w: col.offsetWidth,
      listTop: list ? placeIn(list, root).y : p.y, gap: list ? parseFloat(getComputedStyle(list).rowGap) || 8 : 8,
      collapsed: col.hasAttribute('data-collapsed'), count: Number(col.dataset.count) || 0, cards,
    };
  });
}
/** Where a card would land for a pointer at (cx, cy), and how every other card makes room for it. */
function plan(cols: SnapCol[], id: string, cx: number, cy: number, h: number) {
  let ti = cols.findIndex((c) => cx >= c.x && cx <= c.x + c.w);
  if (ti < 0) ti = cols.reduce((best, c, i) => (Math.abs(c.x + c.w / 2 - cx) < Math.abs(cols[best].x + cols[best].w / 2 - cx) ? i : best), 0);
  const tc = cols[ti];
  const others = tc.cards.filter((c) => c.id !== id);
  const index = tc.collapsed ? tc.count : others.filter((c) => c.y + c.h / 2 < cy).length;
  const shifts: Record<string, number> = {};
  let slotTop = 0;
  for (const c of cols) {
    if (c.collapsed) continue;
    const order: (SnapCard | null)[] = c.cards.filter((k) => k.id !== id);
    if (c.id === tc.id) order.splice(index, 0, null);
    let y = c.listTop;
    for (const k of order) {
      if (!k) { slotTop = y - c.listTop; y += h + c.gap; } else { shifts[k.id] = y - k.y; y += k.h + c.gap; }
    }
  }
  return { to: { column: tc.id, index }, shifts, slotTop, gap: tc.gap };
}

export interface BoardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Called when a card is dropped somewhere new (pointer), or moved a step (keyboard). Update your data; the board carries the cards. */
  onMove: (move: BoardMove) => void;
  /** Default "Board". */
  'aria-label'?: string;
}
/**
 * Columns of cards. Columns are receptacles: flush at rest, they open into wells while a card is carried, and the one
 * under it deepens. Cards are raised; one picked up floats at level 3, tilted, follows the pointer, and lands with a settle.
 */
export const Board = React.forwardRef<HTMLDivElement, BoardProps>(function Board({ onMove, className, children, ...rest }, ref) {
  const root = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => root.current as HTMLDivElement);
  const hintId = React.useId();
  const [carry, setCarry] = React.useState<Carry | null>(null);
  const [kb, setKb] = React.useState<BoardCtxT['kb']>(null);
  const [landing, setLanding] = React.useState<string | null>(null);
  const [said, setSaid] = React.useState('');
  const start = React.useRef<{ x: number; y: number; id: string; cols?: SnapCol[]; from?: BoardPlace; card?: SnapCard } | null>(null);
  const dragged = React.useRef(false);
  useCarry(root, '[data-board-card]', 'data-board-card');
  React.useEffect(() => { if (!landing) return; const t = setTimeout(() => setLanding(null), 450); return () => clearTimeout(t); }, [landing]);

  const titleOf = (col: string) => root.current?.querySelector<HTMLElement>(`[data-board-col="${CSS.escape(col)}"]`)?.getAttribute('aria-label') ?? col;
  const countOf = (col: string) => Number(root.current?.querySelector<HTMLElement>(`[data-board-col="${CSS.escape(col)}"]`)?.dataset.count) || 0;
  const cardEl = (id: string) => root.current?.querySelector<HTMLElement>(`[data-board-card="${CSS.escape(id)}"]`) ?? null;
  const nameOf = (id: string) => { const el = cardEl(id); return el?.dataset.label || el?.textContent?.trim().split('\n')[0] || id; };
  const locate = (id: string): BoardPlace | null => {
    const el = cardEl(id), col = el?.closest<HTMLElement>('[data-board-col]');
    if (!el || !col) return null;
    return { column: col.dataset.boardCol!, index: Array.from(col.querySelectorAll('.alt-board-list > [data-board-card]')).indexOf(el) };
  };
  const refocus = (id: string) => requestAnimationFrame(() => cardEl(id)?.focus({ preventScroll: true }));

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0 || kb || (e.target as HTMLElement).closest('button, a, input, textarea, select, [contenteditable]')) return;
    if ((e.currentTarget as HTMLElement).hasAttribute('data-held-by')) return; // someone else has it
    start.current = { x: e.clientX, y: e.clientY, id };
    dragged.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || !root.current) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.cols) {
      if (Math.hypot(dx, dy) < 5) return;
      s.cols = readBoard(root.current);
      for (const c of s.cols) { const i = c.cards.findIndex((k) => k.id === s.id); if (i >= 0) { s.from = { column: c.id, index: i }; s.card = c.cards[i]; } }
      if (!s.from) { start.current = null; return; }
      dragged.current = true;
      setSaid(`Picked up ${nameOf(s.id)}.`);
    }
    const k = s.card!;
    const p = plan(s.cols, s.id, k.x + k.w / 2 + dx, k.y + k.h / 2 + dy, k.h);
    setCarry({ id: s.id, from: s.from!, to: p.to, dx, dy, h: k.h, gap: p.gap, shifts: p.shifts, slotTop: p.slotTop });
  };
  const onPointerUp = () => {
    const s = start.current;
    start.current = null;
    if (!s?.cols || !carry || !root.current) { setCarry(null); return; }
    // Where each card was drawn when it was let go, so the landing travels from there.
    const m = new Map<string, { x: number; y: number }>();
    s.cols.forEach((c) => c.cards.forEach((k) => m.set(k.id, { x: k.x + (k.id === s.id ? carry.dx : 0), y: k.y + (k.id === s.id ? carry.dy : carry.shifts[k.id] ?? 0) })));
    dropSnapshots.set(root.current, m);
    const { from, to } = carry;
    setLanding(s.id);
    setCarry(null);
    const moved = from.column !== to.column || from.index !== to.index;
    if (moved) onMove({ cardId: s.id, from, to });
    const n = countOf(to.column) + (from.column !== to.column ? 1 : 0);
    setSaid(moved ? `Dropped ${nameOf(s.id)} in ${titleOf(to.column)}, position ${Math.min(to.index + 1, n)} of ${n}.` : `Dropped ${nameOf(s.id)} where it was.`);
  };
  const go = (id: string, from: BoardPlace, to: BoardPlace, origin: BoardPlace) => {
    onMove({ cardId: id, from, to });
    setKb({ id, origin, at: to });
    refocus(id);
    const n = countOf(to.column) + (from.column !== to.column ? 1 : 0);
    setSaid(`${titleOf(to.column)}, position ${to.index + 1} of ${n}.`);
  };
  const onKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.target !== e.currentTarget) return;
    const at = locate(id);
    if (!at) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (kb?.id === id) { setKb(null); setSaid(`Dropped ${nameOf(id)} in ${titleOf(at.column)}, position ${at.index + 1} of ${countOf(at.column)}.`); return; }
      const held = cardEl(id)?.dataset.heldBy;
      if (held) { setSaid(`${nameOf(id)} is held by ${held}.`); return; }
      setKb({ id, origin: at, at });
      setSaid(`Picked up ${nameOf(id)}. ${titleOf(at.column)}, position ${at.index + 1} of ${countOf(at.column)}. Use the arrow keys to move it, Space to drop it, Escape to cancel.`);
      return;
    }
    if (kb?.id !== id) return;
    const cols = Array.from(root.current!.querySelectorAll<HTMLElement>('[data-board-col]:not([data-collapsed])')).map((c) => c.dataset.boardCol!);
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const to = Math.max(0, Math.min(countOf(at.column) - 1, at.index + (e.key === 'ArrowUp' ? -1 : 1)));
      if (to !== at.index) go(id, at, { column: at.column, index: to }, kb.origin);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = cols[cols.indexOf(at.column) + (e.key === 'ArrowLeft' ? -1 : 1)];
      if (next) go(id, at, { column: next, index: Math.min(at.index, countOf(next)) }, kb.origin);
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      const o = kb.origin;
      if (o.column !== at.column || o.index !== at.index) { onMove({ cardId: id, from: at, to: o }); refocus(id); }
      setKb(null);
      setSaid(`Move cancelled. ${nameOf(id)} is back in ${titleOf(o.column)}, position ${o.index + 1}.`);
    }
  };
  // Focus leaving a card you're holding (not because it moved column) puts it down where it is.
  const onBlur = (id: string) => {
    if (kb?.id !== id) return;
    setTimeout(() => { if (!(document.activeElement as HTMLElement | null)?.matches?.(`[data-board-card="${CSS.escape(id)}"]`)) setKb((x) => (x?.id === id ? null : x)); }, 80);
  };
  const swallowClick = () => { const d = dragged.current; dragged.current = false; return d; };
  const ctx: BoardCtxT = { carry, kb, landing, hintId, onPointerDown, onPointerMove, onPointerUp, onKeyDown, onBlur, swallowClick };
  return (
    <BoardCtx.Provider value={ctx}>
      <div ref={root} role="group" aria-label={rest['aria-label'] ?? 'Board'} className={cx('alt-board', className)} data-carrying={carry || kb ? '' : undefined} {...rest}>
        {children}
        <span id={hintId} className="alt-sr">Press Space to pick up. While holding a card, use the arrow keys to move it, Space to drop it, Escape to cancel.</span>
        <span className="alt-sr" aria-live="assertive">{said}</span>
      </div>
    </BoardCtx.Provider>
  );
});

export interface BoardColumnProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  id: string;
  title: React.ReactNode;
  /** A collapsed column is a Pile: its thickness and count say how many cards it holds. It still takes drops. */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Show the collapse button. */
  collapsible?: boolean;
}
export function BoardColumn({ id, title, collapsed, defaultCollapsed = false, onCollapsedChange, collapsible, className, children, ...rest }: BoardColumnProps) {
  const ctx = React.useContext(BoardCtx);
  const [isCollapsed, setCollapsed] = useControllable(collapsed, defaultCollapsed, onCollapsedChange);
  const count = React.Children.toArray(children).filter(React.isValidElement).length;
  const label = typeof title === 'string' ? title : id;
  const carry = ctx?.carry;
  const over = carry ? carry.to.column === id : ctx?.kb?.at.column === id;
  const receiving = !!carry && carry.to.column === id && carry.from.column !== id && !isCollapsed;
  return (
    <section className={cx('alt-board-col', className)} data-board-col={id} data-count={count} aria-label={label}
      data-collapsed={isCollapsed ? '' : undefined} data-over={over ? '' : undefined} {...rest}>
      <header className="alt-board-head">
        <h3 className="alt-board-title">{title}</h3>
        <span className="alt-board-count" aria-label={`${count} ${count === 1 ? 'card' : 'cards'}`}>{count}</span>
        {collapsible && (
          <Button variant="ghost" size="sm" square aria-expanded={!isCollapsed} aria-label={isCollapsed ? `Expand ${label}` : `Collapse ${label}`}
            className="alt-board-fold" data-collapsed={isCollapsed ? '' : undefined} onClick={() => setCollapsed(!isCollapsed)}><Icons.ChevronDown /></Button>
        )}
      </header>
      {isCollapsed ? (
        <Pile count={Math.max(count, 1)} className="alt-board-pile">
          <div className="alt-board-pile-face"><b>{title}</b><span>{count ? `${count} ${count === 1 ? 'card' : 'cards'}` : 'No cards'}</span></div>
        </Pile>
      ) : (
        <div className="alt-board-list" style={receiving ? { paddingBottom: carry!.h + carry!.gap } : undefined}>
          {carry && carry.to.column === id && <span className="alt-board-slot" aria-hidden="true" style={{ top: carry.slotTop, height: carry.h }} />}
          {children}
          {!count && !carry && <div className="alt-board-empty">No cards</div>}
        </div>
      )}
    </section>
  );
}

export interface BoardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  /** How announcements name the card. Default: its first line of text. */
  label?: string;
  /** A collaborator is holding it: lifted, wearing their colour and name. It can't be picked up meanwhile. */
  heldBy?: { name: string; presence?: 1 | 2 | 3 };
  /** Afterglow: when this value changes the card arrives tinted and lifted, then settles. */
  settle?: unknown;
}
export const BoardCard = React.forwardRef<HTMLDivElement, BoardCardProps>(function BoardCard({ id, label, heldBy, settle, className, style, onClickCapture, children, ...rest }, ref) {
  const ctx = React.useContext(BoardCtx);
  const depth = useDepth({ heldBy, settle });
  const carry = ctx?.carry;
  const following = carry?.id === id;
  const carried = following || ctx?.kb?.id === id;
  const shift = carry?.shifts[id];
  const transform = following ? `translate(${carry!.dx}px, ${carry!.dy}px)` : shift ? `translateY(${shift}px)` : undefined;
  return (
    <div ref={ref} className={cx('alt-board-card', className)} data-board-card={id} data-label={label} tabIndex={0} role="button"
      aria-roledescription="draggable card" aria-describedby={ctx?.hintId} aria-pressed={ctx?.kb?.id === id ? true : undefined}
      data-carried={carried ? '' : undefined} data-following={following ? '' : undefined} data-landing={ctx?.landing === id ? '' : undefined}
      {...depth} style={{ ...depth.style, ...style, ...(transform ? { transform } : null) }}
      onPointerDown={(e) => ctx?.onPointerDown(e, id)} onPointerMove={ctx?.onPointerMove} onPointerUp={ctx?.onPointerUp} onPointerCancel={ctx?.onPointerUp}
      onKeyDown={(e) => ctx?.onKeyDown(e, id)} onBlur={() => ctx?.onBlur(id)}
      onClickCapture={(e) => { if (ctx?.swallowClick()) { e.preventDefault(); e.stopPropagation(); } else onClickCapture?.(e); }} {...rest}>
      {children}
    </div>
  );
});
