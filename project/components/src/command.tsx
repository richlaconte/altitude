import * as React from 'react';
import { cssMs, cx, Kbd, Layer, riseDelay, useControllable, useIsoLayoutEffect } from './core';
import { Input } from './controls';
import { summitTaken, useModal } from './overlays';
import { useAltitudeContext } from './modal-state';

const EXIT_5 = 220; // ≈ dur-travel-5 × 0.7

export interface CommandItem {
  /** Stable key within its group. Defaults to the label. */
  id?: string;
  label: string;
  /** A short second line of context (a path, a branch). Matched with less weight than the label. */
  description?: string;
  icon?: React.ReactNode;
  /** Keys shown as Kbd hints, e.g. ['⌘', 'D']. Display only: bind the shortcut yourself. */
  shortcut?: string[];
  /** Other words that should find this item (synonyms, old names). */
  keywords?: string[];
  onSelect?: () => void;
  disabled?: boolean;
  tone?: 'critical';
  /** Ephemeral adaptation: on opening, predicted items are there at once while the rest fade in over dur-onset. */
  predicted?: boolean;
}
export interface CommandGroup {
  /** Stable key. Defaults to the group's position. */
  id?: string;
  label?: React.ReactNode;
  items: CommandItem[];
  /** Every item in the group is predicted: a "Recent" or "Suggested" group. */
  predicted?: boolean;
}
export interface CommandPaletteProps {
  items: CommandGroup[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the chosen item (after its own onSelect). */
  onSelect?: (item: CommandItem, group: CommandGroup) => void;
  placeholder?: string;
  /** Score an item against the query: 0 hides it, higher ranks it nearer the top. Replaces the built-in fuzzy match. */
  filter?: (item: CommandItem, query: string) => number;
  /** Shown when nothing matches. A function receives the query. */
  empty?: React.ReactNode | ((query: string) => React.ReactNode);
  /** The letter that opens and closes the palette with ⌘ (macOS) or Ctrl. Default 'k'; false for none. */
  shortcut?: string | false;
  /** The query, controlled. The palette never clears it on opening: the caller owns it, e.g. a persistent field handing over what was typed. */
  query?: string;
  /** What the query is each time the palette opens, uncontrolled. Default ''. */
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /** Close once an item is chosen. Default true. */
  closeOnSelect?: boolean;
  /** The key hints along the bottom. Default true. */
  hints?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * The built-in ranking. 0 means no match. An exact match beats a prefix, a prefix beats a word start, a word start
 * beats a substring, and a substring beats letters found in order (fewer gaps rank higher).
 */
export function commandScore(text: string, query: string): number {
  const t = text.toLowerCase(), q = query.toLowerCase().trim();
  if (!q) return 1;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.split(/[\s\-_/.:@]+/).some((w) => w.startsWith(q))) return 60;
  const i = t.indexOf(q);
  if (i >= 0) return 40 - Math.min(i, 20) * 0.5;
  let from = 0, last = -1, gaps = 0;
  for (const ch of q.replace(/\s+/g, '')) {
    const f = t.indexOf(ch, from);
    if (f < 0) return 0;
    if (last >= 0) gaps += f - last - 1;
    last = f; from = f + 1;
  }
  return Math.max(1, 20 - gaps * 0.5);
}
const itemScore = (item: CommandItem, q: string) => {
  let s = commandScore(item.label, q);
  for (const k of item.keywords || []) s = Math.max(s, commandScore(k, q) * 0.9);
  if (item.description) s = Math.max(s, commandScore(item.description, q) * 0.6);
  return s;
};

/** Which letters of the label matched: one run (preferring a word start), else the letters in order. */
function matchRanges(label: string, query: string): Array<[number, number]> {
  const t = label.toLowerCase(), q = query.toLowerCase().trim();
  if (!q) return [];
  let at = -1;
  for (let i = t.indexOf(q); i >= 0; i = t.indexOf(q, i + 1)) {
    if (i === 0 || /[\s\-_/.:@]/.test(t[i - 1])) { at = i; break; }
    if (at < 0) at = i;
  }
  if (at >= 0) return [[at, at + q.length]];
  const out: Array<[number, number]> = [];
  let from = 0;
  for (const ch of q.replace(/\s+/g, '')) {
    const f = t.indexOf(ch, from);
    if (f < 0) return [];
    const prev = out[out.length - 1];
    if (prev && prev[1] === f) prev[1] = f + 1; else out.push([f, f + 1]);
    from = f + 1;
  }
  return out;
}
function Marked({ text, ranges }: { text: string; ranges: Array<[number, number]> }) {
  if (!ranges.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let i = 0;
  ranges.forEach(([a, b], k) => { if (a > i) parts.push(text.slice(i, a)); parts.push(<mark key={k} className="alt-cmd-match">{text.slice(a, b)}</mark>); i = b; });
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
  </svg>
);
const ms = cssMs;

type Row = { key: string; item: CommandItem; group: CommandGroup; predicted: boolean };

/**
 * The summit: a level-5 search over everything you can do, opened with ⌘K or Ctrl+K. The page recedes behind it
 * as it does for Dialog. The query field is an opening built like Input; one highlight glides between results;
 * when results change, surviving rows travel to their new places and new ones rise in, a few at a time.
 */
export function CommandPalette({ items, open, defaultOpen = false, onOpenChange, onSelect, placeholder = 'Type a command or search…', filter, empty,
  shortcut = 'k', query: queryProp, defaultQuery = '', onQueryChange, closeOnSelect = true, hints = true, className, ...rest }: CommandPaletteProps) {
  const [isOpen, set] = useControllable(open, defaultOpen, onOpenChange);
  const [innerQuery, setInnerQuery] = React.useState(defaultQuery);
  const query = queryProp ?? innerQuery;
  const [active, setActive] = React.useState(0);
  const [onset, setOnset] = React.useState(true);
  const [said, setSaid] = React.useState('');
  const panel = React.useRef<HTMLDivElement>(null);
  const viewport = React.useRef<HTMLDivElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const sizer = React.useRef<HTMLDivElement>(null);
  const rowEls = React.useRef(new Map<string, HTMLElement>());
  const prevTops = React.useRef<Map<string, number> | null>(null);
  const byKeyboard = React.useRef(false);
  const caretPlaced = React.useRef(false);
  const seed = React.useRef(defaultQuery);
  seed.current = defaultQuery;
  // Layer mounts its portal a render later; effects that measure rows wait for the panel to exist.
  const [panelEl, setPanelEl] = React.useState<HTMLDivElement | null>(null);
  const panelRef = React.useCallback((el: HTMLDivElement | null) => { (panel as React.MutableRefObject<HTMLDivElement | null>).current = el; setPanelEl(el); }, []);
  const id = React.useId();
  const close = React.useCallback(() => set(false), [set]);
  const { mounted, state, onKeyDown, rootRef } = useModal({ open: isOpen, onDismiss: close, exitMs: EXIT_5, panel, summit: true });

  const context = useAltitudeContext();
  const ownerDocument = context?.host?.ownerDocument ?? panelEl?.ownerDocument ?? (typeof document === 'undefined' ? null : document);

  // ⌘K / Ctrl+K toggles it, unless something else holds the summit.
  React.useEffect(() => {
    if (!shortcut || !ownerDocument) return;
    const key = shortcut.toLowerCase();
    const on = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== key) return;
      if (isOpen) { e.preventDefault(); set(false); } else if (!summitTaken(ownerDocument)) { e.preventDefault(); set(true); }
    };
    ownerDocument.addEventListener('keydown', on);
    return () => ownerDocument.removeEventListener('keydown', on);
  }, [shortcut, isOpen, set, ownerDocument]);
  // Each opening starts from the seed (a controlled query is left as the caller has it).
  React.useEffect(() => { if (isOpen) { setInnerQuery(seed.current); setActive(0); setOnset(true); caretPlaced.current = false; } }, [isOpen]);
  // A query changed from outside (a controlled one) starts again from the best match, as typing does.
  React.useEffect(() => { setActive(0); }, [query]);

  // Rank: within each group by score, and groups by their best item, so the best match is on top.
  const q = query.trim();
  const score = filter ?? itemScore;
  const view = items.map((g, gi) => {
    let rows = g.items.map((item, ii) => ({ item, ii, s: q ? score(item, q) : 1 }));
    if (q) rows = rows.filter((r) => r.s > 0).sort((a, b) => b.s - a.s || a.ii - b.ii);
    return { g, gk: g.id ?? String(gi), gi, rows, best: rows[0]?.s ?? 0 };
  }).filter((v) => v.rows.length);
  if (q) view.sort((a, b) => b.best - a.best || a.gi - b.gi);
  const flat: Row[] = [];
  view.forEach((v) => v.rows.forEach(({ item }) => flat.push({ key: `${v.gk}:${item.id ?? item.label}`, item, group: v.g, predicted: !!(item.predicted || v.g.predicted) })));
  const enabled = flat.filter((r) => !r.item.disabled);
  const act = enabled.length ? Math.min(active, enabled.length - 1) : -1;
  const activeRow = act >= 0 ? enabled[act] : null;
  const rowsKey = view.map((v) => v.gk + '[' + v.rows.map((r) => r.item.id ?? r.item.label).join('|') + ']').join(',');
  const ephemeral = onset && !q && flat.some((r) => r.predicted);

  // Results that change travel instead of blinking (FLIP); new rows rise in, the best few within the attention budget.
  useIsoLayoutEffect(() => {
    const host = list.current;
    if (!host) { prevTops.current = null; return; }
    const els = Array.from(host.querySelectorAll<HTMLElement>('[data-flip]'));
    const now = new Map<string, number>();
    els.forEach((el) => now.set(el.dataset.flip!, el.offsetTop));
    const before = prevTops.current;
    prevTops.current = now;
    if (viewport.current) viewport.current.scrollTop = 0;
    if (!before) return;
    const cs = getComputedStyle(host);
    const still = parseFloat(cs.getPropertyValue('--alt-travel')) === 0;
    const glide = { duration: ms(cs, '--dur-travel-2', 180), easing: cs.getPropertyValue('--ease-glide').trim() || 'ease' };
    const rise = { duration: ms(cs, '--dur-travel-1', 140), easing: cs.getPropertyValue('--ease-rise').trim() || 'ease-out' };
    // What will be visible once the list has grown to fit: its own cap, not its height before the change.
    const seen = viewport.current ? parseFloat(getComputedStyle(viewport.current).maxHeight) || viewport.current.clientHeight : 400;
    let rising = 0;
    els.forEach((el) => {
      const k = el.dataset.flip!, top = now.get(k)!, was = before.get(k);
      if (was === undefined) {
        if (!still && k.startsWith('o:') && rising < 6 && top < seen) {
          rising++;
          el.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { ...rise, delay: riseDelay(), fill: 'backwards' });
        } else el.animate([{ opacity: 0 }, { opacity: 1 }], rise);
      } else if (!still && Math.abs(was - top) > 0.5) {
        el.animate([{ transform: `translateY(${was - top}px)` }, { transform: 'none' }], glide);
      }
    });
  }, [rowsKey, panelEl]); // eslint-disable-line react-hooks/exhaustive-deps

  // The list's height glides to fit its rows (a size change at one level).
  useIsoLayoutEffect(() => {
    const vp = viewport.current, host = sizer.current;
    if (!vp || !host) return;
    const fit = () => { vp.style.height = host.offsetHeight + 'px'; };
    fit();
    const raf = requestAnimationFrame(() => { vp.dataset.ready = ''; });
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [panelEl]);

  // One highlight, carried to the active row.
  const [hl, setHl] = React.useState<{ y: number; h: number } | null>(null);
  useIsoLayoutEffect(() => {
    const el = activeRow ? rowEls.current.get(activeRow.key) : null;
    setHl(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
    if (el && byKeyboard.current) el.scrollIntoView({ block: 'nearest' });
    byKeyboard.current = false;
  }, [activeRow?.key, rowsKey, panelEl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Say how many results there are, once typing pauses.
  React.useEffect(() => {
    if (!q) { setSaid(''); return; }
    const t = setTimeout(() => setSaid(flat.length ? `${flat.length} result${flat.length === 1 ? '' : 's'}` : 'No results'), 450);
    return () => clearTimeout(t);
  }, [q, flat.length]);

  const choose = (r: Row) => {
    if (r.item.disabled) return;
    if (closeOnSelect) set(false);
    r.item.onSelect?.();
    onSelect?.(r.item, r.group);
  };
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!enabled.length) return;
      byKeyboard.current = true;
      const d = e.key === 'ArrowDown' ? 1 : -1;
      setActive((act + d + enabled.length) % enabled.length);
    } else if (e.key === 'Enter' && activeRow) { e.preventDefault(); choose(activeRow); }
  };

  if (!mounted) return null;
  const label = rest['aria-label'] ?? 'Command palette';
  const activeIndex = activeRow ? flat.indexOf(activeRow) : -1;
  let n = 0;
  return (
    <Layer>
      <div ref={rootRef} className="alt-cmd-root" data-state={state} onKeyDown={onKeyDown}>
        <div className="alt-scrim" onClick={close} />
        <div ref={panelRef} role="dialog" aria-label={label} tabIndex={-1} className={cx('alt-cmd', className)} data-ephemeral={ephemeral ? '' : undefined}>
          <div className="alt-cmd-head">
            <Input className="alt-cmd-field" value={query} placeholder={placeholder} autoComplete="off" spellCheck={false}
              role="combobox" aria-label={placeholder.replace(/[….]+$/, '')} aria-expanded={flat.length > 0} aria-controls={`${id}-list`}
              aria-autocomplete="list" aria-activedescendant={activeIndex >= 0 ? `${id}-o-${activeIndex}` : undefined}
              leading={<SearchIcon />} trailing={<span aria-hidden="true"><Kbd>esc</Kbd></span>}
              onChange={(e) => { setInnerQuery(e.target.value); setActive(0); setOnset(false); onQueryChange?.(e.target.value); }}
              // A query carried in is continued, not replaced: the caret lands after it.
              onFocus={(e) => { if (caretPlaced.current) return; caretPlaced.current = true; const n = e.currentTarget.value.length; e.currentTarget.setSelectionRange(n, n); }}
              onKeyDown={onInputKeyDown} />
          </div>
          <div className="alt-cmd-viewport" ref={viewport}>
            <div ref={sizer}>
            <div className="alt-cmd-list" ref={list} role="listbox" id={`${id}-list`} aria-label="Results">
              <span className="alt-cmd-hl" aria-hidden="true" data-tone={activeRow?.item.tone}
                style={hl ? { transform: `translateY(${hl.y}px)`, height: hl.h, opacity: 1 } : { opacity: 0 }} />
              {view.map((v) => {
                const labelId = `${id}-g-${v.gi}`;
                const groupPredicted = !!v.g.predicted || v.rows.every((r) => r.item.predicted);
                return (
                  <div key={v.gk} role="group" aria-labelledby={v.g.label ? labelId : undefined} className="alt-cmd-group">
                    {v.g.label && <div id={labelId} role="presentation" className="alt-cmd-label" data-flip={'g:' + v.gk} data-predicted={groupPredicted ? '' : undefined}>{v.g.label}</div>}
                    {v.rows.map(() => {
                      const i = n++, r = flat[i], item = r.item;
                      const on = r === activeRow;
                      return (
                        <div key={r.key} id={`${id}-o-${i}`} role="option" aria-selected={on} aria-disabled={item.disabled || undefined}
                          className="alt-cmd-item" data-flip={'o:' + r.key} data-tone={item.tone} data-predicted={r.predicted ? '' : undefined}
                          ref={(el) => { if (el) rowEls.current.set(r.key, el); else rowEls.current.delete(r.key); }}
                          onPointerMove={() => { if (!item.disabled && !on) setActive(enabled.indexOf(r)); }}
                          onClick={() => choose(r)}>
                          {item.icon && <span className="alt-cmd-icon" aria-hidden="true">{item.icon}</span>}
                          <span className="alt-cmd-text">
                            <span className="alt-cmd-title"><Marked text={item.label} ranges={matchRanges(item.label, q)} /></span>
                            {item.description && <span className="alt-cmd-desc">{item.description}</span>}
                          </span>
                          {item.shortcut && <span className="alt-cmd-keys">{item.shortcut.map((k, j) => <Kbd key={j}>{k}</Kbd>)}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {q && !flat.length && (
              <div className="alt-cmd-empty">
                {typeof empty === 'function' ? empty(q) : empty ?? <><b>No results for “{q}”</b>Try another word, or check the spelling.</>}
              </div>
            )}
            </div>
          </div>
          {hints && (
            <div className="alt-cmd-foot" aria-hidden="true">
              <span><Kbd>↑</Kbd><Kbd>↓</Kbd>Move</span><span><Kbd>↵</Kbd>Choose</span><span><Kbd>esc</Kbd>Close</span>
            </div>
          )}
          <span className="alt-sr" aria-live="polite">{said}</span>
        </div>
      </div>
    </Layer>
  );
}
