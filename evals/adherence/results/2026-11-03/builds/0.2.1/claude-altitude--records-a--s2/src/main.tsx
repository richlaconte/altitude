import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Avatar,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Icons,
  Input,
  Progress,
  Toaster,
  toast,
  type DataTableColumn,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import { fetchProjects, type Project, type ProjectStatus } from './data';

const STATUS_TONE: Record<ProjectStatus, 'neutral' | 'accent' | 'positive' | 'caution' | 'critical'> = {
  'On track': 'positive',
  'At risk': 'caution',
  Blocked: 'critical',
  Planning: 'neutral',
  Completed: 'accent',
};

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

const columns: DataTableColumn<Project>[] = [
  {
    key: 'name',
    header: 'Project',
    sortValue: (p) => p.name.toLowerCase(),
    cell: (p) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 600 }}>{p.name}</span>
        <span style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {p.key} · {p.team}
        </span>
      </div>
    ),
  },
  {
    key: 'owner',
    header: 'Owner',
    sortValue: (p) => p.owner,
    cell: (p) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Avatar name={p.owner} size={24} />
        {p.owner}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: (p) => p.status,
    cell: (p) => <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>,
  },
  {
    key: 'progress',
    header: 'Progress',
    width: 160,
    sortValue: (p) => p.progress,
    cell: (p) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <div style={{ flex: 1 }}>
          <Progress value={p.progress} aria-label={`${p.name} progress`} />
        </div>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-muted)', minWidth: 36, textAlign: 'right' }}>
          {p.progress}%
        </span>
      </div>
    ),
  },
  {
    key: 'openTasks',
    header: 'Open tasks',
    align: 'end',
    sortValue: (p) => p.openTasks,
    cell: (p) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.openTasks}</span>,
  },
  {
    key: 'dueDate',
    header: 'Due',
    sortValue: (p) => p.dueDate,
    cell: (p) => dateFmt.format(new Date(p.dueDate + 'T00:00:00')),
  },
];

function ProjectsScreen() {
  const [projects, setProjects] = React.useState<Project[] | undefined>(undefined);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastSynced, setLastSynced] = React.useState<Date | null>(null);
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<string[]>([]);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const next = await fetchProjects();
      setProjects(next);
      // Drop selections for projects that no longer exist.
      const ids = new Set(next.map((p) => p.id));
      setSelected((sel) => sel.filter((id) => ids.has(id)));
      setLastSynced(new Date());
      if (isRefresh) toast({ title: 'Projects refreshed', description: `${next.length} projects loaded.`, tone: 'positive' });
    } catch {
      toast({ title: 'Couldn’t refresh projects', description: 'Check your connection and try again.', tone: 'critical' });
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load(false);
  }, [load]);

  const trimmed = query.trim().toLowerCase();
  const visible = React.useMemo(
    () => (projects && trimmed ? projects.filter((p) => p.name.toLowerCase().includes(trimmed)) : projects),
    [projects, trimmed],
  );

  const visibleIds = React.useMemo(() => new Set(visible?.map((p) => p.id)), [visible]);
  const hiddenSelected = selected.filter((id) => !visibleIds.has(id)).length;

  const clearSearch = () => {
    setQuery('');
    searchRef.current?.focus();
  };

  const searchBox = (
    <div style={{ width: 300 }}>
      <Input
        ref={searchRef}
        type="search"
        size="sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && query) {
            e.preventDefault();
            setQuery('');
          }
        }}
        placeholder="Search projects by name"
        aria-label="Search projects by name"
        leading={<SearchIcon />}
        trailing={
          query ? (
            <Button variant="ghost" size="sm" square aria-label="Clear search" onClick={clearSearch}>
              <Icons.X size={14} />
            </Button>
          ) : null
        }
      />
    </div>
  );

  const resultSummary =
    projects === undefined
      ? 'Loading projects…'
      : trimmed
        ? `${visible!.length} of ${projects.length} projects match “${query.trim()}”`
        : `${projects.length} projects`;

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: 13 }}>Northwind Studio · Workspace</p>
          <h1 style={{ margin: 'var(--space-1) 0 0', fontSize: 28, lineHeight: 1.2 }}>Projects</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {lastSynced && (
            <span style={{ color: 'var(--ink-muted)', fontSize: 13 }} aria-live="polite">
              Synced {timeFmt.format(lastSynced)}
            </span>
          )}
          <Button
            variant="secondary"
            leading={refreshing ? undefined : <RefreshIcon />}
            loading={refreshing}
            disabled={projects === undefined}
            onClick={() => load(true)}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-3)',
          color: 'var(--ink-muted)',
          fontSize: 13,
          minHeight: 20,
        }}
      >
        <span role="status">{resultSummary}</span>
        {hiddenSelected > 0 && (
          <span>
            {hiddenSelected} selected {hiddenSelected === 1 ? 'project is' : 'projects are'} hidden by the search
          </span>
        )}
      </div>

      <DataTable<Project>
        aria-label="Team projects"
        columns={columns}
        rows={visible}
        getRowId={(p) => p.id}
        getRowLabel={(p) => p.name}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        defaultSort={{ key: 'name', direction: 'ascending' }}
        toolbar={searchBox}
        actions={(ids) => (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                toast({
                  title: `${ids.length} ${ids.length === 1 ? 'project' : 'projects'} exported`,
                  description: 'A CSV is on its way to your inbox.',
                })
              }
            >
              Export
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </>
        )}
        maxHeight="calc(100vh - 260px)"
        empty={
          trimmed ? (
            <EmptyState
              size="sm"
              announce
              icon={<SearchIcon />}
              title={`No projects match “${query.trim()}”`}
              description="Check the spelling, or search for part of the project name."
              action={
                <Button variant="primary" onClick={clearSearch}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              size="sm"
              title="No projects yet"
              description="Projects your team creates will appear here."
              action={
                <Button variant="secondary" onClick={() => load(true)}>
                  Refresh
                </Button>
              }
            />
          )
        }
      />
      <Toaster />
    </main>
  );
}

function App() {
  return <ProjectsScreen />;
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <App />
  </AltitudeProvider>,
);
