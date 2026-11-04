import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {
  AltitudeProvider,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type DataTableColumn,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './usage.css';
import {OCTOBER, PLAN, type DayUsage} from './data';
import {UsageChart, fmtDay} from './UsageChart';

const TODAY = new Date('2026-11-03T12:00:00');

function Meter({
  label,
  used,
  total,
  unit,
  note,
  badge,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
  note: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const pct = Math.round((used / total) * 100);
  return (
    <Card className="meter">
      <CardHeader>
        <div className="meter-head">
          <CardTitle>{label}</CardTitle>
          {badge}
        </div>
      </CardHeader>
      <CardContent>
        <p className="meter-figure">
          <span className="meter-used">{used}</span>
          <span className="meter-total">
            {' '}of {total} {unit}
          </span>
        </p>
        <Progress value={used} max={total} aria-label={`${label}: ${used} of ${total} ${unit} (${pct}%)`} />
        <p className="meter-note">
          <span>{pct}% used</span>
          <span>{note}</span>
        </p>
      </CardContent>
    </Card>
  );
}

type Row = DayUsage & {change: number | null};

const rows: Row[] = OCTOBER.map((d, i) => ({...d, change: i ? +(d.usedGb - OCTOBER[i - 1].usedGb).toFixed(1) : null}));

const columns: DataTableColumn<Row>[] = [
  {key: 'date', header: 'Date', cell: (r) => fmtDay(r.date, {weekday: 'short', month: 'short', day: 'numeric'}), sortValue: (r) => r.date},
  {key: 'usedGb', header: 'Storage used', align: 'end', cell: (r) => `${r.usedGb.toFixed(1)} GB`, sortValue: (r) => r.usedGb},
  {
    key: 'change',
    header: 'Change',
    align: 'end',
    cell: (r) => (r.change == null ? '—' : `${r.change >= 0 ? '+' : '−'}${Math.abs(r.change).toFixed(1)} GB`),
    sortValue: (r) => r.change ?? 0,
  },
];

function App() {
  const first = OCTOBER[0].usedGb;
  const last = OCTOBER[OCTOBER.length - 1].usedGb;
  const growth = last - first;
  const growthPct = (growth / first) * 100;
  const perDay = growth / (OCTOBER.length - 1);
  const remaining = PLAN.storageQuotaGb - PLAN.storageUsedGb;
  const daysLeft = Math.floor(remaining / perDay);
  const fullOn = new Date(TODAY.getTime() + daysLeft * 86400000).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
  const storagePct = PLAN.storageUsedGb / PLAN.storageQuotaGb;

  return (
    <main className="usage">
      <header className="usage-header">
        <div>
          <h1>Usage</h1>
          <p className="usage-sub">
            {PLAN.name} plan · renews {PLAN.renewsOn}
          </p>
        </div>
      </header>

      <section className="meters" aria-label="Plan limits">
        <Meter
          label="Storage"
          used={PLAN.storageUsedGb}
          total={PLAN.storageQuotaGb}
          unit="GB"
          note={`${remaining} GB left`}
          badge={
            storagePct >= 0.8 ? (
              <Badge tone="caution">Nearing quota</Badge>
            ) : undefined
          }
        />
        <Meter
          label="Seats"
          used={PLAN.seatsUsed}
          total={PLAN.seatsTotal}
          unit="seats"
          note={`${PLAN.seatsTotal - PLAN.seatsUsed} seats available`}
        />
      </section>

      <Card className="trend">
        <CardHeader>
          <CardTitle>Storage used per day · October 2026</CardTitle>
          <CardDescription>Measured at the end of each day.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="trend-summary">
            <div>
              <div className="trend-stat">
                <span aria-hidden="true">↑</span> +{growth.toFixed(1)} GB
              </div>
              <div className="trend-label">
                Growing · {growthPct.toFixed(1)}% over the month ({first} → {last} GB)
              </div>
            </div>
            <div>
              <div className="trend-stat">{perDay.toFixed(1)} GB/day</div>
              <div className="trend-label">Average daily growth</div>
            </div>
            <div>
              <div className="trend-stat">~{fullOn.replace(/, \d{4}$/, '')}</div>
              <div className="trend-label">Quota reached at this pace ({daysLeft} days)</div>
            </div>
          </div>

          <Tabs variant="segmented" defaultValue="chart" className="trend-tabs">
            <TabsList aria-label="View">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
            <TabsContent value="chart">
              <UsageChart data={OCTOBER} quotaGb={PLAN.storageQuotaGb} />
              <p className="chart-footnote">The axis starts at 350 GB so daily changes are visible.</p>
            </TabsContent>
            <TabsContent value="table">
              <DataTable columns={columns} rows={rows} getRowId={(r) => r.date} getRowLabel={(r) => fmtDay(r.date)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <App />
  </AltitudeProvider>,
);
