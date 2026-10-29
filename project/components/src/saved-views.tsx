import * as React from 'react';
import { cx } from './core';
import { Button, Field, Input, Tabs, TabsContent, TabsList, TabsTrigger } from './controls';
import { Popover } from './overlays';
import { Filter } from './filter-bar';
import { TableSort } from './collections';

/* ───────────────────────── Saved views ───────────────────────── */

/** What a view keeps: its filters, their match, the sort and the columns. */
export interface ViewState {
  filters: Filter[];
  match: 'all' | 'any';
  sort: TableSort;
  columnVisibility: Record<string, boolean>;
  columnOrder?: string[];
}
export interface SavedView extends Partial<ViewState> { id: string; name: string }

export interface SavedViewsOptions {
  views: SavedView[];
  /** The view shown first. Default the first. */
  defaultViewId?: string;
  /** Saves the active view's changes over it. */
  onSave?: (view: SavedView) => void;
  /** Saves the active view's state as a new view with this name. */
  onCreate?: (view: Omit<SavedView, 'id'>) => void;
  onDelete?: (id: string) => void;
}
export interface SavedViewsApi {
  views: SavedView[];
  active: SavedView;
  /** The view as it is now, with any unsaved changes. */
  draft: ViewState;
  /** The draft differs from what's saved. */
  modified: boolean;
  select: (id: string) => void;
  save: () => void;
  saveAsNew: (name: string) => void;
  reset: () => void;
  canSave: boolean;
  canCreate: boolean;
  /** Spread onto FilterBar. */
  filterBarProps: { value: Filter[]; onValueChange: (f: Filter[]) => void; match: 'all' | 'any'; onMatchChange: (m: 'all' | 'any') => void };
  /** Spread onto DataTable. */
  tableProps: { sort: TableSort; onSortChange: (s: TableSort) => void; columnVisibility: Record<string, boolean>; onColumnVisibilityChange: (v: Record<string, boolean>) => void; columnOrder?: string[]; onColumnOrderChange: (o: string[]) => void };
}

const stateOf = (v: SavedView): ViewState => ({ filters: v.filters ?? [], match: v.match ?? 'all', sort: v.sort ?? null, columnVisibility: v.columnVisibility ?? {}, columnOrder: v.columnOrder });
const same = (a: ViewState, b: ViewState) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Named combinations of a FilterBar's filters and a DataTable's sort and columns. Each view keeps its own draft while
 * you change it, so switching away and back doesn't lose work; `modified` says when the draft differs from what's saved.
 */
export function useSavedViews({ views, defaultViewId, onSave, onCreate, onDelete: _onDelete }: SavedViewsOptions): SavedViewsApi {
  const [activeId, setActiveId] = React.useState(defaultViewId ?? views[0]?.id);
  const [drafts, setDrafts] = React.useState<Record<string, ViewState>>({});
  const active = views.find((v) => v.id === activeId) ?? views[0];
  const saved = stateOf(active);
  const draft = drafts[active.id] ?? saved;
  const set = (patch: Partial<ViewState>) => setDrafts((d) => ({ ...d, [active.id]: { ...(d[active.id] ?? saved), ...patch } }));
  const drop = (id: string) => setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
  return {
    views, active, draft, modified: !same(draft, saved),
    select: setActiveId,
    save: () => { onSave?.({ ...active, ...draft }); drop(active.id); },
    saveAsNew: (name) => { onCreate?.({ name, ...draft }); drop(active.id); },
    reset: () => drop(active.id),
    canSave: !!onSave, canCreate: !!onCreate,
    filterBarProps: { value: draft.filters, onValueChange: (filters) => set({ filters }), match: draft.match, onMatchChange: (match) => set({ match }) },
    tableProps: {
      sort: draft.sort, onSortChange: (sort) => set({ sort }), columnVisibility: draft.columnVisibility, onColumnVisibilityChange: (columnVisibility) => set({ columnVisibility }),
      columnOrder: draft.columnOrder, onColumnOrderChange: (columnOrder) => set({ columnOrder }),
    },
  };
}

export interface SavedViewsProps {
  views: SavedViewsApi;
  /** The FilterBar and DataTable the views drive: shown on the active tab's sheet. */
  children: React.ReactNode;
  'aria-label'?: string;
  className?: string;
}
/**
 * Saved views as folder Tabs: the active tab and the table beneath it are one raised sheet. A view you've changed is a
 * draft: its tab carries a dot and "modified", and Save view, Save as new view and Reset appear beside the tabs.
 */
export function SavedViews({ views: v, children, 'aria-label': label = 'Views', className }: SavedViewsProps) {
  const [name, setName] = React.useState('');
  const [naming, setNaming] = React.useState(false);
  const [said, setSaid] = React.useState('');
  const was = React.useRef(false);
  React.useEffect(() => { if (v.modified && !was.current) setSaid(`${v.active.name} modified.`); if (!v.modified) setSaid(''); was.current = v.modified; }, [v.modified, v.active.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    // Folder Tabs join the active tab to its sheet only when the list and the panel are the Tabs' own children, so the
    // actions sit beside the list rather than around it.
    <Tabs value={v.active.id} onValueChange={v.select} className={cx('alt-views', className)}>
        <TabsList aria-label={label}>
          {v.views.map((view) => {
            const modified = view.id === v.active.id && v.modified;
            return <TabsTrigger key={view.id} value={view.id}>{view.name}{modified && <><span className="alt-views-dot" aria-hidden="true" /><span className="alt-sr">, modified</span></>}</TabsTrigger>;
          })}
        </TabsList>
      {v.modified && (
          <div className="alt-views-actions">
            {v.canSave && <Button size="sm" variant="secondary" onClick={() => { v.save(); setSaid(`${v.active.name} saved.`); }}>Save view</Button>}
            {v.canCreate && <Popover aria-label="Save as new view" align="end" open={naming} onOpenChange={setNaming} trigger={<Button size="sm" variant="ghost">Save as new view</Button>}>
              <form className="alt-views-new" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; v.saveAsNew(name.trim()); setSaid(`${name.trim()} saved.`); setName(''); setNaming(false); }}>
                <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My open deals" /></Field>
                <Button size="sm" variant="primary" type="submit">Save</Button>
              </form>
            </Popover>}
            <Button size="sm" variant="ghost" onClick={() => { v.reset(); setSaid(`${v.active.name} reset.`); }}>Reset</Button>
          </div>
      )}
      {v.views.map((view) => <TabsContent key={view.id} value={view.id} className="alt-views-sheet">{children}</TabsContent>)}
      <span className="alt-sr" aria-live="polite">{said}</span>
    </Tabs>
  );
}
