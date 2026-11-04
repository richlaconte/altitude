import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  type DataTableColumn,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';
import {
  BRANCHES,
  DATA,
  METRICS,
  MONTHS,
  PERIOD_LABEL,
  PRIOR_LABEL,
  change,
  fmt,
  fmtCompact,
  seriesFor,
  sum,
  type MetricKey,
} from './data';
import { TrendChart } from './TrendChart';
import { Change } from './Change';

const branchItems = [
  { value: 'all', label: 'All branches' },
  ...BRANCHES.map((b) => ({ value: b.id, label: b.name })),
];

function Kpi({ metric, branch, active, onSelect }: { metric: (typeof METRICS)[number]; branch: string; active: boolean; onSelect: () => void }) {
  const s = seriesFor(branch, metric.key);
  const now = sum(s.current);
  const before = sum(s.prior);
  const last = s.current[11];
  const lastPrior = s.prior[11];
  return (
    <Card interactive className={`kpi${active ? ' kpi-active' : ''}`} onClick={onSelect} aria-pressed={active} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}>
      <CardContent>
        <div className="kpi-label">{metric.label}</div>
        <div className="kpi-value">{fmt(now)}</div>
        <div className="kpi-change">
          <Change value={change(now, before)} /> <span className="muted">vs {fmtCompact(before)} the previous 12 months</span>
        </div>
        <div className="kpi-foot muted">
          October: <strong className="ink">{fmt(last)}</strong> · <Change value={change(last, lastPrior)} /> on Oct 2025
        </div>
      </CardContent>
    </Card>
  );
}

interface BranchRow {
  id: string;
  name: string;
  loans: number;
  loansChg: number | null;
  members: number;
  membersChg: number | null;
  visits: number;
  visitsChg: number | null;
  loansPerVisit: number;
}

const branchRows: BranchRow[] = BRANCHES.map((b) => {
  const d = DATA[b.id];
  const t = (k: MetricKey) => sum(d[k].current);
  const p = (k: MetricKey) => sum(d[k].prior);
  return {
    id: b.id,
    name: b.name,
    loans: t('loans'),
    loansChg: change(t('loans'), p('loans')),
    members: t('members'),
    membersChg: change(t('members'), p('members')),
    visits: t('visits'),
    visitsChg: change(t('visits'), p('visits')),
    loansPerVisit: t('loans') / t('visits'),
  };
});

const num = (k: 'loans' | 'members' | 'visits', header: string): DataTableColumn<BranchRow>[] => [
  { key: k, header, align: 'end', sortValue: (r) => r[k], cell: (r) => <span className="num">{fmt(r[k])}</span> },
  {
    key: `${k}Chg`,
    header: 'vs last year',
    align: 'end',
    sortValue: (r) => r[`${k}Chg`] ?? -Infinity,
    cell: (r) => <Change value={r[`${k}Chg`]} />,
  },
];

const columns: DataTableColumn<BranchRow>[] = [
  { key: 'name', header: 'Branch', sortValue: (r) => r.name, cell: (r) => <strong>{r.name}</strong> },
  ...num('loans', 'Loans'),
  ...num('members', 'New members'),
  ...num('visits', 'Visits'),
  {
    key: 'loansPerVisit',
    header: 'Loans per visit',
    align: 'end',
    sortValue: (r) => r.loansPerVisit,
    cell: (r) => <span className="num">{r.loansPerVisit.toFixed(2)}</span>,
  },
];

function BranchBars({ metric, branch, onPick }: { metric: MetricKey; branch: string; onPick: (id: string) => void }) {
  const rows = BRANCHES.map((b) => {
    const s = DATA[b.id][metric];
    const now = sum(s.current);
    return { b, now, chg: change(now, sum(s.prior)) };
  }).sort((a, z) => z.now - a.now);
  const max = rows[0].now;
  const total = sum(rows.map((r) => r.now));
  return (
    <Table aria-label="Branches ranked by twelve-month total">
      <TableHeader>
        <TableRow>
          <TableHead>Branch</TableHead>
          <TableHead>12-month total</TableHead>
          <TableHead align="end">vs last year</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ b, now, chg }) => (
          <TableRow
            key={b.id}
            rowId={b.id}
            interactive
            selected={branch === b.id}
            onClick={() => onPick(branch === b.id ? 'all' : b.id)}
            title={branch === b.id ? 'Show all branches' : `Show only ${b.name}`}
          >
            <TableCell>
              <span className="branch-name">{b.name}</span>
              {b.note && <span className="branch-note">{b.note}</span>}
            </TableCell>
            <TableCell className="bar-cell">
              <div className="bar-row">
                <div className="bar-track">
                  <div className="bar" style={{ width: `${(now / max) * 100}%` }} />
                </div>
                <span className="num bar-value">{fmtCompact(now)}</span>
                <span className="muted share">{Math.round((now / total) * 100)}%</span>
              </div>
            </TableCell>
            <TableCell align="end">
              <Change value={chg} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MonthTable({ series }: { series: { current: number[]; prior: number[] } }) {
  return (
    <Table maxHeight={300} aria-label="Monthly figures">
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead align="end">{PERIOD_LABEL}</TableHead>
          <TableHead align="end">{PRIOR_LABEL}</TableHead>
          <TableHead align="end">Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {MONTHS.map((m, i) => (
          <TableRow key={m.long}>
            <TableCell>{m.long}</TableCell>
            <TableCell align="end" className="num">{fmt(series.current[i])}</TableCell>
            <TableCell align="end" className="num">{fmt(series.prior[i])}</TableCell>
            <TableCell align="end"><Change value={change(series.current[i], series.prior[i])} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function App({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const [branch, setBranch] = React.useState('all');
  const [metric, setMetric] = React.useState<MetricKey>('loans');
  const [showTable, setShowTable] = React.useState(false);

  const m = METRICS.find((x) => x.key === metric)!;
  const series = seriesFor(branch, metric);
  const branchName = branch === 'all' ? 'All branches' : BRANCHES.find((b) => b.id === branch)!.name;
  const closureVisible = branch === 'all' || branch === 'northfield';

  return (
    <div className="dash" data-mode={dark ? 'dark' : 'light'}>
      <header className="dash-header">
        <div>
          <p className="eyebrow">Calder City Libraries</p>
          <h1>Service overview</h1>
          <p className="muted">
            Last 12 months ({PERIOD_LABEL}) compared with the 12 months before · {BRANCHES.length} branches · sample data
          </p>
        </div>
        <div className="filters">
          <div className="filter">
            <label id="branch-label" className="filter-label">Branch</label>
            <Select aria-labelledby="branch-label" items={branchItems} value={branch} onValueChange={setBranch} size="sm" />
          </div>
          <Switch label="Dark" checked={dark} onCheckedChange={setDark} />
        </div>
      </header>

      <section className="kpis" aria-label={`Twelve-month totals, ${branchName}`}>
        {METRICS.map((x) => (
          <Kpi key={x.key} metric={x} branch={branch} active={metric === x.key} onSelect={() => setMetric(x.key)} />
        ))}
      </section>

      <div className="grid">
        <Card className="trend-card">
          <CardHeader className="card-head-row">
            <div>
              <CardTitle>Monthly {m.noun} · {branchName}</CardTitle>
              <CardDescription>{m.description}, by month, against the same month a year earlier.</CardDescription>
            </div>
            <div className="card-tools">
              <Tabs variant="segmented" value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
                <TabsList aria-label="Measure">
                  {METRICS.map((x) => (
                    <TabsTrigger key={x.key} value={x.key}>{x.label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
                {showTable ? 'Show chart' : 'Show table'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showTable ? <MonthTable series={series} /> : <TrendChart series={series} noun={m.noun} />}
            {closureVisible && (
              <Alert tone="neutral" className="note" title="Northfield was closed in February and March 2026">
                It shut for refurbishment, which explains the dip{branch === 'all' ? ' in the city-wide figures' : ''}. It
                reopened in April, and use rose after the reopening.
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="branches-card">
          <CardHeader>
            <CardTitle>{m.label} by branch</CardTitle>
            <CardDescription>Twelve-month totals and share of the city. Select a branch to filter the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <BranchBars metric={metric} branch={branch} onPick={setBranch} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All branches, all measures</CardTitle>
          <CardDescription>Twelve-month totals, {PERIOD_LABEL}. Change is against {PRIOR_LABEL}. Select a column heading to sort.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            aria-label="Branch performance"
            columns={columns}
            rows={branchRows}
            getRowId={(r) => r.id}
            getRowLabel={(r) => r.name}
            defaultSort={{ key: 'loans', direction: 'descending' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Root() {
  const [dark, setDark] = React.useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  return (
    <AltitudeProvider scheme={dark ? 'nightfall' : 'daylight'}>
      <App dark={dark} setDark={setDark} />
    </AltitudeProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
