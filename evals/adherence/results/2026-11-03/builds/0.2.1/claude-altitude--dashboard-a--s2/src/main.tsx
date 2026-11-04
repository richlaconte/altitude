import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './dashboard.css';
import { MrrChart, Sparkline, SubscriptionFlowChart } from './charts';
import {
  MONTHS,
  Month,
  fmtCompactUsd,
  fmtInt,
  fmtPct,
  fmtSigned,
  fmtSignedPct,
  fmtSignedUsd,
  fmtUsd,
} from './data';

type Range = '3' | '6' | '12';

// The shape DataTable expects for a column (its type isn't exported from the package root).
interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'start' | 'end';
}

// ---- stat tiles ---------------------------------------------------------------

function Delta({ value, text, upIsGood, period }: { value: number; text: string; upIsGood: boolean; period: string }) {
  const tone = value === 0 ? 'flat' : (value > 0) === upIsGood ? 'good' : 'bad';
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '■';
  return (
    <span className={`delta delta-${tone}`}>
      <span aria-hidden="true">{arrow}</span> {text}
      <span className="delta-period"> {period}</span>
    </span>
  );
}

function StatTile({
  label,
  value,
  delta,
  trend,
  hero,
}: {
  label: string;
  value: string;
  delta: React.ReactNode;
  trend: number[];
  hero?: boolean;
}) {
  return (
    <Card className={hero ? 'tile tile-hero' : 'tile'}>
      <div className="tile-label">{label}</div>
      <div className={hero ? 'tile-value tile-value-hero' : 'tile-value'}>{value}</div>
      <div className="tile-delta">{delta}</div>
      <Sparkline values={trend} label={`${label} trend`} />
    </Card>
  );
}

// ---- table view ---------------------------------------------------------------

const columns: DataTableColumn<Month>[] = [
  { key: 'month', header: 'Month', cell: (m) => m.label, sortValue: (m) => m.key },
  { key: 'mrr', header: 'MRR', align: 'end', cell: (m) => fmtUsd(m.mrr), sortValue: (m) => m.mrr },
  {
    key: 'mrrChange',
    header: 'MRR change',
    align: 'end',
    cell: (m) => fmtSignedUsd(m.mrrChange),
    sortValue: (m) => m.mrrChange,
  },
  { key: 'newSubs', header: 'New', align: 'end', cell: (m) => fmtInt(m.newSubs), sortValue: (m) => m.newSubs },
  {
    key: 'cancelled',
    header: 'Cancelled',
    align: 'end',
    cell: (m) => fmtInt(m.cancelled),
    sortValue: (m) => m.cancelled,
  },
  { key: 'net', header: 'Net', align: 'end', cell: (m) => fmtSigned(m.net), sortValue: (m) => m.net },
  {
    key: 'activeEnd',
    header: 'Active at month end',
    align: 'end',
    cell: (m) => fmtInt(m.activeEnd),
    sortValue: (m) => m.activeEnd,
  },
  {
    key: 'churnRate',
    header: 'Churn rate',
    align: 'end',
    cell: (m) => fmtPct(m.churnRate, 2),
    sortValue: (m) => m.churnRate,
  },
];

// ---- page ---------------------------------------------------------------------

function Dashboard({ dark, onDarkChange }: { dark: boolean; onDarkChange: (v: boolean) => void }) {
  const [range, setRange] = React.useState<Range>('12');
  const months = MONTHS.slice(-Number(range));
  const latest = MONTHS[MONTHS.length - 1];
  const prior = MONTHS[MONTHS.length - 2];
  const first = months[0];
  const rangeName = `${first.label} – ${latest.label}`;
  const vsPrior = `vs ${prior.short}`;

  // Changes over the selected range
  const mrrStartOfRange = first.mrr - first.mrrChange;
  const mrrGrowth = latest.mrr / mrrStartOfRange - 1;
  const totalNew = months.reduce((s, m) => s + m.newSubs, 0);
  const totalCancelled = months.reduce((s, m) => s + m.cancelled, 0);
  const avgChurn = months.reduce((s, m) => s + m.churnRate, 0) / months.length;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Northwind Cloud</p>
          <h1>Subscription overview</h1>
          <p className="page-sub">Complete months through {latest.long}. Sample data.</p>
        </div>
        <Switch label="Dark mode" checked={dark} onCheckedChange={onDarkChange} />
      </header>

      <div className="filters" role="group" aria-label="Filters">
        <span className="filters-label" id="range-label">
          Period
        </span>
        <Tabs variant="segmented" value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList aria-labelledby="range-label">
            <TabsTrigger value="3">Last 3 months</TabsTrigger>
            <TabsTrigger value="6">Last 6 months</TabsTrigger>
            <TabsTrigger value="12">Last 12 months</TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="filters-range">{rangeName}</span>
      </div>

      <section className="tiles" aria-label={`Key figures for ${latest.long}`}>
        <StatTile
          hero
          label={`Monthly recurring revenue, ${latest.long}`}
          value={fmtUsd(latest.mrr)}
          trend={months.map((m) => m.mrr)}
          delta={
            <>
              <Delta value={latest.mrrChange} text={fmtSignedPct(latest.mrrChange / prior.mrr)} upIsGood period={vsPrior} />
              <Delta value={mrrGrowth} text={fmtSignedPct(mrrGrowth)} upIsGood period={`over ${months.length} months`} />
            </>
          }
        />
        <StatTile
          label="Active subscriptions"
          value={fmtInt(latest.activeEnd)}
          trend={months.map((m) => m.activeEnd)}
          delta={<Delta value={latest.net} text={fmtSigned(latest.net)} upIsGood period={vsPrior} />}
        />
        <StatTile
          label={`New in ${latest.short}`}
          value={fmtInt(latest.newSubs)}
          trend={months.map((m) => m.newSubs)}
          delta={
            <Delta
              value={latest.newSubs - prior.newSubs}
              text={fmtSignedPct(latest.newSubs / prior.newSubs - 1)}
              upIsGood
              period={vsPrior}
            />
          }
        />
        <StatTile
          label={`Cancelled in ${latest.short}`}
          value={fmtInt(latest.cancelled)}
          trend={months.map((m) => m.cancelled)}
          delta={
            <Delta
              value={latest.cancelled - prior.cancelled}
              text={fmtSignedPct(latest.cancelled / prior.cancelled - 1)}
              upIsGood={false}
              period={vsPrior}
            />
          }
        />
        <StatTile
          label={`Churn rate, ${latest.short}`}
          value={fmtPct(latest.churnRate, 2)}
          trend={months.map((m) => m.churnRate)}
          delta={
            <Delta
              value={latest.churnRate - prior.churnRate}
              text={`${fmtSignedPct(latest.churnRate - prior.churnRate, 2)} pts`}
              upIsGood={false}
              period={vsPrior}
            />
          }
        />
      </section>

      <section className="charts viz">
        <Card className="chart-card">
          <CardHeader>
            <CardTitle>Monthly recurring revenue</CardTitle>
            <CardDescription>
              {fmtCompactUsd(mrrStartOfRange)} → {fmtCompactUsd(latest.mrr)} ({fmtSignedPct(mrrGrowth)}) over{' '}
              {months.length} months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MrrChart months={months} />
          </CardContent>
        </Card>
        <Card className="chart-card">
          <CardHeader>
            <CardTitle>New and cancelled subscriptions</CardTitle>
            <CardDescription>
              {fmtInt(totalNew)} new, {fmtInt(totalCancelled)} cancelled, net {fmtSigned(totalNew - totalCancelled)}.
              Average monthly churn {fmtPct(avgChurn, 2)}.
            </CardDescription>
            <ul className="legend" aria-label="Legend">
              <li>
                <span className="legend-swatch" style={{ background: 'var(--series-1)' }} /> New
              </li>
              <li>
                <span className="legend-swatch" style={{ background: 'var(--series-2)' }} /> Cancelled
              </li>
            </ul>
          </CardHeader>
          <CardContent>
            <SubscriptionFlowChart months={months} />
          </CardContent>
        </Card>
      </section>

      <Card className="table-card">
        <CardHeader>
          <CardTitle>Monthly detail</CardTitle>
          <CardDescription>The figures behind the charts, {rangeName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            aria-label="Monthly subscription metrics"
            columns={columns}
            rows={months}
            getRowId={(m) => m.key}
            getRowLabel={(m) => m.long}
            defaultSort={{ key: 'month', direction: 'descending' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  const [dark, setDark] = React.useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  );
  return (
    <AltitudeProvider scheme={dark ? 'nightfall' : 'daylight'} className="app-root">
      <Dashboard dark={dark} onDarkChange={setDark} />
    </AltitudeProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
