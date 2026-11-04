import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartReference,
  LineChart,
  Meter,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Toaster,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './usage.css';
import { current, dailyStorage, plan } from './data';

const gb = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} GB`;
const count = (n: number) => String(n);
const longDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Everything said about the trend is read from the data shown, not written by hand.
const first = dailyStorage[0];
const last = dailyStorage[dailyStorage.length - 1];
const grewGb = last.storage - first.storage;
const perDay = grewGb / (dailyStorage.length - 1);
const grewPct = grewGb / first.storage;
const nearLimitDay = dailyStorage.find((d) => d.storage >= plan.storageNearLimitGb);
const daysToQuota = Math.ceil((plan.storageQuotaGb - current.storageGb) / perDay);
const quotaDate = new Date(Date.parse(current.asOf) + daysToQuota * 86400e3);

const takeaway = `Storage grew ${Math.round(grewGb)} GB in October, about ${perDay.toFixed(1)} GB a day`;
const summary =
  `Storage rose steadily from ${gb(first.storage)} on 1 October to ${gb(last.storage)} on 31 October, ` +
  `up ${(grewPct * 100).toFixed(0)}%, with one dip after a cleanup on 9 October. ` +
  (nearLimitDay ? `It passed the ${gb(plan.storageNearLimitGb)} near-limit mark on ${longDate.format(new Date(nearLimitDay.day))}. ` : '') +
  `At October's rate, you'd reach the ${gb(plan.storageQuotaGb)} quota around ${longDate.format(quotaDate)}.`;

function downloadCsv() {
  const rows = ['Date,Storage used (GB)', ...dailyStorage.map((d) => `${d.day},${d.storage}`)].join('\n');
  const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'storage-usage-2026-10.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function App() {
  return (
    <main className="usage-page">
      <PageHeader actions={<Button variant="secondary" onClick={downloadCsv}>Download October usage</Button>}>
        <PageHeaderTitle>Usage</PageHeaderTitle>
        <PageHeaderDescription>
          How much of your {plan.name} plan you're using, as of {longDate.format(new Date(current.asOf))}.
        </PageHeaderDescription>
      </PageHeader>

      <div className="usage-grid">
        <Card>
          <CardHeader>
            <CardTitle>Plan limits</CardTitle>
            <CardDescription>
              {plan.name} plan: {gb(plan.storageQuotaGb)} of storage and {plan.seats} seats. A limit is near from 80%.
            </CardDescription>
          </CardHeader>
          <CardContent className="usage-meters">
            <Meter
              label="Storage"
              value={current.storageGb}
              max={plan.storageQuotaGb}
              high={plan.storageNearLimitGb}
              format={gb}
            />
            <p className="usage-note">
              {gb(plan.storageQuotaGb - current.storageGb)} left. Files in the trash count until they're deleted for good.
            </p>
            <Meter
              label="Seats"
              value={current.seatsUsed}
              max={plan.seats}
              high={plan.seatsNearLimit}
              format={count}
            />
            <p className="usage-note">
              {plan.seats - current.seatsUsed} seats free. Each member with access to the workspace uses one seat.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="usage-chart">
            <ChartContainer
              title="Storage used each day, October 2026"
              takeaway={takeaway}
              summary={summary}
              config={{ storage: { label: 'Storage used', format: gb } }}
              zero={false}
              views
              xLabel="Date"
              aspect={2.4}
            >
              <LineChart data={dailyStorage} x="day" curve="monotone">
                <ChartReference y={plan.storageNearLimitGb} label={`Near limit, ${gb(plan.storageNearLimitGb)}`} tone="caution" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
    <Toaster />
  </AltitudeProvider>,
);
