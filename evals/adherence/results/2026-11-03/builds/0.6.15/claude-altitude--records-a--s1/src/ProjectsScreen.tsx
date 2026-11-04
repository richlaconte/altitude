import * as React from 'react';
import {
  Alert, Badge, Button, DataTable, EmptyState, Icons, Input, PageHeader, PageHeaderDescription,
  PageHeaderTitle, WorkflowStatus, useAsyncCollection,
} from 'altitude-design';
import type { DataTableColumn, Tone } from 'altitude-design';
import { failNextLoad, loadProjects, type Project, type ProjectStatus } from './projects-service';

const STATUS: Record<ProjectStatus, { label: string; tone: Tone; icon: React.ReactNode }> = {
  'on-track': { label: 'On track', tone: 'positive', icon: <Icons.CircleCheck size={14} /> },
  'at-risk': { label: 'At risk', tone: 'caution', icon: <Icons.AlertTriangle size={14} /> },
  blocked: { label: 'Blocked', tone: 'critical', icon: <Icons.AlertCircle size={14} /> },
  completed: { label: 'Completed', tone: 'neutral', icon: <Icons.Check size={14} /> },
};

const dueFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const columns: DataTableColumn<Project>[] = [
  { key: 'name', header: 'Project', sortValue: p => p.name },
  { key: 'lead', header: 'Lead', sortValue: p => p.lead },
  {
    key: 'status', header: 'Status', sortValue: p => STATUS[p.status].label,
    cell: p => {
      const s = STATUS[p.status];
      return <Badge tone={s.tone} lamp={false}><span className="status-label">{s.icon}{s.label}</span></Badge>;
    },
  },
  { key: 'openTasks', header: 'Open tasks', align: 'end', sortValue: p => p.openTasks, cell: p => p.openTasks.toLocaleString('en-US') },
  { key: 'due', header: 'Due', align: 'end', sortValue: p => p.due, cell: p => dueFormat.format(new Date(p.due)) },
];

export function ProjectsScreen() {
  const collection = useAsyncCollection<Project, string>({
    initialQuery: '',
    load: loadProjects,
    getKey: p => p.id,
    isFiltered: q => q.trim() !== '',
    // Selection survives searching, so people can gather projects across several searches.
    selection: 'preserve',
    messages: {
      loading: 'Loading projects…',
      refreshing: 'Refreshing projects…',
      empty: 'Your team has no projects yet.',
      noResults: 'No projects match your search.',
      failed: "We couldn't load projects.",
      results: n => `${n} ${n === 1 ? 'project' : 'projects'}`,
    },
  });
  const searchRef = React.useRef<HTMLInputElement>(null);
  const { phase, items, query, selectedKeys } = collection;

  const clearSearch = () => {
    collection.reset();
    searchRef.current?.focus();
  };

  // DataTable reports the selected ids among the visible rows; reconcile by stable id so
  // projects selected under an earlier search stay selected.
  const onSelectedChange = (ids: string[]) => {
    const next = new Set(ids);
    for (const p of items) if (next.has(p.id) !== selectedKeys.has(p.id)) collection.toggleSelection(p.id);
  };

  const rows = React.useMemo(() => [...items], [items]);
  const visibleIds = new Set(items.map(p => p.id));
  const hiddenSelected = [...selectedKeys].filter(id => !visibleIds.has(id)).length;
  const refreshing = phase === 'refreshing';

  const search = (
    <div className="search">
      <Input
        ref={searchRef}
        type="search"
        size="sm"
        aria-label="Search projects by name"
        placeholder="Search by project name"
        value={query}
        onChange={e => collection.setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape' && query) { e.preventDefault(); clearSearch(); } }}
        leading={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>}
      />
      {query && <Button size="sm" variant="ghost" onClick={clearSearch}>Clear search</Button>}
    </div>
  );

  return (
    <main className="page">
      <PageHeader
        actions={
          <Button variant="secondary" leading={<Icons.Refresh />} loading={refreshing} disabled={phase === 'loading'} onClick={collection.refresh}>
            Refresh projects
          </Button>
        }
        overflow={[{ label: 'Simulate a failed refresh', onSelect: () => { failNextLoad(); collection.refresh(); } }]}
      >
        <PageHeaderTitle>Projects</PageHeaderTitle>
        <PageHeaderDescription>Every project your team is running, with its lead, status and due date.</PageHeaderDescription>
      </PageHeader>

      <WorkflowStatus className="result-status">{collection.status}</WorkflowStatus>

      {phase === 'failed' && (
        <Alert tone="critical" title="We couldn't load projects" icon={<Icons.AlertCircle size={18} />}
          action={<Button size="sm" onClick={collection.refresh}>Try again</Button>}>
          {items.length > 0 ? 'The list below is from the last successful load and may be out of date.' : collection.error}
        </Alert>
      )}

      {phase === 'no-results' ? (
        <section className="table-frame" aria-label="Projects">
          <div className="toolbar">{search}</div>
          <EmptyState size="sm" headingLevel={2} announce
            title={`No projects match “${query.trim()}”`}
            description="Search looks at project names only. Check the spelling or try fewer words."
            action={<Button onClick={clearSearch}>Clear search</Button>} />
        </section>
      ) : (
        <DataTable<Project>
          aria-label="Projects"
          noun="projects"
          columns={columns}
          rows={phase === 'loading' ? undefined : rows}
          getRowId={p => p.id}
          getRowLabel={p => p.name}
          selectable
          selected={[...selectedKeys]}
          onSelectedChange={onSelectedChange}
          actions={() => <Button size="sm" variant="ghost" onClick={collection.clearSelection}>Clear selection</Button>}
          toolbar={search}
          empty={phase === 'empty' ? 'Your team has no projects yet. Projects you create will appear here.' : undefined}
        />
      )}

      {hiddenSelected > 0 && (
        <p className="selection-note">
          {selectedKeys.size} selected in total, including {hiddenSelected} not shown by this search.{' '}
          <Button size="sm" variant="ghost" onClick={collection.clearSelection}>Clear selection</Button>
        </p>
      )}
    </main>
  );
}
