import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {
  AltitudeProvider, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Progress, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent,
  TabsList, TabsTrigger,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';
import {
  AVG_DAILY_GB, MONTH_CHANGE_GB, MONTH_CHANGE_PCT, OCTOBER, PLAN, PROJECTED_FULL,
  fmtDayLong, fmtGb,
} from './data';
import {StorageChart} from './StorageChart';

const fmtDate = (d: Date) => d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});

function StorageCard() {
  const pct = Math.round((PLAN.storageUsedGb / PLAN.storageQuotaGb) * 100);
  const free = PLAN.storageQuotaGb - PLAN.storageUsedGb;
  return (
    <Card>
      <CardHeader>
        <div className="card-head-row">
          <CardTitle>Storage</CardTitle>
          <Badge tone="caution">{pct}% used</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="stat">
          <span className="stat-value">{PLAN.storageUsedGb} GB</span>
          <span className="stat-of"> of {PLAN.storageQuotaGb} GB</span>
        </p>
        <Progress value={PLAN.storageUsedGb} max={PLAN.storageQuotaGb} aria-label={`Storage: ${PLAN.storageUsedGb} of ${PLAN.storageQuotaGb} GB used`} />
        <p className="meta">
          {free} GB free · at October's pace, full around <strong>{fmtDate(PROJECTED_FULL.date)}</strong>
        </p>
      </CardContent>
    </Card>
  );
}

function SeatsCard() {
  const open = PLAN.seatQuota - PLAN.seatsUsed;
  return (
    <Card>
      <CardHeader>
        <div className="card-head-row">
          <CardTitle>Seats</CardTitle>
          <Badge>{open} available</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="stat">
          <span className="stat-value">{PLAN.seatsUsed}</span>
          <span className="stat-of"> of {PLAN.seatQuota} seats</span>
        </p>
        <Progress value={PLAN.seatsUsed} max={PLAN.seatQuota} aria-label={`Seats: ${PLAN.seatsUsed} of ${PLAN.seatQuota} used`} />
        <p className="meta">{open} people can be invited before you need more seats</p>
      </CardContent>
    </Card>
  );
}

function TrendCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage used each day, October 2026</CardTitle>
        <CardDescription>
          Growing: up <strong>{fmtGb(MONTH_CHANGE_GB)}</strong> (+{MONTH_CHANGE_PCT.toFixed(1)}%) over the month,
          about {AVG_DAILY_GB.toFixed(1)} GB a day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" variant="segmented">
          <TabsList aria-label="View">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          <TabsContent value="chart">
            <StorageChart data={OCTOBER} />
            <p className="meta">End-of-day totals. The axis starts at 360 GB so day-to-day change is visible.</p>
          </TabsContent>
          <TabsContent value="table">
            <Table maxHeight={320} aria-label="Storage used each day in October 2026">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead align="end">Used</TableHead>
                  <TableHead align="end">Change</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {OCTOBER.map((d, i) => {
                  const change = i ? d.usedGb - OCTOBER[i - 1].usedGb : null;
                  return (
                    <TableRow key={i}>
                      <TableCell>{fmtDayLong(d.date)}</TableCell>
                      <TableCell align="end" className="num">{fmtGb(d.usedGb)}</TableCell>
                      <TableCell align="end" className="num">
                        {change === null ? '—' : `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(1)} GB`}
                      </TableCell>
                      <TableCell>{d.note ?? ''}</TableCell>
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
          <p className="meta">{PLAN.name} plan · as of {fmtDate(PLAN.asOf)}</p>
        </div>
        <Button variant="primary">Upgrade plan</Button>
      </header>
      <div className="grid-2">
        <StorageCard />
        <SeatsCard />
      </div>
      <TrendCard />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider><App /></AltitudeProvider>,
);
