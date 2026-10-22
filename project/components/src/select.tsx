import * as React from 'react';
import { cx, Icons, useApproach, useControllable, useIsoLayoutEffect, useKeyFocus, useOutside, usePresence } from './core';
import { commandScore } from './command';

const EXIT_3 = 160; // ≈ dur-travel-3 × 0.7

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  /** Plain text for typeahead, filtering and the field. Needed when label isn't a string. */
  textValue?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}
export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  textValue?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}
/** Declares one option of a Select. It renders nothing itself; Select reads its props. */
export function SelectItem(_: SelectItemProps): React.ReactElement | null { return null; }

const textOf = (o: SelectOption) => o.textValue ?? (typeof o.label === 'string' || typeof o.label === 'number' ? String(o.label) : o.value);
function collect(items: SelectOption[] | undefined, children: React.ReactNode): SelectOption[] {
  if (items) return items;
  const out: SelectOption[] = [];
  React.Children.forEach(children, (c) => {
    if (!React.isValidElement(c) || c.type !== SelectItem) return;
    const p = c.props as SelectItemProps;
    out.push({ value: p.value, label: p.children, textValue: p.textValue, description: p.description, icon: p.icon, disabled: p.disabled });
  });
  return out;
}

/** The Checkbox family's tick: the same path and stroke, here in accent-ink on the chosen row. */
const Tick = () => (
  <svg className="alt-select-tick" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-6.5" pathLength={16} />
  </svg>
);
const Chevron = () => <Icons.ChevronDown className="alt-select-chevron" size={16} />;

/** Opens downward unless there's more room above the field than below it (within whatever clips it). */
function useSide(open: boolean, anchor: React.RefObject<HTMLElement | null>, list: React.RefObject<HTMLElement | null>) {
  const [side, setSide] = React.useState<'bottom' | 'top'>('bottom');
  useIsoLayoutEffect(() => {
    if (!open || !anchor.current || !list.current) return;
    const a = anchor.current.getBoundingClientRect(), need = list.current.offsetHeight + 12;
    let lo = 0, hi = window.innerHeight;
    for (let p = anchor.current.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowY;
      if (o !== 'visible') { const r = p.getBoundingClientRect(); lo = Math.max(lo, r.top); hi = Math.min(hi, r.bottom); }
    }
    setSide(hi - a.bottom >= need || a.top - lo < hi - a.bottom ? 'bottom' : 'top');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return side;
}

/** A brief afterglow on a newly chosen value: it settles into the field. */
function useGlow(value: string) {
  const [glow, setGlow] = React.useState<'a' | 'b' | undefined>(undefined);
  const first = React.useRef(true);
  React.useEffect(() => { if (first.current) { first.current = false; return; } if (value) setGlow((g) => (g === 'a' ? 'b' : 'a')); }, [value]);
  return glow;
}

/** Finds the label element that names a control by id, so the list can carry the same name. */
function useLabelId(controlId: string, fallback: string) {
  const [labelId, setLabelId] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(controlId)}"]`);
    if (!label) { setLabelId(undefined); return; }
    if (!label.id) label.id = fallback;
    setLabelId(label.id);
  }, [controlId, fallback]);
  return labelId;
}

type ListProps = {
  id: string; options: SelectOption[]; active: number; value: string; state: 'open' | 'closed'; side: 'bottom' | 'top';
  query?: string; empty?: React.ReactNode; listRef: React.RefObject<HTMLDivElement | null>; labelledBy?: string; label?: string;
  focusable: boolean; onActive: (i: number) => void; onChoose: (i: number) => void; onKeyDown?: (e: React.KeyboardEvent) => void;
};
function OptionList({ id, options, active, value, state, side, query, empty, listRef, labelledBy, label, focusable, onActive, onChoose, onKeyDown }: ListProps) {
  const rows = React.useRef<(HTMLDivElement | null)[]>([]);
  const [hl, setHl] = React.useState<{ y: number; h: number } | null>(null);
  useIsoLayoutEffect(() => {
    const el = active >= 0 ? rows.current[active] : null;
    setHl(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
    if (el && listRef.current) {
      const l = listRef.current;
      if (el.offsetTop < l.scrollTop) l.scrollTop = el.offsetTop - 4;
      else if (el.offsetTop + el.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = el.offsetTop + el.offsetHeight - l.clientHeight + 4;
    }
  }, [active, options.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const marks = (o: SelectOption) => {
    const t = textOf(o);
    if (!query || typeof o.label !== 'string') return o.label;
    const i = t.toLowerCase().indexOf(query.toLowerCase());
    if (i < 0) return o.label;
    return <>{t.slice(0, i)}<mark className="alt-cmd-match">{t.slice(i, i + query.length)}</mark>{t.slice(i + query.length)}</>;
  };
  return (
    <div ref={listRef as React.Ref<HTMLDivElement>} id={id} role="listbox" tabIndex={focusable ? -1 : undefined} aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label}
      aria-activedescendant={focusable && active >= 0 ? `${id}-${active}` : undefined}
      className="alt-pop alt-menu alt-select-list" data-state={state} data-side={side} onKeyDown={onKeyDown}
      onMouseDown={(e) => e.preventDefault()}>
      <span className="alt-menu-hl" aria-hidden="true" style={hl ? { transform: `translateY(${hl.y}px)`, height: hl.h, opacity: 1 } : { opacity: 0 }} />
      {options.map((o, i) => (
        <div key={o.value} id={`${id}-${i}`} ref={(el) => { rows.current[i] = el; }} role="option" aria-selected={o.value === value}
          aria-disabled={o.disabled || undefined} data-active={i === active ? '' : undefined} className="alt-menu-item alt-select-option" style={{ ['--i' as any]: Math.min(i, 10) }}
          onPointerMove={() => { if (!o.disabled && i !== active) onActive(i); }} onClick={() => onChoose(i)}>
          {o.icon && <span className="alt-menu-icon">{o.icon}</span>}
          <span className="alt-menu-text">{marks(o)}{o.description && <span className="alt-select-desc">{o.description}</span>}</span>
          {o.value === value && <Tick />}
        </div>
      ))}
      {!options.length && <div className="alt-select-empty">{empty}</div>}
    </div>
  );
}

interface FieldLike {
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** Drops the field to trench depth. Field sets it for you when it has an error. */
  invalid?: boolean;
  /** sm 34px, md 40px, as Input. Default 'md'. */
  size?: 'sm' | 'md';
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  /** Start with the list open (for documentation). */
  defaultOpen?: boolean;
}

export interface SelectProps extends FieldLike {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The options as data. Or pass SelectItem children. */
  items?: SelectOption[];
  children?: React.ReactNode;
}

/**
 * Choosing a value is filling a field, so the trigger is an opening built like Input: its back wall shows while it's
 * empty, its floor rises flush once a value is chosen, and it drops to trench depth when invalid. The list rises from
 * the field's edge at level 3 with one gliding highlight; the chosen option wears the Checkbox family's tick.
 */
export function Select({ value, defaultValue = '', onValueChange, items, children, id, name, required, disabled, invalid, size = 'md',
  placeholder = 'Choose…', defaultOpen = false, className, ...aria }: SelectProps) {
  const options = collect(items, children);
  const [v, set] = useControllable(value, defaultValue, onValueChange);
  const [open, setOpen] = React.useState(defaultOpen);
  const [active, setActive] = React.useState(() => (defaultOpen ? options.findIndex((o) => o.value === (value ?? defaultValue)) : -1));
  const auto = React.useId();
  const triggerId = id ?? auto + '-trigger';
  const listId = auto + '-list';
  const root = React.useRef<HTMLDivElement>(null);
  const field = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const typed = React.useRef({ text: '', at: 0 });
  const { mounted, state } = usePresence(open, EXIT_3);
  const side = useSide(mounted, field, list);
  const glow = useGlow(v);
  const labelId = useLabelId(triggerId, auto + '-label');
  useApproach();
  useKeyFocus();
  const chosen = options.find((o) => o.value === v);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const close = React.useCallback((refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus({ preventScroll: true }); }, []);
  useOutside(root, open, () => close(false));
  React.useEffect(() => { if (state === 'open') list.current?.focus({ preventScroll: true }); }, [state]);

  const openAt = (i: number) => { setActive(i); setOpen(true); };
  const current = () => { const i = options.findIndex((o) => o.value === v && !o.disabled); return i >= 0 ? i : enabled[0] ?? -1; };
  const step = (d: number) => { const p = enabled.indexOf(active); setActive(enabled[Math.max(0, Math.min(enabled.length - 1, (p < 0 ? (d > 0 ? -1 : enabled.length) : p) + d))]); };
  // Typeahead: letters typed within half a second find the next option that starts with them.
  const seek = (key: string, from: number) => {
    const now = Date.now(), t = typed.current;
    t.text = now - t.at < 500 ? t.text + key.toLowerCase() : key.toLowerCase();
    t.at = now;
    const same = t.text.split('').every((c) => c === t.text[0]);
    const q = same ? t.text[0] : t.text;
    const order = [...enabled.filter((i) => i > from), ...enabled.filter((i) => i <= from)];
    const start = same ? order : [from, ...order].filter((i) => i >= 0);
    return start.find((i) => textOf(options[i]).toLowerCase().startsWith(q)) ?? -1;
  };
  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    set(o.value);
    close();
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openAt(e.key === 'ArrowUp' && v === '' ? enabled[enabled.length - 1] : current()); }
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) { const i = seek(e.key, current()); if (i >= 0) { e.preventDefault(); openAt(i); } }
  };
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(enabled[0]); }
    else if (e.key === 'End') { e.preventDefault(); setActive(enabled[enabled.length - 1]); }
    else if (e.key === 'Enter' || (e.key === ' ' && Date.now() - typed.current.at > 500)) { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close(false);
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) { const i = seek(e.key, active); if (i >= 0) { e.preventDefault(); setActive(i); } }
  };

  return (
    <div ref={root} className={cx('alt-select', className)} data-open={open ? '' : undefined}>
      <div ref={field} className="alt-input" data-size={size} data-approach="56" data-filled={chosen ? '' : undefined}
        data-invalid={invalid ? '' : undefined} data-disabled={disabled ? '' : undefined}>
        <button ref={trigger} id={triggerId} type="button" className="alt-select-trigger" disabled={disabled}
          aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-invalid={invalid || undefined} aria-required={required || undefined}
          {...aria} onClick={() => (open ? close() : openAt(current()))} onKeyDown={onTriggerKey}>
          <span className="alt-select-value" data-placeholder={chosen ? undefined : ''} data-glow={glow}>
            {chosen ? <>{chosen.icon && <span className="alt-select-icon">{chosen.icon}</span>}{chosen.label}</> : placeholder}
          </span>
          <Chevron />
        </button>
      </div>
      {name && <input type="hidden" name={name} value={v} />}
      {mounted && (
        <OptionList id={listId} options={options} active={active} value={v} state={state} side={side} listRef={list} labelledBy={labelId}
          label={aria['aria-label']} focusable onActive={setActive} onChoose={choose} onKeyDown={onListKey} />
      )}
    </div>
  );
}

export interface ComboboxProps extends FieldLike {
  items: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Score an option against what's typed: 0 (or false) hides it, higher ranks it first. Default: the CommandPalette's ranking. */
  filter?: (option: SelectOption, query: string) => number | boolean;
  /** Shown when nothing matches. Default "No matches". */
  empty?: React.ReactNode;
}

/**
 * An editable Select: type to filter, choose to fill. What you type is a query, not yet a value, so the field stays an
 * opening (its back wall showing) until an option is chosen; then its floor rises flush.
 */
export function Combobox({ items, value, defaultValue = '', onValueChange, filter, empty = 'No matches', id, name, required, disabled, invalid,
  size = 'md', placeholder = 'Type to search…', defaultOpen = false, className, ...aria }: ComboboxProps) {
  const [v, set] = useControllable(value, defaultValue, onValueChange);
  const chosen = items.find((o) => o.value === v);
  const [text, setText] = React.useState(chosen ? textOf(chosen) : '');
  const [typing, setTyping] = React.useState(false);
  const [open, setOpen] = React.useState(defaultOpen);
  const [active, setActive] = React.useState(() => (defaultOpen ? items.findIndex((o) => o.value === (value ?? defaultValue)) : -1));
  const auto = React.useId();
  const inputId = id ?? auto + '-input';
  const listId = auto + '-list';
  const root = React.useRef<HTMLDivElement>(null);
  const field = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const { mounted, state } = usePresence(open, EXIT_3);
  const side = useSide(mounted, field, list);
  const glow = useGlow(v);
  const labelId = useLabelId(inputId, auto + '-label');
  useApproach();
  useKeyFocus();
  // A controlled value that changes from outside resets the text.
  React.useEffect(() => { if (!typing) setText(chosen ? textOf(chosen) : ''); }, [v]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = typing ? text.trim() : '';
  const score = (o: SelectOption) => { const s = filter ? filter(o, q) : commandScore(textOf(o), q); return typeof s === 'boolean' ? (s ? 1 : 0) : s; };
  const shown = q ? items.map((o, i) => ({ o, i, s: score(o) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.o) : items;
  const enabled = shown.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const restore = () => { setText(chosen ? textOf(chosen) : ''); setTyping(false); };
  const close = () => { setOpen(false); };
  // Leaving the field, by Tab or by clicking away, commits what's typed: an exact name chooses it, an empty field clears
  // the value, anything else goes back to the value it had.
  const commit = () => {
    close();
    if (!typing) return;
    const exact = items.find((o) => !o.disabled && textOf(o).toLowerCase() === text.trim().toLowerCase());
    if (exact) { set(exact.value); setText(textOf(exact)); setTyping(false); }
    else if (!text.trim()) { set(''); setTyping(false); }
    else restore();
  };
  useOutside(root, open, commit);

  const choose = (i: number) => {
    const o = shown[i];
    if (!o || o.disabled) return;
    set(o.value); setText(textOf(o)); setTyping(false); close();
    input.current?.focus({ preventScroll: true });
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { const i = shown.findIndex((o) => o.value === v); setActive(e.altKey ? -1 : i >= 0 ? i : enabled[0] ?? -1); setOpen(true); return; }
      const p = enabled.indexOf(active), d = e.key === 'ArrowDown' ? 1 : -1;
      setActive(enabled[(p < 0 ? (d > 0 ? -1 : enabled.length) : p + d + enabled.length) % enabled.length] ?? enabled[0]);
    } else if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') {
      if (open || typing) { e.preventDefault(); e.stopPropagation(); close(); restore(); }
    } else if (e.key === 'Tab' && open) close();
  };
  const onBlur = (e: React.FocusEvent) => { if (!root.current?.contains(e.relatedTarget as Node)) commit(); };
  const filled = !!chosen && !typing;
  return (
    <div ref={root} className={cx('alt-select alt-combobox', className)} data-open={open ? '' : undefined}>
      <div ref={field} className="alt-input" data-size={size} data-approach="56" data-filled={filled ? '' : undefined}
        data-invalid={invalid ? '' : undefined} data-disabled={disabled ? '' : undefined}>
        <input ref={input} id={inputId} type="text" role="combobox" autoComplete="off" spellCheck={false} disabled={disabled}
          aria-autocomplete="list" aria-expanded={open} aria-controls={mounted ? listId : undefined} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={invalid || undefined} aria-required={required || undefined} placeholder={placeholder} value={text} data-glow={glow}
          {...aria} onKeyDown={onKey} onBlur={onBlur}
          onChange={(e) => { setText(e.target.value); setTyping(true); setOpen(true); setActive(0); }} />
        <button type="button" tabIndex={-1} className="alt-select-toggle" aria-label="Show options" disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { if (open) { close(); restore(); } else { const i = items.findIndex((o) => o.value === v); setActive(i); setOpen(true); } input.current?.focus(); }}>
          <Chevron />
        </button>
      </div>
      {name && <input type="hidden" name={name} value={v} />}
      {mounted && (
        <OptionList id={listId} options={shown} active={Math.min(active, shown.length - 1)} value={v} state={state} side={side} listRef={list} labelledBy={labelId}
          label={aria['aria-label']} focusable={false} query={q} empty={empty} onActive={setActive} onChoose={choose} />
      )}
    </div>
  );
}
