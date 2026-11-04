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
import './styles.css';
import { october, plan } from './data';
import { UsageChart } from './UsageChart';

const DAY_MS = 86_400_000;

function StorageCard() {
  const { storageUsedGb: used, storageQuotaGb: quota } = plan;
  const pct = Math.round((used / quota) * 100);
  const nearLimit = pct >= 80;
  return (
    <Card>
      <CardHeader>
        <div className="card-head-row">
          <CardTitle>Storage</CardTitle>
          {nearLimit ? <Badge tone="caution">{pct}% used</Badge> : <Badge>{pct}% used</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <p className="figure">
          {used} GB <span className="figure-of">of {quota} GB</span>
        </p>
        <Progress
          className={nearLimit ? 'meter meter-caution' : 'meter'}
          value={used}
          max={quota}
          aria-label={`Storage: ${used} of ${quota} GB used`}
        />
        <p className="meta">{quota - used} GB remaining on the {plan.name} plan</p>
      </CardContent>
    </Card>
  );
}

function SeatsCard() {
  const { seatsUsed: used, seatsTotal: total } = plan;
  const pct = Math.round((used / total) * 100);
  return (
    <Card>
      <CardHeader>
        <div className="card-head-row">
          <CardTitle>Seats</CardTitle>
          <Badge>{pct}% assigned</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="figure">
          {used} <span className="figure-of">of {total} seats</span>
        </p>
        <Progress className="meter" value={used} max={total} aria-label={`Seats: ${used} of ${total} assigned`} />
        <p className="meta">{total - used} seats available to invite</p>
      </CardContent>
    </Card>
  );
}

function TrendCard() {
  const first = october[0];
  const last = october[october.length - 1];
  const growth = last.gb - first.gb;
  const growthPct = (growth / first.gb) * 100;
  const perDay = growth / (october.length - 1);
  const daysToQuota = (plan.storageQuotaGb - plan.storageUsedGb) / perDay;
  const fullOn = new Date(plan.asOf.getTime() + daysToQuota * DAY_MS);
  const fullLabel = fullOn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage used per day</CardTitle>
        <CardDescription>October 2026 · end-of-day total across the workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="trend-summary">
          <div>
            <div className="trend-value">
              <span aria-hidden>▲</span> +{growth.toFixed(1)} GB
            </div>
            <div className="meta">Growing: up {growthPct.toFixed(1)}% over October</div>
          </div>
          <div>
            <div className="trend-value">+{perDay.toFixed(1)} GB</div>
            <div className="meta">Average added per day</div>
          </div>
          <div>
            <div className="trend-value">~{fullLabel}</div>
            <div className="meta">Quota full at this rate</div>
          </div>
        </div>

        <Tabs variant="segmented" defaultValue="chart">
          <TabsList aria-label="View">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          <TabsContent value="chart">
            <UsageChart data={october} quotaGb={plan.storageQuotaGb} />
          </TabsContent>
          <TabsContent value="table">
            <Table maxHeight={320}>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead align="end">Storage used</TableHead>
                  <TableHead align="end">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {october.map((d, i) => {
                  const delta = i ? d.gb - october[i - 1].gb : null;
                  return (
                    <TableRow key={i}>
                      <TableCell>{d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</TableCell>
                      <TableCell align="end" className="num">{d.gb.toFixed(1)} GB</TableCell>
                      <TableCell align="end" className="num">
                        {delta == null ? '—' : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} GB`}
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
  const asOf = plan.asOf.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Usage</h1>
          <p className="meta">
            {plan.name} plan · updated {asOf}
          </p>
        </div>
        <Button variant="secondary">Upgrade plan</Button>
      </header>
      <section className="kpis" aria-label="Plan limits">
        <StorageCard />
        <SeatsCard />
      </section>
      <TrendCard />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
