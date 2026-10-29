import * as React from 'react';
import { cssMs, cx, Icons, useIsoLayoutEffect } from './core';

export type TreeResult = { ok: true } | { ok: false; error: string };
export type TreeCreateResult<T> = { ok: true; value: T } | { ok: false; error: string };
/** Where a node goes: under `parentId` (null for the top level), at `index` among the children once it has left its old place. */
export interface TreeTarget { parentId: string | null; index: number }
export interface TreeMove { id: string; from: TreeTarget; to: TreeTarget }
export interface TreeHandle {
  /** Open a naming well for a new node under `parentId` (null: the top level) at `index` (default: the end). */
  startCreate: (parentId: string | null, index?: number) => void;
  /** Rename a node, as F2 does. */
  startRename: (id: string) => void;
}
export interface TreeProps<T> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  /** Children, or undefined when there are none or they aren't loaded yet. */
  getChildren?: (item: T) => T[] | undefined;
  /** Whether a node can have children (and so shows a chevron) before they're loaded. Default: it has children. */
  hasChildren?: (item: T) => boolean;
  /** Called the first time a node with no loaded children is expanded; an imprint shows until `items` includes them. */
  loadChildren?: (item: T) => void | Promise<void>;
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** Default 'single'. */
  selectionMode?: 'single' | 'none';
  selected?: string | null;
  defaultSelected?: string | null;
  onSelectedChange?: (id: string | null) => void;
  /** Enter's default action (open the page). */
  onAction?: (item: T) => void;
  /** Draw a node's label. Default: getLabel. */
  renderItem?: (item: T) => React.ReactNode;
  /** F2. Resolve after `items` carries the new name. */
  onRename?: (item: T, draft: string) => TreeResult | Promise<TreeResult>;
  /** Space to carry, or drag. Resolve after `items` reflects the move. */
  onMove?: (move: TreeMove) => TreeResult | Promise<TreeResult>;
  /** Refuse a target: a node can never go into its own subtree, whatever this says. */
  canDrop?: (move: TreeMove) => boolean;
  /** Ctrl/Cmd+Enter (sibling after) and Ctrl/Cmd+Shift+Enter (child). Resolve after `items` includes the new node. */
  onCreate?: (request: TreeTarget & { name: string }) => TreeCreateResult<T> | Promise<TreeCreateResult<T>>;
  /** Delete. Your removal policy (recovery or confirmation) applies; the tree only asks. */
  onRemove?: (item: T) => void;
  className?: string;
}

type Row<T> = { item: T; key: string; level: number; parentKey: string | null; index: number; setsize: number; branch: boolean; expanded: boolean; loading: boolean };
type Busy = { key: string; kind: 'rename' | 'move' | 'create'; label: string };
const SAVE_ERROR = 'That change couldn’t be saved. Try again.';
const ms = cssMs;

/**
 * A hierarchy you see all at once and change in place. Nodes are the record, flush on the ground, indented by depth;
 * the selected node is tinted and raised one level. Renaming sinks the label into a well; a carried node floats at
 * level 3 over the slot or node that would receive it; a target node opens into a trench.
 */
function TreeInner<T>({ items, getKey, getLabel, getChildren = () => undefined, hasChildren, loadChildren, expanded: expandedProp,
  defaultExpanded = [], onExpandedChange, selectionMode = 'single', selected: selectedProp, defaultSelected = null, onSelectedChange,
  onAction, renderItem, onRename, onMove, canDrop, onCreate, onRemove, className, ...aria }: TreeProps<T>, ref: React.Ref<TreeHandle>) {
  const [innerExpanded, setInnerExpanded] = React.useState<string[]>(defaultExpanded);
  const expanded = expandedProp ?? innerExpanded;
  const setExpanded = (next: string[]) => { if (!expandedProp) setInnerExpanded(next); onExpandedChange?.(next); };
  const [innerSelected, setInnerSelected] = React.useState<string | null>(defaultSelected);
  const selected = selectedProp !== undefined ? selectedProp : innerSelected;
  const select = (key: string | null) => { if (selectionMode === 'none') return; if (selectedProp === undefined) setInnerSelected(key); onSelectedChange?.(key); };
  const [focus, setFocus] = React.useState<string | null>(null);
  const [renaming, setRenaming] = React.useState<{ key: string; draft: string; error?: string } | null>(null);
  const [creating, setCreating] = React.useState<{ parentId: string | null; index: number; draft: string; error?: string } | null>(null);
  const [carry, setCarry] = React.useState<{ key: string; to: TreeTarget; from: TreeTarget; mode: 'keys' | 'pointer'; into?: string | null; blocked?: boolean } | null>(null);
  const [busy, setBusy] = React.useState<Busy | null>(null);
  const [failed, setFailed] = React.useState<string | null>(null);
  const [settled, setSettled] = React.useState<string | null>(null);
  const [polite, setPolite] = React.useState('');
  const [assertive, setAssertive] = React.useState('');
  const [loading, setLoading] = React.useState<string[]>([]);
  const [pointer, setPointer] = React.useState<{ x: number; y: number; dx: number; dy: number; w: number } | null>(null);
  const root = React.useRef<HTMLUListElement>(null);
  const rowRefs = React.useRef(new Map<string, HTMLLIElement>());
  const fieldRef = React.useRef<HTMLInputElement>(null);
  const typed = React.useRef({ text: '', at: 0 });
  const mounted = React.useRef(true);
  const springTimer = React.useRef<number | undefined>(undefined);
  const wantFocus = React.useRef(false);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; window.clearTimeout(springTimer.current); }; }, []);

  const expandedSet = new Set(expanded);
  const isBranch = (item: T) => !!getChildren(item)?.length || (hasChildren ? hasChildren(item) : false);
  const byKey = React.useMemo(() => {
    const map = new Map<string, { item: T; parentKey: string | null; index: number; siblings: T[] }>();
    const walk = (list: T[], parentKey: string | null) => list.forEach((item, index) => { map.set(getKey(item), { item, parentKey, index, siblings: list }); walk(getChildren(item) ?? [], getKey(item)); });
    walk(items, null);
    return map;
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const childrenOf = (key: string | null) => key === null ? items : getChildren(byKey.get(key)!.item) ?? [];
  const isInside = (key: string | null, ancestor: string) => { for (let k = key; k !== null; k = byKey.get(k)?.parentKey ?? null) if (k === ancestor) return true; return false; };

  // The visible rows. While a node is carried by keyboard, it's shown at its target so the order reads as it will land.
  const rows = React.useMemo(() => {
    const out: Row<T>[] = [];
    const walk = (list: T[], level: number, parentKey: string | null) => {
      let visible = list;
      if (carry?.mode === 'keys') {
        visible = list.filter((x) => getKey(x) !== carry.key);
        if (carry.to.parentId === parentKey) { visible = [...visible]; visible.splice(Math.min(carry.to.index, visible.length), 0, byKey.get(carry.key)!.item); }
      }
      visible.forEach((item, index) => {
        const key = getKey(item);
        const branch = isBranch(item) || (carry?.mode === 'keys' && carry.to.parentId === key);
        const open = branch && (expandedSet.has(key) || (carry?.mode === 'keys' && carry.to.parentId === key));
        out.push({ item, key, level, parentKey, index, setsize: visible.length, branch, expanded: open, loading: loading.includes(key) });
        if (open) walk(getChildren(item) ?? [], level + 1, key);
      });
    };
    walk(items, 1, null);
    return out;
  }, [items, expanded, carry, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleKeys = rows.map((r) => r.key);
  const current = focus && visibleKeys.includes(focus) ? focus : selected && visibleKeys.includes(selected) ? selected : visibleKeys[0] ?? null;

  useIsoLayoutEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    if (renaming || creating) { fieldRef.current?.focus(); fieldRef.current?.select(); }
    else if (current) rowRefs.current.get(current)?.focus({ preventScroll: false });
  });
  const focusRow = (key: string | null) => { if (!key) return; setFocus(key); wantFocus.current = true; };

  const toggle = (row: Row<T>, open = !row.expanded) => {
    if (!row.branch || open === row.expanded) return;
    setExpanded(open ? [...expanded, row.key] : expanded.filter((k) => k !== row.key));
    if (open && loadChildren && !getChildren(row.item)?.length && !loading.includes(row.key)) {
      setLoading((l) => [...l, row.key]);
      Promise.resolve(loadChildren(row.item)).finally(() => { if (mounted.current) setLoading((l) => l.filter((k) => k !== row.key)); });
    }
  };
  const announce = (text: string, urgent = false) => { if (urgent) { setAssertive(''); requestAnimationFrame(() => setAssertive(text)); } else setPolite(text); };
  const place = (to: TreeTarget, carried: string) => {
    const parent = to.parentId === null ? 'the top level' : getLabel(byKey.get(to.parentId)!.item);
    const size = childrenOf(to.parentId).filter((x) => getKey(x) !== carried).length + 1;
    return `${to.parentId === null ? 'At' : 'Inside'} ${parent}, position ${to.index + 1} of ${size}`;
  };
  const allowed = (key: string, to: TreeTarget) => {
    if (to.parentId !== null && isInside(to.parentId, key)) return false;
    const info = byKey.get(key)!;
    return canDrop ? canDrop({ id: key, from: { parentId: info.parentKey, index: info.index }, to }) : true;
  };
  const settle = (key: string) => { setSettled(key); setTimeout(() => mounted.current && setSettled((s) => (s === key ? null : s)), 1200); };

  // ── Writes: each follows the InlineEdit contract. One at a time; a known failure keeps the draft or the old place. ──
  const run = async <R extends TreeResult | TreeCreateResult<T>>(state: Busy, write: () => R | Promise<R>): Promise<R> => {
    setBusy(state); setFailed(null);
    announce(state.kind === 'move' ? `Moving ${state.label}` : state.kind === 'rename' ? 'Saving changes' : `Adding ${state.label}`);
    let result: R;
    try { result = await write(); } catch { result = { ok: false, error: SAVE_ERROR } as R; }
    if (!result || typeof result !== 'object' || (result.ok !== true && (result.ok !== false || typeof (result as any).error !== 'string'))) result = { ok: false, error: SAVE_ERROR } as R;
    if (mounted.current) setBusy(null);
    return result;
  };
  const saveRename = async () => {
    if (!renaming || !onRename || busy) return;
    const info = byKey.get(renaming.key);
    if (!info) { setRenaming(null); return; }
    const draft = renaming.draft;
    if (draft === getLabel(info.item)) { setRenaming(null); focusRow(renaming.key); announce(''); return; }
    if (!draft.trim()) { setRenaming({ ...renaming, error: 'Enter a name.' }); return; }
    const result = await run({ key: renaming.key, kind: 'rename', label: draft }, () => onRename(info.item, draft));
    if (!mounted.current) return;
    if (!result.ok) { setRenaming((r) => r && { ...r, error: result.error }); setFailed(renaming.key); announce(result.error); return; }
    setRenaming(null); settle(renaming.key); announce('Changes saved'); focusRow(renaming.key);
  };
  const saveCreate = async () => {
    if (!creating || !onCreate || busy) return;
    const name = creating.draft.trim();
    if (!name) { setCreating(null); focusRow(current); announce(''); return; }
    const result = await run({ key: '__new', kind: 'create', label: name }, () => onCreate({ parentId: creating.parentId, index: creating.index, name }));
    if (!mounted.current) return;
    if (!result.ok) { setCreating((c) => c && { ...c, error: result.error }); announce(result.error); return; }
    const key = getKey((result as { ok: true; value: T }).value);
    setCreating(null); settle(key); announce(`Added ${name}`); focusRow(key); select(key);
  };
  type Carry = NonNullable<typeof carry>;
  const drop = async (explicit?: Carry) => {
    const c = explicit ?? carry;
    if (!c || busy) return;
    const { key, to, from } = c;
    if (c.blocked || !allowed(key, to)) { setCarry(c.mode === 'pointer' || explicit ? null : c); announce(`Can’t move ${getLabel(byKey.get(key)!.item)} there.`, true); return; }
    const label = getLabel(byKey.get(key)!.item);
    const same = to.parentId === from.parentId && to.index === from.index;
    if (same || !onMove) { setCarry(null); announce(`${label} dropped. ${place(to, key)}`, true); focusRow(key); return; }
    // Hold the preview at the target while the write is pending, then let `items` take over.
    setCarry({ ...c, mode: 'keys' });
    const result = await run({ key, kind: 'move', label }, () => onMove({ id: key, from, to }));
    if (!mounted.current) return;
    setCarry(null);
    if (!result.ok) { setFailed(key); announce(`${result.error} ${label} is back in its place.`, true); focusRow(key); return; }
    if (to.parentId && !expanded.includes(to.parentId)) setExpanded([...expanded, to.parentId]);
    const parent = to.parentId === null ? 'the top level' : getLabel(byKey.get(to.parentId)!.item);
    settle(key); announce(`Moved ${label} ${to.parentId === null ? 'to' : 'into'} ${parent}, position ${to.index + 1} of ${childrenOf(to.parentId).length || to.index + 1}`, true); focusRow(key);
  };

  // Window listeners outlive the render that added them: reach the current drop through a ref.
  const latestDrop = React.useRef(drop);
  latestDrop.current = drop;

  React.useImperativeHandle(ref, () => ({
    startCreate: (parentId, index) => {
      if (!onCreate) return;
      if (parentId && !expanded.includes(parentId)) setExpanded([...expanded, parentId]);
      setRenaming(null); setCreating({ parentId, index: index ?? childrenOf(parentId).length, draft: '' }); wantFocus.current = true;
    },
    startRename: (id) => { const info = byKey.get(id); if (!info || !onRename) return; setCreating(null); setFocus(id); setRenaming({ key: id, draft: getLabel(info.item) }); wantFocus.current = true; },
  }));

  // ── Keyboard: the APG tree view, plus rename, create, carry and remove. ──
  const onKeyDown = (e: React.KeyboardEvent, row: Row<T>) => {
    if (e.target !== e.currentTarget || e.nativeEvent.isComposing) return;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
    const i = visibleKeys.indexOf(row.key);
    const mod = e.ctrlKey || e.metaKey;
    if (carry?.mode === 'keys') { carryKey(e, row, forward, back); return; }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && onMove) {
      e.preventDefault();
      const info = byKey.get(row.key)!;
      const index = info.index + (e.key === 'ArrowUp' ? -1 : 1);
      if (index < 0 || index >= info.siblings.length) return;
      const from = { parentId: info.parentKey, index: info.index };
      void drop({ key: row.key, from, to: { parentId: info.parentKey, index }, mode: 'keys' });
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusRow(visibleKeys[i + 1] ?? row.key); break;
      case 'ArrowUp': e.preventDefault(); focusRow(visibleKeys[i - 1] ?? row.key); break;
      case 'Home': e.preventDefault(); focusRow(visibleKeys[0]); break;
      case 'End': e.preventDefault(); focusRow(visibleKeys[visibleKeys.length - 1]); break;
      case forward: e.preventDefault(); if (row.branch && !row.expanded) toggle(row, true); else if (row.expanded) focusRow(visibleKeys[i + 1]); break;
      case back: e.preventDefault(); if (row.expanded) toggle(row, false); else focusRow(row.parentKey); break;
      case '*': e.preventDefault(); { const sibs = rows.filter((r) => r.parentKey === row.parentKey && r.branch && !r.expanded).map((r) => r.key); if (sibs.length) setExpanded([...expanded, ...sibs]); } break;
      case 'Enter':
        e.preventDefault();
        if (mod && onCreate) {
          if (e.shiftKey) { if (!expanded.includes(row.key)) setExpanded([...expanded, row.key]); setCreating({ parentId: row.key, index: childrenOf(row.key).length, draft: '' }); }
          else { const info = byKey.get(row.key)!; setCreating({ parentId: info.parentKey, index: info.index + 1, draft: '' }); }
          wantFocus.current = true;
        } else if (onAction) onAction(row.item); else select(row.key);
        break;
      case ' ':
        e.preventDefault();
        if (onMove && !busy) { const info = byKey.get(row.key)!; const from = { parentId: info.parentKey, index: info.index }; setCarry({ key: row.key, from, to: from, mode: 'keys' }); announce(`Picked up ${getLabel(row.item)}. ${place(from, row.key)}. Use the arrow keys to move, Space to drop, Escape to cancel.`, true); }
        else select(row.key);
        break;
      case 'F2': if (onRename && !busy) { e.preventDefault(); setRenaming({ key: row.key, draft: getLabel(row.item) }); wantFocus.current = true; } break;
      case 'Delete': if (onRemove) { e.preventDefault(); const next = visibleKeys[i + 1] && !isInside(visibleKeys[i + 1], row.key) ? visibleKeys[i + 1] : visibleKeys[i - 1] ?? null; onRemove(row.item); if (next) focusRow(next); } break;
      default:
        if (e.key.length === 1 && !mod && !e.altKey && /\S/.test(e.key)) {
          const now = Date.now(), t = typed.current;
          t.text = now - t.at < 500 ? t.text + e.key.toLowerCase() : e.key.toLowerCase(); t.at = now;
          const order = [...rows.slice(i + 1), ...rows.slice(0, i + 1)];
          const hit = order.find((r) => getLabel(r.item).toLowerCase().startsWith(t.text)) ?? order.find((r) => getLabel(r.item).toLowerCase().startsWith(t.text[0]));
          if (hit) { e.preventDefault(); focusRow(hit.key); }
        }
    }
  };
  const carryKey = (e: React.KeyboardEvent, row: Row<T>, forward: string, back: string) => {
    if (!carry) return;
    const label = getLabel(byKey.get(carry.key)!.item);
    const at = rows.findIndex((r) => r.key === carry.key);
    const me = rows[at];
    const after = rows.slice(at + 1).find((r) => !isInside(r.key, carry.key));
    const before = rows[at - 1];
    let to: TreeTarget | null = null;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); void drop(); return; }
    if (e.key === 'Escape') { e.preventDefault(); setCarry(null); announce(`Move cancelled. ${label} is back in its place.`, true); focusRow(carry.key); return; }
    if (e.key === 'ArrowDown' && after) to = after.expanded && (getChildren(after.item)?.length ?? 0) > 0 ? { parentId: after.key, index: 0 } : { parentId: after.parentKey, index: after.index + (after.parentKey === carry.to.parentId ? 0 : 1) };
    else if (e.key === 'ArrowUp' && before) to = { parentId: before.parentKey, index: before.index };
    else if (e.key === forward) {
      const sibling = rows.slice(0, at).reverse().find((r) => r.level === me.level && r.parentKey === me.parentKey);
      if (sibling) to = { parentId: sibling.key, index: (getChildren(sibling.item) ?? []).filter((x) => getKey(x) !== carry.key).length };
    } else if (e.key === back && carry.to.parentId !== null) {
      const parent = byKey.get(carry.to.parentId)!;
      to = { parentId: parent.parentKey, index: parent.index + 1 };
    } else return;
    e.preventDefault();
    if (!to) return;
    if (!allowed(carry.key, to)) { announce(`Can’t move ${label} there.`, true); return; }
    setCarry({ ...carry, to });
    announce(place(to, carry.key), true);
    focusRow(carry.key);
  };

  // ── Pointer: carry a node over the tree; the top or bottom quarter of a row is a slot beside it, the middle is "into". ──
  const startPointer = (e: React.PointerEvent, row: Row<T>) => {
    if (!onMove || e.button !== 0 || busy || renaming || creating || (e.target as HTMLElement).closest('.alt-tree-chevron')) return;
    const el = rowRefs.current.get(row.key)!;
    const box = el.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    let moving = false;
    const info = byKey.get(row.key)!;
    const from = { parentId: info.parentKey, index: info.index };
    const move = (ev: PointerEvent) => {
      if (!moving && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return;
      if (!moving) { moving = true; setCarry({ key: row.key, from, to: from, mode: 'pointer' }); }
      setPointer({ x: ev.clientX, y: ev.clientY, dx: start.x - box.left, dy: start.y - box.top, w: box.width });
      const target = targetAt(ev.clientY, row.key);
      setCarry((c) => c && { ...c, to: target?.to ?? from, into: target?.into ?? null, blocked: !!target && !allowed(row.key, target.to) });
      window.clearTimeout(springTimer.current);
      if (target?.into) {
        const into = rows.find((r) => r.key === target.into);
        if (into && into.branch && !into.expanded) springTimer.current = window.setTimeout(() => toggle(into, true), 600);
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
      window.clearTimeout(springTimer.current); setPointer(null);
      if (moving) void latestDrop.current();
    };
    const cancel = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); setPointer(null); setCarry(null); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  };
  const targetAt = (y: number, carried: string): { to: TreeTarget; into: string | null } | null => {
    for (const r of rows) {
      if (r.key === carried || isInside(r.key, carried)) continue;
      const box = rowRefs.current.get(r.key)?.getBoundingClientRect();
      if (!box || y < box.top || y > box.bottom) continue;
      const f = (y - box.top) / box.height;
      const siblings = childrenOf(r.parentKey).filter((x) => getKey(x) !== carried);
      const at = siblings.findIndex((x) => getKey(x) === r.key);
      if (f < 0.25) return { to: { parentId: r.parentKey, index: at }, into: null };
      if (f > 0.75 && !(r.expanded && (getChildren(r.item)?.length ?? 0) > 0)) return { to: { parentId: r.parentKey, index: at + 1 }, into: null };
      if (f > 0.75) return { to: { parentId: r.key, index: 0 }, into: null };
      return { to: { parentId: r.key, index: (getChildren(r.item) ?? []).filter((x) => getKey(x) !== carried).length }, into: r.key };
    }
    return null;
  };
  // The slot line for a pointer carry: before the row now at that place, at the target's depth.
  const slot = (() => {
    if (carry?.mode !== 'pointer' || carry.into || carry.blocked) return null;
    const { parentId, index } = carry.to;
    const siblings = childrenOf(parentId).filter((x) => getKey(x) !== carry.key);
    const level = parentId === null ? 1 : (rows.find((r) => r.key === parentId)?.level ?? 0) + 1;
    const next = siblings[index];
    return { before: next ? getKey(next) : null, after: next ? null : siblings.length ? getKey(siblings[siblings.length - 1]) : parentId, level };
  })();

  useIsoLayoutEffect(() => {
    // Carried rows travel to their new places (FLIP) when a keyboard carry moves them; reduced motion moves them in place.
    const el = carry?.mode === 'keys' ? rowRefs.current.get(carry.key) : null;
    if (!el || typeof el.animate !== 'function') return;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.getPropertyValue('--alt-travel')) === 0) return;
    el.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: ms(cs, '--dur-travel-1', 140), easing: 'ease-out' });
  }, [carry?.to.parentId, carry?.to.index]);

  const nameField = (props: { value: string; error?: string; label: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void; pending: boolean }) => {
    const errorId = `${props.label}-error`.replace(/\s+/g, '-');
    return <span className="alt-tree-name" data-invalid={props.error ? '' : undefined}>
      <input ref={fieldRef} className="alt-tree-name-input" aria-label={props.label} value={props.value} readOnly={props.pending} aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? errorId : undefined}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
          if (e.key === 'Enter') { e.preventDefault(); props.onSave(); }
          else if (e.key === 'Escape') { e.preventDefault(); if (!props.pending) props.onCancel(); else announce('Saving changes. Wait for the result.'); }
        }} />
      {props.error && <span id={errorId} className="alt-tree-error" role="alert"><Icons.AlertCircle size={13} />{props.error}</span>}
    </span>;
  };

  const creatingRow = (row: Row<T> | null, level: number) => creating && <li key="__new" role="none" className="alt-tree-row alt-tree-new" style={{ ['--level' as any]: level }}>
    <span className="alt-tree-indent" aria-hidden="true" />
    {nameField({ value: creating.draft, error: creating.error, label: creating.parentId === null ? 'Name new item' : `Name new item in ${getLabel(byKey.get(creating.parentId)!.item)}`, pending: busy?.kind === 'create',
      onChange: (draft) => setCreating({ ...creating, draft, error: undefined }), onSave: () => { void saveCreate(); }, onCancel: () => { setCreating(null); focusRow(row?.key ?? current); } })}
  </li>;
  // Where the naming well goes: before the node now at that index, or after the parent's last visible descendant.
  const createBefore = creating ? (childrenOf(creating.parentId)[creating.index] ? getKey(childrenOf(creating.parentId)[creating.index]) : null) : null;
  const createAfterLast = (() => {
    if (!creating || createBefore) return null;
    const siblings = childrenOf(creating.parentId);
    if (!siblings.length) return creating.parentId ?? '__top';
    let last = rows.findIndex((r) => r.key === getKey(siblings[siblings.length - 1]));
    while (rows[last + 1] && isInside(rows[last + 1].key, getKey(siblings[siblings.length - 1]))) last++;
    return rows[last]?.key ?? null;
  })();
  const createLevel = creating ? (creating.parentId === null ? 1 : (rows.find((r) => r.key === creating.parentId)?.level ?? 0) + 1) : 1;

  const carriedRow = carry ? rows.find((r) => r.key === carry.key) : null;
  return <div className={cx('alt-tree-wrap', className)} data-carrying={carry ? carry.mode : undefined}>
    <ul ref={root} role="tree" className="alt-tree" aria-label={aria['aria-label']} aria-labelledby={aria['aria-labelledby']}>
      {creating && createAfterLast === '__top' && creatingRow(null, createLevel)}
      {rows.map((row) => {
        const pending = busy?.key === row.key;
        const isRenaming = renaming?.key === row.key;
        const into = carry?.mode === 'pointer' && carry.into === row.key;
        return <React.Fragment key={row.key}>
          {creating && createBefore === row.key && creatingRow(row, createLevel)}
          {slot && slot.before === row.key && <li role="none" className="alt-tree-slot" style={{ ['--level' as any]: slot.level }} aria-hidden="true" />}
          <li ref={(el) => { if (el) rowRefs.current.set(row.key, el); else rowRefs.current.delete(row.key); }} role="treeitem" className="alt-tree-row"
            aria-level={row.level} aria-setsize={row.setsize} aria-posinset={row.index + 1} aria-expanded={row.branch ? row.expanded : undefined}
            aria-selected={selectionMode === 'none' ? undefined : selected === row.key} aria-busy={pending || row.loading || undefined}
            tabIndex={row.key === current && !isRenaming ? 0 : -1} style={{ ['--level' as any]: row.level }}
            data-carried={carry?.key === row.key ? carry.mode : undefined} data-into={into ? (carry?.blocked ? 'blocked' : '') : undefined}
            data-status={pending ? 'pending' : failed === row.key ? 'failed' : undefined} data-settle={settled === row.key ? '' : undefined}
            data-renaming={isRenaming ? '' : undefined}
            onKeyDown={(e) => onKeyDown(e, row)} onFocus={(e) => { if (e.target === e.currentTarget) setFocus(row.key); }}
            onClick={(e) => { if ((e.target as HTMLElement).closest('.alt-tree-name')) return; setFocus(row.key); if (!(e.target as HTMLElement).closest('.alt-tree-chevron')) select(row.key); }}
            onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest('.alt-tree-chevron, .alt-tree-name')) { if (row.branch) toggle(row); else onAction?.(row.item); } }}
            onPointerDown={(e) => startPointer(e, row)}>
            <span className="alt-tree-indent" aria-hidden="true" />
            {row.branch ? <span className="alt-tree-chevron" aria-hidden="true" data-open={row.expanded ? '' : undefined} onClick={() => toggle(row)}><Icons.ChevronDown size={14} /></span>
              : <span className="alt-tree-leaf" aria-hidden="true" />}
            {isRenaming ? nameField({ value: renaming.draft, error: renaming.error, label: `Rename ${getLabel(row.item)}`, pending,
              onChange: (draft) => { setRenaming({ ...renaming, draft, error: undefined }); setFailed(null); }, onSave: () => { void saveRename(); },
              onCancel: () => { setRenaming(null); setFailed(null); focusRow(row.key); announce(''); } })
              : <span className="alt-tree-label">{renderItem ? renderItem(row.item) : getLabel(row.item)}</span>}
            {carry?.key === row.key && (getChildren(row.item)?.length ?? 0) > 0 && <span className="alt-tree-count" aria-hidden="true">+{countDescendants(row.item, getChildren)}</span>}
          </li>
          {row.loading && row.expanded && <li role="none" className="alt-tree-row alt-tree-loading" style={{ ['--level' as any]: row.level + 1 }} aria-hidden="true">
            <span className="alt-tree-indent" /><span className="alt-tree-leaf" /><span className="alt-skeleton alt-tree-imprint" />
          </li>}
          {creating && createAfterLast === row.key && creatingRow(row, createLevel)}
          {slot && !slot.before && slot.after === row.key && <li role="none" className="alt-tree-slot" style={{ ['--level' as any]: slot.level }} aria-hidden="true" />}
        </React.Fragment>;
      })}
    </ul>
    {carry?.mode === 'pointer' && pointer && carriedRow && <div className="alt-tree-ghost" aria-hidden="true"
      style={{ left: pointer.x - pointer.dx, top: pointer.y - pointer.dy, width: Math.min(pointer.w, 320) }}>
      <span className="alt-tree-label">{renderItem ? renderItem(carriedRow.item) : getLabel(carriedRow.item)}</span>
      {(getChildren(carriedRow.item)?.length ?? 0) > 0 && <span className="alt-tree-count">+{countDescendants(carriedRow.item, getChildren)}</span>}
    </div>}
    <span className="alt-tree-status" role="status" aria-live="polite" aria-atomic="true">{polite}</span>
    <span className="alt-tree-status" aria-live="assertive" aria-atomic="true">{assertive}</span>
  </div>;
}
function countDescendants<T>(item: T, getChildren: (item: T) => T[] | undefined): number {
  return (getChildren(item) ?? []).reduce((n, child) => n + 1 + countDescendants(child, getChildren), 0);
}

export const Tree = React.forwardRef(TreeInner) as <T>(props: TreeProps<T> & { ref?: React.Ref<TreeHandle> }) => React.ReactElement;
