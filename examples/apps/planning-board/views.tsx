// The other three views of the same record: a table with saved views, the two-week schedule, and the epics drilldown.
import * as React from 'react';
import { DataTable, Drilldown, FilterBar, SavedViews, Schedule, useSavedViews } from 'altitude-design';
import type { DrillNode, Filter, FilterField, SavedView } from 'altitude-design';
import type { DemoQuery } from '../shared/react';
import { DemoResource, errorMessage, isDemoError, useDemoQuery } from '../shared/react';
import { COLUMNS, COLUMN_TITLE, EPICS, PEOPLE, SPRINT_START, service } from './data';
import type { BoardData, Card, ColumnId, Meeting } from './data';

type Row = Card & { column: ColumnId; estimate: 'set' | 'none' };
const rowsOf = (d: BoardData): Row[] => COLUMNS.flatMap((c) => d.columns[c.id].map((id) => ({ ...d.cards[id], column: c.id, estimate: d.cards[id].points == null ? 'none' as const : 'set' as const })));
const FIELDS: FilterField[] = [
  { key: 'column', label: 'Status', type: 'enum', options: COLUMNS.map((c) => ({ value: c.id, label: c.title })) },
  { key: 'epic', label: 'Epic', type: 'enum', options: EPICS.map((e) => ({ value: e, label: e })) },
  { key: 'assignee', label: 'Assignee', type: 'enum', options: PEOPLE.map((p) => ({ value: p, label: p })) },
  { key: 'estimate', label: 'Estimate', type: 'enum', options: [{ value: 'set', label: 'Estimated' }, { value: 'none', label: 'Not estimated' }] },
];
const VIEWS: SavedView[] = [
  { id: 'all', name: 'All cards' },
  { id: 'sprint', name: 'Sprint 24', filters: [{ id: 'f1', field: 'column', operator: 'is', value: 'sprint' }] },
  { id: 'loose', name: 'Not estimated', filters: [{ id: 'f2', field: 'estimate', operator: 'is', value: 'none' }], sort: { key: 'title', direction: 'ascending' } },
];
const test = (r: Row, f: Filter) => {
  if (f.value === undefined || f.value === '') return true;
  const v = r[f.field as keyof Row];
  return f.operator === 'is not' ? v !== f.value : v === f.value;
};

export function TableView({ q, onOpen }: { q: DemoQuery<BoardData>; onOpen: (id: string) => void }) {
  const [saved, setSaved] = React.useState(VIEWS);
  const views = useSavedViews({
    views: saved,
    onSave: (v) => setSaved((xs) => xs.map((x) => (x.id === v.id ? v : x))),
    onCreate: (v) => setSaved((xs) => [...xs, { ...v, id: `v${xs.length}` }]),
  });
  const { value, match } = views.filterBarProps;
  const rows = rowsOf(q.data!).filter((r) => {
    const t = value.map((f) => test(r, f));
    return !t.length || (match === 'any' ? t.some(Boolean) : t.every(Boolean));
  });
  return (
    <SavedViews views={views} aria-label="Card views">
      <FilterBar fields={FIELDS} {...views.filterBarProps} aria-label="Filter cards" resultCount={rows.length} />
      <DataTable aria-label="Cards" noun="cards" rows={rows} getRowId={(r) => r.id} getRowLabel={(r) => r.title} {...views.tableProps} columnsMenu
        onRowClick={(r) => onOpen(r.id)} empty="No cards match these filters. Remove a filter to see more."
        columns={[
          { key: 'title', header: 'Card', sortValue: (r) => r.title, minWidth: '14rem' },
          { key: 'column', header: 'Status', sortValue: (r) => COLUMNS.findIndex((c) => c.id === r.column), cell: (r) => COLUMN_TITLE[r.column] },
          { key: 'epic', header: 'Epic', sortValue: (r) => r.epic },
          { key: 'assignee', header: 'Assignee', sortValue: (r) => r.assignee ?? '~', cell: (r) => r.assignee ?? 'Unassigned' },
          { key: 'points', header: 'Estimate', align: 'end', sortValue: (r) => r.points ?? -1, cell: (r) => (r.points == null ? 'None' : `${r.points} pts`) },
        ]} />
    </SavedViews>
  );
}

export function ScheduleView({ date, onDateChange, say }: { date: string; onDateChange: (d: string) => void; say: (s: string) => void }) {
  const q = useDemoQuery<unknown, Meeting[]>(service, 'meetings.list');
  const replace = (m: Meeting) => q.setData((l) => l?.map((x) => (x.id === m.id ? m : x)));
  const reconcile = async (check: (l: Meeting[]) => boolean) => {
    try { const l = await service.request<Meeting[]>('meetings.list'); q.setData(() => l); return check(l); } catch { return false; }
  };
  return (
    <DemoResource query={q} noun="the schedule">
      {(meetings) => (
        <Schedule<Meeting> aria-label="Sprint 24 schedule" view="workweek" date={date} onDateChange={onDateChange} events={meetings}
          getKey={(m) => m.id} getStart={(m) => m.start} getEnd={(m) => m.end} getLabel={(m) => m.title} dayStart="09:00" dayEnd="18:00" locale="en-IE"
          now={`${SPRINT_START}T09:30`}
          onCreate={async (r) => {
            try { const m = await service.request<Meeting>('meetings.create', r); q.setData((l) => [...(l ?? []), m]); say(`${m.title} booked.`); return { ok: true, value: m }; }
            catch (e) {
              if (isDemoError(e, 'lost-response')) {
                let found: Meeting | undefined;
                if (await reconcile((l) => !!(found = l.find((m) => m.start === r.start && m.title === r.title.trim())))) return { ok: true, value: found! };
              }
              return { ok: false, error: errorMessage(e) };
            }
          }}
          onChange={async (next, prev) => {
            try { replace(await service.request<Meeting>('meetings.move', { ...next, rev: prev.rev })); say(`${prev.title} moved.`); return { ok: true }; }
            catch (e) {
              if (isDemoError(e, 'conflict') && e.current) replace(e.current as Meeting);
              if (isDemoError(e, 'lost-response') && await reconcile((l) => l.some((m) => m.id === next.id && m.start === next.start))) return { ok: true };
              return { ok: false, error: errorMessage(e) };
            }
          }}
          onRename={async (m, title) => {
            try { replace(await service.request<Meeting>('meetings.rename', { id: m.id, title })); return { ok: true }; }
            catch (e) { return { ok: false, error: errorMessage(e) }; }
          }} />
      )}
    </DemoResource>
  );
}

export function EpicsView({ q }: { q: DemoQuery<BoardData> }) {
  const rows = rowsOf(q.data!);
  const story = (r: Row): DrillNode => ({
    id: r.id, title: r.title, description: `${COLUMN_TITLE[r.column]} · ${r.assignee ?? 'Unassigned'}`,
    content: <dl className="pb-props"><dt>Status</dt><dd>{COLUMN_TITLE[r.column]}</dd><dt>Estimate</dt><dd>{r.points == null ? 'None' : `${r.points} points`}</dd><dt>Tags</dt><dd>{r.tags.join(', ') || 'None'}</dd></dl>,
  });
  const root: DrillNode = {
    id: 'q4', title: 'Q4 roadmap', description: `${EPICS.length} epics, ${rows.length} cards`,
    children: EPICS.map((e) => {
      const mine = rows.filter((r) => r.epic === e);
      const done = mine.filter((r) => r.column === 'done').length;
      // No content of its own: a node with content is a leaf, and an epic's cards are what you came for.
      return { id: e, title: e, description: `${done} of ${mine.length} done`, children: mine.map(story) };
    }),
  };
  return <Drilldown root={root} aria-label="Epics" transition="slide" />;
}
