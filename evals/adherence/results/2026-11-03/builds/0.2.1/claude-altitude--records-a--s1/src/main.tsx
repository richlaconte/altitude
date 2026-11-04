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
  Tooltip,
  toast,
} from 'altitude-design';
import type { DataTableColumn } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { PROJECTS, fetchProjects, type Project, type Status } from './data';

const STATUS_TONE: Record<Status, 'positive' | 'caution' | 'critical' | 'neutral' | 'accent'> = {
  'On track': 'positive',
  'At risk': 'caution',
  Blocked: 'critical',
  Planning: 'neutral',
  Done: 'accent',
};

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatDue = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00`));

function formatAgo(min: number) {
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (min < 1440) return `${Math.round(min / 60)} h ago`;
  const d = Math.round(min / 1440);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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
    sortValue: (p) => p.name,
    cell: (p) => (
      <div className="project-name">
        <span className="project-key">{p.key}</span>
        <span>{p.name}</span>
      </div>
    ),
  },
  {
    key: 'owner',
    header: 'Owner',
    sortValue: (p) => p.owner,
    cell: (p) => (
      <div className="owner">
        <Avatar name={p.owner} size={24} />
        <span>{p.owner}</span>
      </div>
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
      <div className="progress">
        <Progress value={p.progress} aria-label={`${p.name} progress`} />
        <span className="num">{p.progress}%</span>
      </div>
    ),
  },
  { key: 'openTasks', header: 'Open tasks', align: 'end', sortValue: (p) => p.openTasks, cell: (p) => <span className="num">{p.openTasks}</span> },
  { key: 'due', header: 'Due', sortValue: (p) => p.due, cell: (p) => formatDue(p.due) },
  {
    key: 'updated',
    header: 'Updated',
    align: 'end',
    sortValue: (p) => -p.updatedMinutesAgo,
    cell: (p) => <span className="muted">{formatAgo(p.updatedMinutesAgo)}</span>,
  },
];

function ProjectsScreen() {
  const [projects, setProjects] = React.useState<Project[]>(PROJECTS);
  const [refreshing, setRefreshing] = React.useState(false);
  const [round, setRound] = React.useState(0);
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<string[]>([]);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const visible = React.useMemo(
    () => (q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects),
    [projects, q],
  );
  const visibleIds = new Set(visible.map((p) => p.id));
  const hiddenSelected = selected.filter((id) => !visibleIds.has(id)).length;

  const clearSearch = () => {
    setQuery('');
    searchRef.current?.focus();
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const next = round + 1;
    const fresh = await fetchProjects(next);
    const ids = new Set(fresh.map((p) => p.id));
    setProjects(fresh);
    setSelected((sel) => sel.filter((id) => ids.has(id)));
    setRound(next);
    setRefreshing(false);
    toast({ title: 'Projects refreshed', description: `${fresh.length} projects up to date.`, tone: 'positive', duration: 3000 });
  };

  const search = (
    <div className="search">
      <Input
        ref={searchRef}
        type="search"
        size="sm"
        aria-label="Search projects by name"
        placeholder="Search projects by name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && query) {
            e.preventDefault();
            setQuery('');
          }
        }}
        leading={<SearchIcon />}
        trailing={
          query ? (
            <Button size="sm" variant="ghost" square aria-label="Clear search" onClick={clearSearch}>
              <Icons.X size={14} />
            </Button>
          ) : undefined
        }
      />
    </div>
  );

  return (
    <main className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Northwind Studio · Product team</p>
          <h1>Projects</h1>
          <p className="muted" aria-live="polite">
            {refreshing
              ? 'Refreshing…'
              : q
                ? `${visible.length} of ${projects.length} projects match “${query.trim()}”`
                : `${projects.length} projects`}
            {hiddenSelected > 0 && ` · ${hiddenSelected} selected ${hiddenSelected === 1 ? 'project is' : 'projects are'} hidden by the search`}
          </p>
        </div>
        <Tooltip content="Fetch the latest project data">
          <Button variant="secondary" leading={<RefreshIcon />} loading={refreshing} onClick={refresh}>
            Refresh
          </Button>
        </Tooltip>
      </header>

      <DataTable<Project>
        aria-label="Team projects"
        columns={columns}
        rows={refreshing ? undefined : visible}
        skeleton={{ lines: 8 }}
        getRowId={(p) => p.id}
        getRowLabel={(p) => p.name}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        defaultSort={{ key: 'updated', direction: 'descending' }}
        toolbar={search}
        maxHeight="calc(100vh - 220px)"
        empty={
          <EmptyState
            size="sm"
            announce
            icon={<SearchIcon />}
            title={`No projects match “${query.trim()}”`}
            description="Check the spelling or try a shorter part of the project name."
            action={<Button variant="primary" size="sm" onClick={clearSearch}>Clear search</Button>}
          />
        }
      />
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <ProjectsScreen />
  </AltitudeProvider>,
);
