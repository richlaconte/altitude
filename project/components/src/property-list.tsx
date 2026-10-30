import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Button } from './controls';
import { InlineEdit, InlineEditControl, InlineEditSaveResult } from './inline-edit';
import { EditRegion, EditRegionBinder, EditRegionForm, EditRegionSaveResult } from './edit-region';

type Proposal = { label: string; accept: () => void; reject: () => void };
type ListCtx = { layout: 'stacked' | 'inline'; locked: boolean; proposedBy: string; register?: (id: string, p: Proposal | null) => void; announce?: (text: string) => void };
const Ctx = React.createContext<ListCtx>({ layout: 'stacked', locked: false, proposedBy: 'Assistant' });

export interface PropertyListEditAll<T extends Record<string, unknown>> {
  /** The whole record, edited together (for cross-field rules such as start before end). */
  value: T;
  onValueChange: (canonical: T) => void;
  onSave: (draft: T, context: { previousValue: T; changed: (keyof T)[] }) => EditRegionSaveResult<T> | Promise<EditRegionSaveResult<T>>;
  validate?: (draft: T) => Partial<Record<keyof T, string>> | undefined | Promise<Partial<Record<keyof T, string>> | undefined>;
  renderEditor: (field: EditRegionBinder<T>) => React.ReactNode;
  /** Names the region and its button: “Edit all <label>”. Default “details”. */
  label?: string;
}
export interface PropertyListProps<T extends Record<string, unknown> = Record<string, unknown>> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** stacked: label above value (a sidebar). inline: label beside value (a summary). Default 'stacked'. */
  layout?: 'stacked' | 'inline';
  /** Single-key shortcuts (an item's `shortcut`) while focus is in the list. Off by default (WCAG 2.1.4): offer a way to turn them on. */
  shortcuts?: boolean;
  /** An “Edit all” button that lifts the whole list into one EditRegion. */
  editAll?: PropertyListEditAll<T>;
  /** Who proposed the items' `proposed` values ("Assistant", "Maya"). Default "Assistant". */
  proposedBy?: string;
  className?: string;
  children: React.ReactNode;
}
export interface PropertyListItemProps<V> {
  label: string;
  value: V;
  /** Read mode. Default: the value as text. */
  renderValue?: (value: V) => React.ReactNode;
  /** An empty value's words, shown in a small well. Default “Not set”. */
  emptyLabel?: string;
  /** Makes the item editable (InlineEdit's contract). Without it, the value is read-only text. */
  onSave?: (draft: V, context: { previousValue: V }) => InlineEditSaveResult<V> | Promise<InlineEditSaveResult<V>>;
  onValueChange?: (canonical: V) => void;
  editor?: (control: InlineEditControl<V>) => React.ReactNode;
  commit?: 'explicit' | 'on-choose';
  validate?: (draft: V) => string | undefined | Promise<string | undefined>;
  required?: boolean;
  isEqual?: (a: V, b: V) => boolean;
  /** A single key that opens this item while focus is in the list (with `shortcuts` on the list). Case doesn't matter. */
  shortcut?: string;
  /**
   * A change someone proposes (an agent reading an email, a teammate's suggested edit): the current value with the
   * proposed one beside it, raised, with Accept and Reject. Nothing touches the record until it's accepted; accepting
   * saves through onSave (hovering as pending, then settling).
   */
  proposed?: V;
  /** Called once the proposal is accepted (and saved) or rejected: clear `proposed` here. */
  onProposalResolved?: (accepted: boolean, value: V) => void;
  className?: string;
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * One record's properties as label–value pairs. The properties are the record, on the ground; an unset value is a
 * small opening; an editable value is one plate that lifts when pointed at, because clicking it opens its editor
 * (InlineEdit, with any control). “Edit all” lifts the whole list into one EditRegion for cross-field rules.
 */
export function PropertyList<T extends Record<string, unknown> = Record<string, unknown>>({ layout = 'stacked', shortcuts = false, editAll, proposedBy = 'Assistant', className, children, ...aria }: PropertyListProps<T>) {
  const [all, setAll] = React.useState(false);
  const [proposals, setProposals] = React.useState<Record<string, Proposal>>({});
  const register = React.useCallback((id: string, p: Proposal | null) => setProposals((ps) => {
    if (!p) { if (!(id in ps)) return ps; const { [id]: _, ...rest } = ps; return rest; }
    return ps[id] === p ? ps : { ...ps, [id]: p };
  }), []);
  const [said, setSaid] = React.useState('');
  const pending = Object.values(proposals);
  const root = React.useRef<HTMLDivElement>(null);
  const allButton = React.useRef<HTMLButtonElement>(null);
  const backToButton = React.useRef(false);
  React.useLayoutEffect(() => { if (!all && backToButton.current) { backToButton.current = false; allButton.current?.focus(); } }, [all]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!shortcuts || all || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"]')) return;
    const target = root.current?.querySelector<HTMLElement>(`[aria-keyshortcuts="${CSS.escape(e.key.toLowerCase())}"]`);
    if (target) { e.preventDefault(); target.click(); }
  };
  const label = editAll?.label ?? 'details';
  return <Ctx.Provider value={{ layout, locked: all, proposedBy, register, announce: setSaid }}>
    <div ref={root} className={cx('alt-property-list', className)} data-layout={layout} onKeyDown={onKeyDown}>
      {pending.length > 0 && !all && <div className="alt-property-proposals" role="group" aria-label={`${pending.length} proposed ${pending.length === 1 ? 'change' : 'changes'}`}>
        <span className="alt-property-proposals-text"><Icons.Pencil size={14} aria-hidden="true" />{pending.length} proposed {pending.length === 1 ? 'change' : 'changes'} by {proposedBy}</span>
        <Button size="sm" variant="ghost" onClick={() => pending.forEach((p) => p.reject())}>Reject all</Button>
        <Button size="sm" variant="secondary" onClick={() => pending.forEach((p) => p.accept())}>Accept all</Button>
      </div>}
      {editAll && !all && <div className="alt-property-tools">
        <Button ref={allButton} size="sm" variant="ghost" onClick={() => setAll(true)}>Edit all {label}</Button>
      </div>}
      {editAll && all ? <EditRegion<T> label={label} value={editAll.value} defaultOpen validate={editAll.validate} onValueChange={editAll.onValueChange} onSave={editAll.onSave}
        onOpenChange={(open) => { if (!open) { backToButton.current = true; setAll(false); } }}>
        <EditRegionForm<T>>{(field) => editAll.renderEditor(field)}</EditRegionForm>
      </EditRegion>
        : <dl className="alt-property-dl" aria-label={aria['aria-label']} aria-labelledby={aria['aria-labelledby']}>{children}</dl>}
      {editAll && all && <AutoFocusFirst root={root} />}
      <span className="alt-sr" aria-live="polite">{said}</span>
    </div>
  </Ctx.Provider>;
}
/** Focuses the first field once “Edit all” has opened. */
function AutoFocusFirst({ root }: { root: React.RefObject<HTMLDivElement | null> }) {
  React.useLayoutEffect(() => { root.current?.querySelector<HTMLElement>('.alt-edit-region-form input:not([type="hidden"]), .alt-edit-region-form textarea, .alt-edit-region-form button')?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** One property. With onSave its value is an editable plate (InlineEdit); without, read-only text. */
export function PropertyListItem<V>({ label, value, renderValue, emptyLabel = 'Not set', onSave, onValueChange, editor, commit, validate, required, isEqual, shortcut, proposed, onProposalResolved, className }: PropertyListItemProps<V>) {
  const { locked, proposedBy, register, announce } = React.useContext(Ctx);
  const show = (v: V) => (isEmpty(v) ? <span className="alt-property-empty">{emptyLabel}</span> : renderValue ? renderValue(v) : String(v));
  const read = show(value);
  const same = (a: V, b: V) => (isEqual ? isEqual(a, b) : JSON.stringify(a) === JSON.stringify(b));
  const open = proposed !== undefined && !same(value, proposed);
  const [phase, setPhase] = React.useState<'idle' | 'saving' | 'failed'>('idle');
  const [error, setError] = React.useState('');
  const [landed, setLanded] = React.useState(0);
  const { style, ...depth } = useDepth({ status: phase === 'saving' ? 'pending' : phase === 'failed' ? 'failed' : undefined, settle: landed || undefined });
  const name = label.toLowerCase();
  const accept = async () => {
    if (proposed === undefined || phase === 'saving') return;
    setPhase('saving'); setError('');
    const res = onSave ? await onSave(proposed, { previousValue: value }) : { ok: true as const, value: proposed };
    if (res.ok) { setPhase('idle'); setLanded((n) => n + 1); onValueChange?.(res.value); onProposalResolved?.(true, res.value); announce?.(`New ${name} saved.`); }
    else { setPhase('failed'); setError(res.error); announce?.(`Couldn't save the new ${name}.`); }
  };
  const reject = () => { if (proposed === undefined || phase === 'saving') return; setPhase('idle'); onProposalResolved?.(false, proposed); announce?.(`Rejected the new ${name}.`); };
  // The list's Accept all / Reject all call the latest of these.
  const api = React.useRef<Proposal>({ label, accept, reject });
  api.current.accept = accept; api.current.reject = reject;
  const id = React.useId();
  React.useEffect(() => { register?.(id, open ? api.current : null); return () => register?.(id, null); }, [open, id, register]);
  return <div className={cx('alt-property', className)} data-editable={onSave ? '' : undefined} data-proposed={open ? '' : undefined} {...depth} style={style}>
    <dt className="alt-property-label">{label}</dt>
    <dd className="alt-property-value">
      {open ? <div className="alt-property-proposal" role="group" aria-label={`Proposed ${name}`}>
        <span className="alt-property-change">
          {isEmpty(value) ? <span className="alt-property-empty"><span className="alt-sr">Current: </span>{emptyLabel}</span> : <del className="alt-diff-old"><span className="alt-sr">Current: </span>{read}</del>}
          <Icons.ChevronDown className="alt-diff-arrow" size={14} aria-hidden="true" />
          <ins className="alt-diff-new"><span className="alt-sr">Proposed: </span>{show(proposed as V)}</ins>
        </span>
        <span className="alt-property-proposal-by">{phase === 'saving' ? 'Saving…' : phase === 'failed' ? <span className="alt-property-proposal-error"><Icons.AlertCircle size={13} aria-hidden="true" />{error || "Couldn't save"}</span> : `Proposed by ${proposedBy}`}</span>
        {phase !== 'saving' && <span className="alt-property-proposal-actions">
          <Button size="sm" variant="ghost" aria-label={`Reject new ${name}`} onClick={reject}>Reject</Button>
          <Button size="sm" variant="secondary" aria-label={`${phase === 'failed' ? 'Retry' : 'Accept'} new ${name}`} onClick={accept}>{phase === 'failed' ? 'Retry' : 'Accept'}</Button>
        </span>}
      </div>
      : onSave ? <InlineEdit<V> label={label} value={value} trigger="value" emptyLabel={emptyLabel} editLabel={`Change ${name}`}
        renderValue={renderValue} editor={editor} commit={commit} validate={validate} required={required} isEqual={isEqual} shortcut={shortcut?.toLowerCase()}
        disabled={locked} onSave={onSave} onValueChange={(v) => onValueChange?.(v)} /> : read}
    </dd>
  </div>;
}
