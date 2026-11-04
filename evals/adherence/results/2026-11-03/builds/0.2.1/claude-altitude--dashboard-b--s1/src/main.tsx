import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Badge,
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
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';
import { BRANCHES, CURRENT, METRICS, MONTHS, Metric, PERIOD_LABEL, PRIOR_LABEL, seriesFor, totals } from './data';
import { BranchBars, ChangeHeatmap, Delta, Sparkline, TrendChart, changeGrid } from './charts';
import { compact, full, pct } from './format';

const branchItems = [
  { value: 'all', label: 'All branches' },
  ...BRANCHES.map((b) => ({ value: b.id, label: b.name })),
];

function ViewToggle({ table, onChange, label }: { table: boolean; onChange: (t: boolean) => void; label: string }) {
  return (
    <Button size="sm" variant="ghost" onClick={() => onChange(!table)} aria-label={`${table ? 'Show chart' : 'Show table'}: ${label}`}>
      {table ? 'Show chart' : 'Show table'}
    </Button>
  );
}

function KpiTile({ metric, branch, active }: { metric: (typeof METRICS)[number]; branch: string; active: boolean }) {
  const t = totals(branch, metric.key);
  return (
    <Card className="kpi" data-active={active || undefined}>
      <div className="kpi-label">{metric.label}</div>
      <div className="kpi-value">{compact(t.current)}</div>
      <div className="kpi-delta">
        <Delta value={t.change} /> <span className="muted">vs previous 12 months</span>
      </div>
      <Sparkline
        values={t.monthly.slice(12)}
        label={`${metric.label} by month, ${CURRENT[0].short} to ${CURRENT[11].short}: lowest ${full(Math.min(...t.monthly.slice(12)))}, highest ${full(Math.max(...t.monthly.slice(12)))}`}
      />
    </Card>
  );
}

function TrendTable({ values, label }: { values: number[]; label: string }) {
  return (
    <Table maxHeight={300} aria-label={`${label} by month`}>
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead align="end">{label}</TableHead>
          <TableHead align="end">Year earlier</TableHead>
          <TableHead align="end">Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {CURRENT.map((mo, i) => (
          <TableRow key={mo.index}>
            <TableCell>{mo.long}</TableCell>
            <TableCell align="end" className="num">{full(values[i + 12])}</TableCell>
            <TableCell align="end" className="num">{full(values[i])}</TableCell>
            <TableCell align="end" className="num">
              <Delta value={values[i + 12] / values[i] - 1} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function HeatTable({ metric }: { metric: Metric }) {
  const grid = changeGrid(metric);
  return (
    <Table maxHeight={320} aria-label="Change against the same month a year earlier">
      <TableHeader>
        <TableRow>
          <TableHead>Branch</TableHead>
          {CURRENT.map((mo) => (
            <TableHead key={mo.index} align="end">{mo.short}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {grid.map((row) => (
          <TableRow key={row.branch.id}>
            <TableCell>{row.branch.name}</TableCell>
            {row.changes.map((v, i) => (
              <TableCell key={i} align="end" className="num">{pct(v, 0)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface SummaryRow {
  id: string;
  name: string;
  note?: string;
  loans: number;
  loansChange: number;
  members: number;
  membersChange: number;
  visits: number;
  visitsChange: number;
}

const summaryRows: SummaryRow[] = BRANCHES.map((b) => {
  const l = totals(b.id, 'loans');
  const m = totals(b.id, 'members');
  const v = totals(b.id, 'visits');
  return {
    id: b.id,
    name: b.name,
    note: b.note,
    loans: l.current,
    loansChange: l.change,
    members: m.current,
    membersChange: m.change,
    visits: v.current,
    visitsChange: v.change,
  };
});

// DataTableColumn isn't exported from the package root; derive it from DataTable's props.
type DataTableColumn<T> = React.ComponentProps<typeof DataTable<T>>['columns'][number];

const summaryColumns: DataTableColumn<SummaryRow>[] = [
  {
    key: 'name',
    header: 'Branch',
    sortValue: (r) => r.name,
    cell: (r) => (
      <div className="branch-cell">
        <span>{r.name}</span>
        {r.note && <span className="branch-note">{r.note}</span>}
      </div>
    ),
  },
  { key: 'loans', header: 'Loans', align: 'end', sortValue: (r) => r.loans, cell: (r) => <span className="num">{full(r.loans)}</span> },
  { key: 'loansChange', header: 'Change', align: 'end', sortValue: (r) => r.loansChange, cell: (r) => <Delta value={r.loansChange} /> },
  { key: 'members', header: 'New members', align: 'end', sortValue: (r) => r.members, cell: (r) => <span className="num">{full(r.members)}</span> },
  { key: 'membersChange', header: 'Change', align: 'end', sortValue: (r) => r.membersChange, cell: (r) => <Delta value={r.membersChange} /> },
  { key: 'visits', header: 'Visits', align: 'end', sortValue: (r) => r.visits, cell: (r) => <span className="num">{full(r.visits)}</span> },
  { key: 'visitsChange', header: 'Change', align: 'end', sortValue: (r) => r.visitsChange, cell: (r) => <Delta value={r.visitsChange} /> },
  {
    key: 'loansPerVisit',
    header: 'Loans per visit',
    align: 'end',
    sortValue: (r) => r.loans / r.visits,
    cell: (r) => <span className="num">{(r.loans / r.visits).toFixed(2)}</span>,
  },
];

function App({ dark, setDark }: { dark: boolean; setDark: (d: boolean) => void }) {
  const [branch, setBranch] = React.useState('all');
  const [metric, setMetric] = React.useState<Metric>('loans');
  const [trendTable, setTrendTable] = React.useState(false);
  const [heatTable, setHeatTable] = React.useState(false);

  const meta = METRICS.find((m) => m.key === metric)!;
  const branchName = branch === 'all' ? 'All branches' : BRANCHES.find((b) => b.id === branch)!.name;
  const series = seriesFor(branch, metric);
  const t = totals(branch, metric);

  const ranked = BRANCHES.map((b) => {
    const bt = totals(b.id, metric);
    return { id: b.id, name: b.name, current: bt.current, change: bt.change };
  }).sort((a, b) => b.current - a.current);

  // Best and worst month for the headline sentence.
  const yoy = CURRENT.map((_, i) => series[i + 12] / series[i] - 1);
  const peak = series.slice(12).indexOf(Math.max(...series.slice(12)));

  return (
    <div className="dash" data-mode={dark ? 'dark' : 'light'}>
      <header className="dash-head">
        <div>
          <p className="eyebrow">City Libraries · Service overview</p>
          <h1>Library service overview</h1>
          <p className="muted">
            {BRANCHES.length} branches · {PERIOD_LABEL}, compared with {PRIOR_LABEL} · Sample data
          </p>
        </div>
        <Switch label="Dark mode" checked={dark} onCheckedChange={setDark} />
      </header>

      <section className="filters" aria-label="Filters">
        <div className="filter">
          <span className="filter-label" id="branch-label">Branch</span>
          <Select
            size="sm"
            items={branchItems}
            value={branch}
            onValueChange={setBranch}
            aria-labelledby="branch-label"
          />
        </div>
        <div className="filter">
          <span className="filter-label" id="metric-label">Measure</span>
          <Tabs variant="segmented" value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <TabsList aria-labelledby="metric-label">
              {METRICS.map((m) => (
                <TabsTrigger key={m.key} value={m.key}>{m.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {branch !== 'all' && (
          <Button size="sm" variant="ghost" onClick={() => setBranch('all')}>
            Clear branch
          </Button>
        )}
      </section>

      <section className="kpis" aria-label={`Totals for ${branchName}, last 12 months`}>
        {METRICS.map((m) => (
          <KpiTile key={m.key} metric={m} branch={branch} active={m.key === metric} />
        ))}
      </section>

      <section className="grid">
        <Card className="span-2">
          <CardHeader className="card-head">
            <div>
              <CardTitle>{meta.label} by month · {branchName}</CardTitle>
              <CardDescription>
                {full(t.current)} {meta.noun} in the last 12 months, {pct(t.change)} on the year before. Busiest month:{' '}
                {CURRENT[peak].long}.
              </CardDescription>
            </div>
            <ViewToggle table={trendTable} onChange={setTrendTable} label={`${meta.label} by month`} />
          </CardHeader>
          <CardContent>
            {trendTable ? (
              <TrendTable values={series} label={meta.label} />
            ) : (
              <>
                <ul className="legend" aria-label="Series">
                  <li><span className="key key-current" aria-hidden="true" />{PERIOD_LABEL}</li>
                  <li><span className="key key-prior" aria-hidden="true" />Same month a year earlier</li>
                </ul>
                <TrendChart values={series} metricLabel={meta.label} showClosure={branch === 'all' || branch === 'eastfield'} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{meta.label} by branch</CardTitle>
            <CardDescription>Last 12 months, change on the year before. Select a branch to focus the dashboard on it.</CardDescription>
          </CardHeader>
          <CardContent>
            <BranchBars rows={ranked} selected={branch} onSelect={setBranch} metricNoun={meta.noun} />
          </CardContent>
        </Card>

        <Card className="span-3">
          <CardHeader className="card-head">
            <div>
              <CardTitle>Change on the same month a year earlier</CardTitle>
              <CardDescription>
                {meta.label}, by branch.{' '}
                {yoy.filter((v) => v > 0).length} of 12 months were up for {branch === 'all' ? 'the service as a whole' : branchName}.
              </CardDescription>
            </div>
            <ViewToggle table={heatTable} onChange={setHeatTable} label="change by branch and month" />
          </CardHeader>
          <CardContent>
            {heatTable ? <HeatTable metric={metric} /> : <ChangeHeatmap metric={metric} metricLabel={meta.label} />}
          </CardContent>
        </Card>

        <Card className="span-3">
          <CardHeader className="card-head">
            <div>
              <CardTitle>Branch summary</CardTitle>
              <CardDescription>All three measures, {PERIOD_LABEL}. Change is against {PRIOR_LABEL}.</CardDescription>
            </div>
            <Badge tone="neutral" variant="outline">{MONTHS.length / 2} months</Badge>
          </CardHeader>
          <CardContent>
            <DataTable
              aria-label="Branch summary"
              columns={summaryColumns}
              rows={summaryRows}
              getRowId={(r) => r.id}
              getRowLabel={(r) => r.name}
              defaultSort={{ key: 'loans', direction: 'descending' }}
              relevance={branch === 'all' ? undefined : (r) => (r.id === branch ? 'match' : 'miss')}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Root() {
  const [dark, setDark] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  );
  return (
    <AltitudeProvider scheme={dark ? 'nightfall' : 'daylight'} className="app-root">
      <App dark={dark} setDark={setDark} />
    </AltitudeProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
