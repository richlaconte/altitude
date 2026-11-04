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
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './usage.css';
import { OCTOBER, PLAN, trendSlope } from './data';
import { UsageChart } from './UsageChart';

const TODAY = new Date(2026, 10, 3);
const fmtMonth = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const fmtRow = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

function meterTone(ratio: number): 'accent' | 'caution' | 'critical' {
  if (ratio >= 0.95) return 'critical';
  if (ratio >= 0.8) return 'caution';
  return 'accent';
}

function Meter({ value, max, label, tone }: { value: number; max: number; label: string; tone: string }) {
  return <Progress className="meter" data-tone={tone} value={value} max={max} aria-label={label} />;
}

function StorageCard() {
  const { storageUsedGb: used, storageQuotaGb: quota } = PLAN;
  const ratio = used / quota;
  const tone = meterTone(ratio);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage</CardTitle>
        <CardDescription>Across all members and shared folders</CardDescription>
      </CardHeader>
      <CardContent className="stat">
        <div className="stat-row">
          <p className="stat-value">
            {used} GB <span className="stat-of">of {quota} GB</span>
          </p>
          {tone !== 'accent' && (
            <Badge tone={tone === 'critical' ? 'critical' : 'caution'}>{Math.round(ratio * 100)}% used</Badge>
          )}
        </div>
        <Meter value={used} max={quota} label={`Storage: ${used} of ${quota} GB used`} tone={tone} />
        <p className="stat-foot">{quota - used} GB left on your plan</p>
      </CardContent>
    </Card>
  );
}

function SeatsCard() {
  const { seatsUsed: used, seatsTotal: total } = PLAN;
  const tone = meterTone(used / total);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seats</CardTitle>
        <CardDescription>Members with an active licence</CardDescription>
      </CardHeader>
      <CardContent className="stat">
        <div className="stat-row">
          <p className="stat-value">
            {used} <span className="stat-of">of {total} seats</span>
          </p>
        </div>
        <Meter value={used} max={total} label={`Seats: ${used} of ${total} assigned`} tone={tone} />
        <p className="stat-foot">{total - used} seats available to invite</p>
      </CardContent>
    </Card>
  );
}

function DailyUsageCard() {
  const days = OCTOBER;
  const first = days[0];
  const last = days[days.length - 1];
  const trend = React.useMemo(() => trendSlope(days), [days]);
  const growth = last.gb - first.gb;
  const growthPct = (growth / first.gb) * 100;
  const growing = trend.slope > 0.05;

  // Projection from today's figure at last month's trend rate.
  const remaining = PLAN.storageQuotaGb - PLAN.storageUsedGb;
  const daysToFull = growing ? Math.round(remaining / trend.slope) : null;
  const fullOn = daysToFull !== null ? new Date(TODAY.getTime() + daysToFull * 86_400_000) : null;

  return (
    <Card className="span-2">
      <CardHeader>
        <div className="card-head-row">
          <div>
            <CardTitle>Storage used per day, {fmtMonth.format(first.date)}</CardTitle>
            <CardDescription>Total stored at the end of each day</CardDescription>
          </div>
          <Badge tone={growing ? 'caution' : 'positive'}>{growing ? 'Growing' : 'Flat'}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="summary">
          <div>
            <dt>Change over the month</dt>
            <dd>
              {growth >= 0 ? '+' : '−'}
              {Math.abs(growth).toFixed(1)} GB <span className="summary-sub">({growthPct.toFixed(1)}%)</span>
            </dd>
          </div>
          <div>
            <dt>Average growth</dt>
            <dd>
              {trend.slope >= 0 ? '+' : '−'}
              {Math.abs(trend.slope).toFixed(1)} GB <span className="summary-sub">per day</span>
            </dd>
          </div>
          {fullOn && (
            <div>
              <dt>Quota reached at this pace</dt>
              <dd>
                {new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(fullOn)}{' '}
                <span className="summary-sub">in ~{daysToFull} days</span>
              </dd>
            </div>
          )}
        </dl>

        <Tabs defaultValue="chart" variant="segmented" className="view-tabs">
          <TabsList aria-label="View">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          <TabsContent value="chart">
            <UsageChart days={days} trend={trend} />
            <p className="chart-note">
              <span className="legend-key legend-key-trend" aria-hidden /> Dashed line is the trend across the month.
              The dip on 14 Oct is an archive folder being emptied.
            </p>
          </TabsContent>
          <TabsContent value="table">
            <Table maxHeight={320} aria-label={`Storage used per day, ${fmtMonth.format(first.date)}`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead align="end">Storage used</TableHead>
                  <TableHead align="end">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((d, i) => {
                  const ch = i ? d.gb - days[i - 1].gb : null;
                  return (
                    <TableRow key={i}>
                      <TableCell>{fmtRow.format(d.date)}</TableCell>
                      <TableCell align="end" className="num">{d.gb.toFixed(1)} GB</TableCell>
                      <TableCell align="end" className="num">
                        {ch === null ? '—' : `${ch >= 0 ? '+' : '−'}${Math.abs(ch).toFixed(1)} GB`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function App() {
  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Usage</h1>
          <p className="page-sub">
            {PLAN.name} plan · renews {PLAN.renews}
          </p>
        </div>
        <Button variant="primary">Upgrade plan</Button>
      </header>
      <section className="grid" aria-label="Plan usage">
        <StorageCard />
        <SeatsCard />
        <DailyUsageCard />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
