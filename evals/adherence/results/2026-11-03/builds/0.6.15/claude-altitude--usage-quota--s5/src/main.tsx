import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartAnnotation,
  ChartContainer,
  ChartReference,
  LineChart,
  Meter,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Stat,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { CLEANUP, CURRENT, DAILY_STORAGE, PLAN, SEPTEMBER_ADDED_GB, THRESHOLDS } from './data';

const gb = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} GB`;
const seats = (n: number) => `${n}`;
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Everything below is read from the sample data, so the words always match the chart.
const first = DAILY_STORAGE[0];
const last = DAILY_STORAGE[DAILY_STORAGE.length - 1];
const addedInOctober = Math.round((last.storage - first.storage) * 10) / 10;
const perDay = addedInOctober / (DAILY_STORAGE.length - 1);
const daysToQuota = Math.ceil((PLAN.storageQuotaGb - CURRENT.storageUsedGb) / perDay);
const quotaDate = new Date(`${CURRENT.asOf}T00:00:00Z`);
quotaDate.setUTCDate(quotaDate.getUTCDate() + daysToQuota);
const quotaDateWords = longDate(quotaDate.toISOString().slice(0, 10));

function UsagePage() {
  const seatsFree = PLAN.seatLimit - CURRENT.seatsUsed;
  const storageFree = PLAN.storageQuotaGb - CURRENT.storageUsedGb;

  return (
    <main className="usage-page">
      <PageHeader>
        <PageHeaderTitle>Usage</PageHeaderTitle>
        <PageHeaderDescription>
          Storage and seats on your {PLAN.name} plan, as of {longDate(CURRENT.asOf)}.
        </PageHeaderDescription>
      </PageHeader>

      <div className="usage-grid">
        <Card>
          <CardHeader>
            <CardTitle>Plan limits</CardTitle>
            <CardDescription>{PLAN.name} plan: {PLAN.storageQuotaGb} GB of storage and {PLAN.seatLimit} seats.</CardDescription>
          </CardHeader>
          <CardContent className="usage-stack">
            <Meter
              label="Storage"
              value={CURRENT.storageUsedGb}
              max={PLAN.storageQuotaGb}
              high={THRESHOLDS.storageGb}
              format={gb}
            />
            <Meter
              label="Seats"
              value={CURRENT.seatsUsed}
              max={PLAN.seatLimit}
              high={THRESHOLDS.seats}
              format={seats}
            />
            <CardDescription>
              {storageFree} GB of storage and {seatsFree} seats are left. Storage is near its limit from{' '}
              {THRESHOLDS.storageGb} GB, seats from {THRESHOLDS.seats}.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stat
              label="Storage added in October"
              value={addedInOctober}
              format={gb}
              change={{ value: addedInOctober - SEPTEMBER_ADDED_GB, vs: 'September', previous: SEPTEMBER_ADDED_GB, format: gb }}
              help={
                <>
                  About {perDay.toFixed(1)} GB a day. If that pace holds, you'll reach the {PLAN.storageQuotaGb} GB quota
                  around {quotaDateWords}. This estimate uses October's daily average and updates each day.
                </>
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card className="usage-chart">
        <CardContent style={{ paddingTop: 'var(--space-5)' }}>
          <ChartContainer
            title="Storage used each day, October 2026"
            takeaway={`Storage grew steadily in October, by ${gb(addedInOctober)}`}
            summary={`Storage rose from ${gb(first.storage)} on 1 October to ${gb(last.storage)} on 31 October, about ${perDay.toFixed(1)} GB a day, with smaller gains at weekends. Deleting old backups on 16 October freed 6.7 GB, and growth resumed the next working day. Usage passed the ${THRESHOLDS.storageGb} GB near-limit mark on 27 October.`}
            config={{ storage: { label: 'Storage used', format: gb } }}
            zero={false}
            aspect={2.6}
            xLabel="Day"
            views
          >
            <LineChart data={DAILY_STORAGE} x="day" curve="linear">
              <ChartReference y={THRESHOLDS.storageGb} label={`Near limit, ${THRESHOLDS.storageGb} GB`} tone="caution" />
              <ChartAnnotation x={CLEANUP.day} label={CLEANUP.label} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <UsagePage />
  </AltitudeProvider>,
);
