import * as React from 'react';
import { cx } from './core';
import { Alert, Button } from './controls';
import { Dialog } from './overlays';
import { EditRegion, EditRegionBinder, EditRegionForm, EditRegionSaveResult } from './edit-region';

export type ItemGroupResult = { ok: true } | { ok: false; error: string };
export type ItemGroupCreateResult<T> = { ok: true; value: T } | { ok: false; error: string };
/**
 * How removal is recovered. There's no default: say whether the application can reverse it (immediate, with Undo)
 * or needs confirmation first. A danger button doesn't imply irreversibility.
 */
export type ItemGroupRemoval<T> =
  | { kind: 'recoverable'; undo: (item: T) => void | Promise<unknown> }
  | { kind: 'confirm'; title: (item: T) => string; description?: (item: T) => React.ReactNode; confirmLabel?: string };
/** What renderItem gets. Spread editProps and removeProps onto visible Buttons: they carry the name, the handler and focus repair. */
export interface ItemActionsApi {
  edit: () => void;
  remove: () => void;
  editProps: { onClick: () => void; 'aria-label': string; 'data-action': 'edit' };
  removeProps: { onClick: () => void; 'aria-label': string; 'data-action': 'remove' };
}
export interface ItemGroupProps<T extends Record<string, unknown>> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  items: T[];
  getKey: (item: T) => string;
  /** Names actions (“Edit Production webhook”) and announcements. */
  getLabel: (item: T) => string;
  /** One slat. `edit` and `remove` open the editor and remove the item, with focus and recovery handled. */
  renderItem: (item: T, actions: ItemActionsApi) => React.ReactNode;
  /** The in-place editor's fields (EditRegion's draft binder). */
  renderEditor?: (field: EditRegionBinder<T>, item: T | null) => React.ReactNode;
  /** Save an edited item: the EditRegion contract. */
  onSave?: (draft: T, context: { previousValue: T; changed: (keyof T)[] }) => EditRegionSaveResult<T> | Promise<EditRegionSaveResult<T>>;
  /** Publish a saved item's canonical record (a synchronous setter, no network). */
  onItemChange?: (canonical: T) => void;
  /** The draft for a new item. With onCreate, shows the add slat. */
  newItem?: () => T;
  /** Resolve after `items` includes the new item. */
  onCreate?: (draft: T) => ItemGroupCreateResult<T> | Promise<ItemGroupCreateResult<T>>;
  /** Default “Add item”. */
  addLabel?: string;
  /** Shows grips: Space to pick up, arrows to move, Space to drop. Resolve after `items` is in the new order. */
  onReorder?: (next: T[]) => void | ItemGroupResult | Promise<void | ItemGroupResult>;
  /** Resolve after `items` no longer includes it. */
  onRemove?: (item: T) => void | ItemGroupResult | Promise<void | ItemGroupResult>;
  removal?: ItemGroupRemoval<T>;
  /** Shown when there are no items (an EmptyState). */
  empty?: React.ReactNode;
  className?: string;
}

const SAVE_ERROR = 'That change couldn’t be saved. Try again.';
const asResult = (r: unknown): ItemGroupResult => (r === undefined || (r as ItemGroupResult)?.ok === true ? { ok: true }
  : { ok: false, error: typeof (r as any)?.error === 'string' && (r as any).error ? (r as any).error : SAVE_ERROR });

/**
 * A list of slats changed in the list itself. Slats are the record, flush on the ground with line dividers. One slat
 * at a time lifts into its editor (EditRegion), its neighbours flush and readable; the add slat is an opening; a slat
 * picked up to reorder floats at level 3 over its slot. Removal follows the application's stated policy.
 */
export function ItemGroup<T extends Record<string, unknown>>({ items, getKey, getLabel, renderItem, renderEditor, onSave, onItemChange, newItem, onCreate,
  addLabel = 'Add item', onReorder, onRemove, removal, empty, className, ...aria }: ItemGroupProps<T>) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [carry, setCarry] = React.useState<{ key: string; index: number; from: number } | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [removed, setRemoved] = React.useState<{ item: T; label: string } | null>(null);
  const [confirming, setConfirming] = React.useState<T | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [settled, setSettled] = React.useState<string | null>(null);
  const [polite, setPolite] = React.useState('');
  const [assertive, setAssertive] = React.useState('');
  const root = React.useRef<HTMLDivElement>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const wantFocus = React.useRef<string | null>(null);
  const mounted = React.useRef(true);
  // The new item's draft, made once per add: newItem() may return a fresh id or timestamp on every call, and a new
  // record on each render would read to EditRegion as someone else's change.
  const fresh = React.useRef<T | null>(null);
  if (!adding) fresh.current = null;
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const say = (text: string) => { setAssertive(''); requestAnimationFrame(() => mounted.current && setAssertive(text)); };
  const settle = (key: string) => { setSettled(key); setTimeout(() => mounted.current && setSettled((s) => (s === key ? null : s)), 1200); };

  // Focus goes to a named control inside a slat: `${key}|edit`, `${key}|remove`, `${key}|grip`, '|add' or '|group'.
  React.useLayoutEffect(() => {
    const want = wantFocus.current;
    if (!want) return;
    wantFocus.current = null;
    const [key, part] = want.split('|');
    const scope = key ? root.current?.querySelector<HTMLElement>(`[data-item="${CSS.escape(key)}"]`) : root.current;
    const target = part === 'add' ? addRef.current
      : part === 'group' ? root.current?.querySelector<HTMLElement>('.alt-item-list') ?? root.current
      : part === 'grip' ? scope?.querySelector<HTMLElement>('.alt-item-grip')
      : part === 'field' ? scope?.querySelector<HTMLElement>('.alt-edit-region-form input:not([type="hidden"]), .alt-edit-region-form textarea, .alt-edit-region-form button')
      : scope?.querySelector<HTMLElement>(`[data-action="${part}"]`) ?? scope?.querySelector<HTMLElement>('button');
    target?.focus();
  });

  const display = carry ? (() => { const list = items.filter((x) => getKey(x) !== carry.key); list.splice(carry.index, 0, items.find((x) => getKey(x) === carry.key)!); return list; })() : items;

  const edit = (item: T) => {
    const key = getKey(item);
    if (editing && editing !== key) {
      // One slat at a time: keep the open one rather than discarding its work.
      wantFocus.current = `${editing}|field`; setPolite(`Finish or cancel editing ${getLabel(items.find((x) => getKey(x) === editing) ?? item)} first.`);
      root.current?.querySelector<HTMLElement>(`[data-item="${CSS.escape(editing)}"] input, [data-item="${CSS.escape(editing)}"] button`)?.focus();
      return;
    }
    setAdding(false); setEditing(key); wantFocus.current = `${key}|field`;
  };
  const doRemove = async (item: T) => {
    if (!onRemove) return;
    const key = getKey(item), label = getLabel(item);
    const i = items.findIndex((x) => getKey(x) === key);
    const next = items[i + 1] ?? items[i - 1];
    setBusy(key); setFailure(null);
    let result: ItemGroupResult;
    try { result = asResult(await onRemove(item)); } catch { result = { ok: false, error: SAVE_ERROR }; }
    if (!mounted.current) return;
    setBusy(null);
    if (!result.ok) { setFailure(result.error); setPolite(result.error); wantFocus.current = `${key}|remove`; return; }
    // Focus repair: the next item's Remove, else the previous one's, else the group.
    wantFocus.current = next ? `${getKey(next)}|remove` : onCreate ? '|add' : '|group';
    if (removal?.kind === 'recoverable') { setRemoved({ item, label }); setPolite(`${label} is removed. Undo is available.`); }
    else setPolite(`${label} removed.`);
  };
  const remove = (item: T) => {
    if (!removal || removal.kind === 'recoverable') void doRemove(item);
    else setConfirming(item);
  };
  const undo = async () => {
    if (!removed || removal?.kind !== 'recoverable') return;
    const { item, label } = removed;
    setRemoved(null);
    await removal.undo(item);
    if (!mounted.current) return;
    settle(getKey(item)); wantFocus.current = `${getKey(item)}|remove`; setPolite(`${label} restored.`);
  };

  const pick = (item: T) => {
    if (!onReorder || busy) return;
    const i = items.findIndex((x) => getKey(x) === getKey(item));
    setCarry({ key: getKey(item), index: i, from: i }); wantFocus.current = `${getKey(item)}|grip`;
    say(`Picked up ${getLabel(item)}. Position ${i + 1} of ${items.length}. ↑ and ↓ move it, Space drops it, Escape cancels.`);
  };
  const drop = async () => {
    if (!carry || !onReorder) return;
    const c = carry, item = items.find((x) => getKey(x) === c.key)!;
    if (c.index === c.from) { setCarry(null); wantFocus.current = `${c.key}|grip`; say(`${getLabel(item)} dropped in place.`); return; }
    const next = display;
    setBusy(c.key);
    let result: ItemGroupResult;
    try { result = asResult(await onReorder(next)); } catch { result = { ok: false, error: SAVE_ERROR }; }
    if (!mounted.current) return;
    setBusy(null); setCarry(null); wantFocus.current = `${c.key}|grip`;
    if (!result.ok) { setFailure(result.error); say(`${result.error} ${getLabel(item)} is back at position ${c.from + 1}.`); return; }
    settle(c.key); say(`${getLabel(item)} dropped. Position ${c.index + 1} of ${items.length}.`);
  };
  const onGripKey = (item: T) => (e: React.KeyboardEvent) => {
    const key = getKey(item);
    if (carry?.key !== key) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick(item); } return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const index = Math.max(0, Math.min(items.length - 1, carry.index + (e.key === 'ArrowUp' ? -1 : 1)));
      setCarry({ ...carry, index }); wantFocus.current = `${key}|grip`; say(`Position ${index + 1} of ${items.length}`);
    } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); void drop(); }
    else if (e.key === 'Escape') { e.preventDefault(); setCarry(null); wantFocus.current = `${key}|grip`; say(`Move cancelled. ${getLabel(item)} is back at position ${carry.from + 1}.`); }
  };

  const editor = (item: T | null) => {
    const isNew = !item;
    const value = (item ?? (fresh.current ??= newItem!())) as T;
    const label = isNew ? addLabel.replace(/^Add /, 'New ') : getLabel(value);
    return <EditRegion<T> label={label} editLabel={`Edit ${label}`} value={value} defaultOpen
      saveLabel={isNew ? addLabel : 'Save changes'}
      onOpenChange={(open) => { if (!open) { if (isNew) { setAdding(false); wantFocus.current = '|add'; } else { setEditing(null); wantFocus.current = `${getKey(value)}|edit`; } } }}
      onValueChange={(canonical) => { if (!isNew) { onItemChange?.(canonical); settle(getKey(canonical)); setPolite('Saved'); } }}
      onSave={async (draft, ctx) => {
        if (!isNew) return onSave ? onSave(draft, ctx) : { ok: true, value: draft };
        let r: ItemGroupCreateResult<T>;
        try { r = await onCreate!(draft); } catch { r = { ok: false, error: SAVE_ERROR }; }
        if (r.ok) {
          // Added: the new slat lands with an afterglow, and a fresh add slat is ready for the next one.
          const key = getKey(r.value);
          setTimeout(() => { if (!mounted.current) return; settle(key); setPolite(`Added ${getLabel(r.value as T)}`); setAdding(false); wantFocus.current = '|add'; });
          return { ok: true, value: draft };
        }
        return r;
      }}>
      <EditRegionForm<T>>{(field) => renderEditor?.(field, item)}</EditRegionForm>
    </EditRegion>;
  };

  return <div ref={root} className={cx('alt-item-group', className)} data-carrying={carry ? '' : undefined}>
    {display.length > 0 ? <ul className="alt-item-list" role="list" tabIndex={-1} aria-label={aria['aria-label']} aria-labelledby={aria['aria-labelledby']}>
      {display.map((item, i) => {
        const key = getKey(item);
        const isEditing = editing === key;
        return <li key={key} className="alt-item-slat" data-item={key} data-editing={isEditing ? '' : undefined} data-carried={carry?.key === key ? '' : undefined}
          data-status={busy === key ? 'pending' : undefined} data-settle={settled === key ? '' : undefined} aria-busy={busy === key || undefined}>
          {onReorder && !isEditing && <button type="button" className="alt-item-grip" aria-label={`Move ${getLabel(item)}`} aria-pressed={carry?.key === key}
            aria-describedby={undefined} onKeyDown={onGripKey(item)} onClick={() => { if (!carry) pick(item); }}
            ><Grip /></button>}
          <div className="alt-item-body">
            {isEditing ? editor(item) : renderItem(item, {
              edit: () => edit(item), remove: () => remove(item),
              editProps: { onClick: () => edit(item), 'aria-label': `Edit ${getLabel(item)}`, 'data-action': 'edit' },
              removeProps: { onClick: () => remove(item), 'aria-label': `Remove ${getLabel(item)}`, 'data-action': 'remove' },
            })}
          </div>
          {carry?.key === key && i !== carry.from && <span className="alt-item-slot" aria-hidden="true" />}
        </li>;
      })}
    </ul> : !adding && empty}
    {onCreate && newItem && (adding
      ? <div className="alt-item-new" data-item="__new">{editor(null)}</div>
      : <button ref={addRef} type="button" className="alt-item-add" data-action="add" onClick={() => { if (editing) { edit(items.find((x) => getKey(x) === editing)!); return; } setAdding(true); wantFocus.current = '__new|field'; }}>
          <span className="alt-item-plus" aria-hidden="true">+</span>{addLabel}
        </button>)}
    {removed && <Alert className="alt-item-undo" variant="raised" tone="neutral" onDismiss={() => setRemoved(null)}
      action={<Button size="sm" onClick={() => { void undo(); }}>Undo</Button>}>{removed.label} is removed.</Alert>}
    {failure && <Alert className="alt-item-undo" tone="critical" onDismiss={() => setFailure(null)}>{failure}</Alert>}
    {confirming && removal?.kind === 'confirm' && <Dialog open size="sm" background="stationary" title={removal.title(confirming)} description={removal.description?.(confirming)}
      onOpenChange={(open) => { if (!open) { const k = getKey(confirming); setConfirming(null); wantFocus.current = `${k}|remove`; } }}
      footer={<>
        <Button variant="ghost" data-autofocus="" onClick={() => { const k = getKey(confirming); setConfirming(null); wantFocus.current = `${k}|remove`; }}>Cancel</Button>
        <Button variant="danger" onClick={() => { const item = confirming; setConfirming(null); void doRemove(item); }}>{removal.confirmLabel ?? 'Delete'}</Button>
      </>} focusSelector="[data-autofocus]" />}
    <span className="alt-item-sr" role="status" aria-live="polite" aria-atomic="true">{polite}</span>
    <span className="alt-item-sr" aria-live="assertive" aria-atomic="true">{assertive}</span>
  </div>;
}

const Grip = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">{[4, 8, 12].flatMap((y) => [6, 10].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.2" />))}</svg>;

/* Slat anatomy (shadcn/ui's Item): purely presentational parts. */
export function Item({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cx('alt-item', className)} {...rest} />; }
export function ItemMedia({ variant = 'icon', className, ...rest }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'icon' | 'image' | 'avatar' }) {
  return <div className={cx('alt-item-media', className)} data-variant={variant} {...rest} />;
}
export function ItemContent({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cx('alt-item-content', className)} {...rest} />; }
export function ItemTitle({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cx('alt-item-title', className)} {...rest} />; }
export function ItemDescription({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cx('alt-item-description', className)} {...rest} />; }
/** Visible actions (not hover-only). Give the item's Edit and Remove buttons data-action="edit" and "remove" for focus repair. */
export function ItemActions({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cx('alt-item-actions', className)} {...rest} />; }
export function ItemSeparator({ className, ...rest }: React.HTMLAttributes<HTMLHRElement>) { return <hr className={cx('alt-item-separator', className)} {...rest} />; }
