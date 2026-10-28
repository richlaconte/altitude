import * as React from 'react';
import { cx } from './core';
import { Button } from './controls';
import { InlineEdit, InlineEditControl, InlineEditSaveResult } from './inline-edit';
import { EditRegion, EditRegionBinder, EditRegionForm, EditRegionSaveResult } from './edit-region';

type ListCtx = { layout: 'stacked' | 'inline'; locked: boolean };
const Ctx = React.createContext<ListCtx>({ layout: 'stacked', locked: false });

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
  className?: string;
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * One record's properties as label–value pairs. The properties are the record, on the ground; an unset value is a
 * small opening; an editable value is one plate that lifts when pointed at, because clicking it opens its editor
 * (InlineEdit, with any control). “Edit all” lifts the whole list into one EditRegion for cross-field rules.
 */
export function PropertyList<T extends Record<string, unknown> = Record<string, unknown>>({ layout = 'stacked', shortcuts = false, editAll, className, children, ...aria }: PropertyListProps<T>) {
  const [all, setAll] = React.useState(false);
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
  return <Ctx.Provider value={{ layout, locked: all }}>
    <div ref={root} className={cx('alt-property-list', className)} data-layout={layout} onKeyDown={onKeyDown}>
      {editAll && !all && <div className="alt-property-tools">
        <Button ref={allButton} size="sm" variant="ghost" onClick={() => setAll(true)}>Edit all {label}</Button>
      </div>}
      {editAll && all ? <EditRegion<T> label={label} value={editAll.value} defaultOpen validate={editAll.validate} onValueChange={editAll.onValueChange} onSave={editAll.onSave}
        onOpenChange={(open) => { if (!open) { backToButton.current = true; setAll(false); } }}>
        <EditRegionForm<T>>{(field) => editAll.renderEditor(field)}</EditRegionForm>
      </EditRegion>
        : <dl className="alt-property-dl" aria-label={aria['aria-label']} aria-labelledby={aria['aria-labelledby']}>{children}</dl>}
      {editAll && all && <AutoFocusFirst root={root} />}
    </div>
  </Ctx.Provider>;
}
/** Focuses the first field once “Edit all” has opened. */
function AutoFocusFirst({ root }: { root: React.RefObject<HTMLDivElement | null> }) {
  React.useLayoutEffect(() => { root.current?.querySelector<HTMLElement>('.alt-edit-region-form input:not([type="hidden"]), .alt-edit-region-form textarea, .alt-edit-region-form button')?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** One property. With onSave its value is an editable plate (InlineEdit); without, read-only text. */
export function PropertyListItem<V>({ label, value, renderValue, emptyLabel = 'Not set', onSave, onValueChange, editor, commit, validate, required, isEqual, shortcut, className }: PropertyListItemProps<V>) {
  const { locked } = React.useContext(Ctx);
  const read = isEmpty(value) ? <span className="alt-property-empty">{emptyLabel}</span> : renderValue ? renderValue(value) : String(value);
  return <div className={cx('alt-property', className)} data-editable={onSave ? '' : undefined}>
    <dt className="alt-property-label">{label}</dt>
    <dd className="alt-property-value">
      {onSave ? <InlineEdit<V> label={label} value={value} trigger="value" emptyLabel={emptyLabel} editLabel={`Change ${label.toLowerCase()}`}
        renderValue={renderValue} editor={editor} commit={commit} validate={validate} required={required} isEqual={isEqual} shortcut={shortcut?.toLowerCase()}
        disabled={locked} onSave={onSave} onValueChange={(v) => onValueChange?.(v)} /> : read}
    </dd>
  </div>;
}
