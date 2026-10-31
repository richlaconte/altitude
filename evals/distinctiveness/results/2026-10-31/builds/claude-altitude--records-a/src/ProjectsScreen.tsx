import * as React from 'react';
import {
  Alert, Badge, Button, DataTable, EmptyState, Field, Icons, Input, PageHeader, PageHeaderDescription, PageHeaderTitle,
  WorkflowStatus, useAsyncCollection,
} from 'altitude-design';
import type {DataTableColumn} from 'altitude-design';
import {loadProjects, type Project, type ProjectStatus} from './projects-service';

const STATUS_TONE: Record<ProjectStatus, 'positive' | 'caution' | 'critical' | 'neutral'> = {
  'On track': 'positive', 'At risk': 'caution', 'Off track': 'critical', Completed: 'neutral',
};

const dateFormat = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'});

const columns: DataTableColumn<Project>[] = [
  {key: 'name', header: 'Project', sortValue: p => p.name, minWidth: '14rem'},
  {key: 'owner', header: 'Owner', sortValue: p => p.owner},
  {key: 'status', header: 'Status', sortValue: p => p.status, cell: p => <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>},
  {key: 'openTasks', header: 'Open tasks', align: 'end', sortValue: p => p.openTasks},
  {key: 'dueDate', header: 'Due', sortValue: p => p.dueDate, cell: p => dateFormat.format(new Date(`${p.dueDate}T00:00:00`))},
];

export function ProjectsScreen() {
  const collection = useAsyncCollection<Project, string>({
    initialQuery: '',
    load: loadProjects,
    getKey: project => project.id,
    isFiltered: query => query.trim() !== '',
    // Selection survives searches so people can gather projects across several queries.
    selection: 'preserve',
    messages: {
      loading: 'Loading projects…',
      refreshing: 'Refreshing projects…',
      empty: 'Your team has no projects yet.',
      noResults: 'No projects match this search.',
      failed: 'Projects could not be loaded.',
      results: count => `${count} ${count === 1 ? 'project' : 'projects'} found.`,
    },
  });
  const {items, phase, query, selectedKeys} = collection;
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Remember names of projects seen in any result so selections hidden by the current search can still be named.
  const seen = React.useRef(new Map<string, Project>());
  for (const item of items) seen.current.set(item.id, item);

  const visibleIds = React.useMemo(() => new Set(items.map(item => item.id)), [items]);
  const hiddenSelected = [...selectedKeys].filter(id => !visibleIds.has(id));

  // DataTable reports the selection it can see; only toggle visible rows so hidden selections are kept.
  const onSelectedChange = (ids: string[]) => {
    const next = new Set(ids);
    for (const id of visibleIds) if (next.has(id) !== selectedKeys.has(id)) collection.toggleSelection(id);
  };

  const clearSearch = () => {
    collection.reset();
    searchRef.current?.focus();
  };

  const busy = phase === 'loading' || phase === 'refreshing';
  const failedWithoutResults = phase === 'failed' && items.length === 0;

  return (
    <main className="projects-page">
      <PageHeader
        actions={
          <Button variant="secondary" leading={<Icons.Refresh />} loading={phase === 'refreshing'} disabled={busy} onClick={collection.refresh}>
            Refresh
          </Button>
        }
      >
        <PageHeaderTitle>Projects</PageHeaderTitle>
        <PageHeaderDescription>Find your team's projects by name and select the ones you're working with.</PageHeaderDescription>
      </PageHeader>

      <div className="projects-search" role="search">
        <Field label="Search projects by name">
          <Input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="e.g. migration"
            onChange={event => collection.setQuery(event.target.value)}
            onKeyDown={event => { if (event.key === 'Escape' && query) { event.preventDefault(); clearSearch(); } }}
          />
        </Field>
        {query && <Button variant="ghost" leading={<Icons.X />} onClick={clearSearch}>Clear search</Button>}
      </div>

      <WorkflowStatus>{collection.status}</WorkflowStatus>

      {phase === 'failed' && items.length > 0 && (
        <Alert tone="caution" title="Couldn't refresh projects" action={<Button size="sm" onClick={collection.refresh}>Retry</Button>}>
          {collection.error} The list below is from the last successful load and may be out of date.
        </Alert>
      )}

      {selectedKeys.size > 0 && (
        <div className="projects-selection">
          <p>
            <strong>{selectedKeys.size} {selectedKeys.size === 1 ? 'project' : 'projects'} selected</strong>
            {hiddenSelected.length > 0 && (
              <> — {hiddenSelected.length} not shown by this search: {hiddenSelected.map(id => seen.current.get(id)?.name ?? id).join(', ')}</>
            )}
          </p>
          <Button variant="ghost" size="sm" onClick={collection.clearSelection}>Clear selection</Button>
        </div>
      )}

      {failedWithoutResults ? (
        <EmptyState
          icon={<Icons.AlertCircle />}
          title="Projects couldn't be loaded"
          description={collection.error || 'Something went wrong while loading projects.'}
          action={<Button variant="primary" leading={<Icons.Refresh />} onClick={collection.refresh}>Try again</Button>}
          headingLevel={2}
        />
      ) : (
        <div aria-busy={busy}>
          <DataTable<Project>
            aria-label="Projects"
            columns={columns}
            rows={phase === 'loading' ? undefined : [...items]}
            getRowId={project => project.id}
            getRowLabel={project => project.name}
            selectable
            noun="projects"
            selected={[...selectedKeys].filter(id => visibleIds.has(id))}
            onSelectedChange={onSelectedChange}
            defaultSort={{key: 'name', direction: 'ascending'}}
            empty={
              phase === 'no-results' ? (
                <EmptyState
                  size="sm"
                  title={`No projects named "${query.trim()}"`}
                  description="Search matches project names only. Check the spelling or try a shorter term."
                  action={<Button onClick={clearSearch}>Clear search</Button>}
                />
              ) : (
                <EmptyState
                  size="sm"
                  title="No projects yet"
                  description="Projects your team creates will appear here."
                  action={<Button onClick={collection.refresh}>Refresh</Button>}
                />
              )
            }
          />
        </div>
      )}
    </main>
  );
}
