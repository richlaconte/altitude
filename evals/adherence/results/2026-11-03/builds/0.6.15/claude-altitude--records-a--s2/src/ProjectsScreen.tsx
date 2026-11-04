import * as React from 'react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  Input,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  RelativeTime,
  WorkflowStatus,
  useAsyncCollection,
} from 'altitude-design';
import type { DataTableColumn, Tone } from 'altitude-design';
import { loadProjects, type Project, type ProjectStatus } from './projects';

const STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  'on-track': { label: 'On track', tone: 'positive' },
  'at-risk': { label: 'At risk', tone: 'caution' },
  blocked: { label: 'Blocked', tone: 'critical' },
  completed: { label: 'Completed', tone: 'neutral' },
};

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const columns: DataTableColumn<Project>[] = [
  {
    key: 'name',
    header: 'Project',
    sortValue: p => p.name,
    cell: p => (
      <span className="project-name">
        <span>{p.name}</span>
        <span className="project-key">{p.key}</span>
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: p => p.status,
    // Status carries a word and the badge's lamp, never colour alone.
    cell: p => <Badge tone={STATUS[p.status].tone} lamp>{STATUS[p.status].label}</Badge>,
  },
  { key: 'lead', header: 'Lead', sortValue: p => p.lead },
  { key: 'due', header: 'Due', sortValue: p => p.due, cell: p => dateFormat.format(new Date(`${p.due}T00:00:00`)) },
  { key: 'openTasks', header: 'Open tasks', align: 'end', sortValue: p => p.openTasks },
  { key: 'updatedAt', header: 'Updated', sortValue: p => p.updatedAt, cell: p => <RelativeTime date={p.updatedAt} /> },
];

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4" />
    </svg>
  );
}

export function ProjectsScreen() {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const collection = useAsyncCollection<Project, string>({
    initialQuery: '',
    load: loadProjects,
    getKey: p => p.id,
    isFiltered: q => q.trim().length > 0,
    // Selection is kept across searches so people can gather projects from several queries.
    selection: 'preserve',
    messages: {
      loading: 'Loading projects',
      refreshing: 'Refreshing projects',
      empty: 'Your team has no projects yet',
      noResults: 'No projects match your search',
      failed: "Projects couldn't be loaded",
      results: n => `${n} ${n === 1 ? 'project' : 'projects'}`,
    },
  });
  const { phase, items, query, selectedKeys } = collection;

  // When the shown results were last confirmed by the service, so a failed refresh can say how old they are.
  const [loadedAt, setLoadedAt] = React.useState<Date | null>(null);
  React.useEffect(() => {
    if (phase === 'populated' || phase === 'empty' || phase === 'no-results') setLoadedAt(new Date());
  }, [phase, items]);

  const visibleIds = React.useMemo(() => new Set(items.map(p => p.id)), [items]);
  const hiddenSelected = [...selectedKeys].filter(id => !visibleIds.has(id)).length;

  // DataTable reports the visible selection; apply only the visible differences so hidden selections survive.
  const onSelectedChange = (ids: string[]) => {
    const next = new Set(ids);
    for (const id of visibleIds) if (next.has(id) !== selectedKeys.has(id)) collection.toggleSelection(id);
  };

  const clearSearch = () => {
    collection.reset();
    searchRef.current?.focus();
  };

  const busy = phase === 'loading' || phase === 'refreshing';
  const hasQuery = query.length > 0;

  let empty: React.ReactNode = null;
  if (phase === 'no-results') {
    empty = (
      <EmptyState
        size="sm"
        icon={<SearchIcon />}
        title={`No projects named “${query.trim()}”`}
        description="Search looks at project names only. Check the spelling or try part of the name."
        action={<Button variant="secondary" onClick={clearSearch}>Clear search</Button>}
      />
    );
  } else if (phase === 'empty') {
    empty = (
      <EmptyState
        size="sm"
        title="Your team has no projects yet"
        description="Projects your team creates will be listed here."
      />
    );
  } else if (phase === 'failed') {
    empty = <p className="table-note">Projects couldn't be loaded.</p>;
  }

  return (
    <main className="projects-page">
      <PageHeader
        actions={
          <Button variant="secondary" leading={<RefreshIcon />} loading={phase === 'refreshing'} disabled={phase === 'loading'} onClick={collection.refresh}>
            Refresh projects
          </Button>
        }
      >
        <PageHeaderTitle>Projects</PageHeaderTitle>
        <PageHeaderDescription>Every project your team is running, with its lead, due date and open tasks.</PageHeaderDescription>
      </PageHeader>

      <div className="projects-search">
        <Field label="Search projects by name">
          <Input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="e.g. checkout"
            leading={<SearchIcon />}
            autoComplete="off"
            onChange={e => collection.setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape' && hasQuery) {
                e.preventDefault();
                clearSearch();
              }
            }}
          />
        </Field>
        <Button variant="ghost" onClick={clearSearch} disabled={!hasQuery}>
          Clear search
        </Button>
      </div>

      <div className="projects-meta">
        <WorkflowStatus>{collection.status}</WorkflowStatus>
        {loadedAt && phase !== 'failed' && (
          <span className="table-note">
            Updated <RelativeTime date={loadedAt} />
          </span>
        )}
      </div>

      {phase === 'failed' && (
        <Alert
          tone="critical"
          title={items.length ? 'These projects may be out of date' : "We couldn't load your projects"}
          action={<Button variant="secondary" onClick={collection.refresh}>Retry loading</Button>}
        >
          {collection.error}
          {items.length > 0 && loadedAt && (
            <> Showing results from <RelativeTime date={loadedAt} />.</>
          )}
        </Alert>
      )}

      {hiddenSelected > 0 && (
        <p className="table-note" role="note">
          {hiddenSelected} selected {hiddenSelected === 1 ? 'project isn’t' : 'projects aren’t'} shown by this search and {hiddenSelected === 1 ? 'is' : 'are'} still selected.{' '}
          <Button variant="ghost" size="sm" onClick={collection.clearSelection}>Clear selection</Button>
        </p>
      )}

      <div aria-busy={busy}>
        <DataTable<Project>
          aria-label="Team projects"
          columns={columns}
          rows={phase === 'loading' ? undefined : [...items]}
          getRowId={p => p.id}
          getRowLabel={p => p.name}
          noun="projects"
          selectable
          selected={[...selectedKeys].filter(id => visibleIds.has(id))}
          onSelectedChange={onSelectedChange}
          actions={() => (
            <Button variant="ghost" size="sm" onClick={collection.clearSelection}>Clear selection</Button>
          )}
          defaultSort={{ key: 'due', direction: 'ascending' }}
          empty={empty}
        />
      </div>
    </main>
  );
}
