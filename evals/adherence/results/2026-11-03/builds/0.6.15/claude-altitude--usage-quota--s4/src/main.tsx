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
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './usage.css';
import { current, dailyStorage, october, plan, quotaReachedAt } from './usage-data';

const gb = (n: number) => `${n.toLocaleString('en', { maximumFractionDigits: 1 })} GB`;
const seats = (n: number) => n.toLocaleString('en');
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthYear = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function UsagePage() {
  const storageLeft = plan.storageQuotaGb - current.storageGb;
  const seatsLeft = plan.seats - current.seatsUsed;
  const fullBy = monthYear(quotaReachedAt());

  return (
    <main className="usage-page">
      <PageHeader>
        <PageHeaderTitle>Usage</PageHeaderTitle>
        <PageHeaderDescription>
          Storage and seats on your {plan.name} plan, as of {longDate(current.asOf)}.
        </PageHeaderDescription>
      </PageHeader>

      <div className="usage-sections">
        <Card>
          <CardHeader>
            <CardTitle>Plan limits</CardTitle>
            <CardDescription>
              {plan.name} plan: {plan.storageQuotaGb} GB of storage and {plan.seats} seats. A limit is marked near at 80%.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="usage-meters">
              <div>
                <Meter label="Storage" value={current.storageGb} max={plan.storageQuotaGb} high={plan.storageQuotaGb * 0.8} format={gb} />
                <p className="usage-note">
                  {gb(storageLeft)} left. At October's pace of about {gb(october.perDayGb)} a day, storage would reach the quota
                  around {fullBy}.
                </p>
              </div>
              <div>
                <Meter label="Seats" value={current.seatsUsed} max={plan.seats} high={plan.seats * 0.8} format={seats} />
                <p className="usage-note">
                  {seatsLeft} seats free for new members.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ paddingTop: 'var(--space-5)' }}>
            <ChartContainer
              title="Storage used each day, October 2026"
              takeaway={`Storage is growing: up ${gb(october.addedGb)} (${october.growthPct}%) in October`}
              summary={`Storage rose from ${gb(october.first)} on 1 October to ${gb(october.last)} on 31 October, about ${gb(october.perDayGb)} a day, growing faster on weekdays than at weekends. The only fall was on 17 October, when an archive of old exports was deleted. The plan quota is ${plan.storageQuotaGb} GB.`}
              config={{ storage: { label: 'Storage used', format: gb } }}
              zero={false}
              aspect={2.4}
              xLabel="Day"
              views
            >
              <LineChart data={dailyStorage} x="day" curve="monotone">
                <ChartReference y={plan.storageQuotaGb} label={`Plan quota ${plan.storageQuotaGb} GB`} />
                <ChartAnnotation x="2026-10-17" label="Old exports deleted" />
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
    <UsagePage />
  </AltitudeProvider>,
);
