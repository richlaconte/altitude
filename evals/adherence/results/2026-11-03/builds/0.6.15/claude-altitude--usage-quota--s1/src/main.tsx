import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  LineChart,
  Meter,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Stat,
  StatGroup,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import { current, dailyStorage, plan } from './usage-data';

const gb = (n: number) => `${Math.round(n * 10) / 10} GB`;
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' });

const first = dailyStorage[0];
const last = dailyStorage[dailyStorage.length - 1];
const monthGrowthGb = last.usedGb - first.usedGb;
const perDayGb = monthGrowthGb / (dailyStorage.length - 1);
const remainingGb = plan.storageQuotaGb - current.storageUsedGb;
const daysToFull = Math.floor(remainingGb / perDayGb);
const fullOn = new Date(`${current.asOf}T00:00:00Z`);
fullOn.setUTCDate(fullOn.getUTCDate() + daysToFull);

const growthTakeaway = `Storage grew ${Math.round(monthGrowthGb)} GB in October, about ${perDayGb.toFixed(1)} GB a day`;
const growthSummary =
  `Storage rose from ${gb(first.usedGb)} on 1 October to ${gb(last.usedGb)} on 31 October, ` +
  `up ${Math.round((monthGrowthGb / first.usedGb) * 100)}%. It grew on most weekdays and held flat at weekends; ` +
  `a cleanup on 14 October freed about 6 GB, which was taken up again within five days.`;

function App() {
  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
      <PageHeader>
        <PageHeaderTitle>Usage</PageHeaderTitle>
        <PageHeaderDescription>
          Storage and seats on your {plan.name} plan, as of {dateFmt.format(new Date(`${current.asOf}T00:00:00Z`))}.
        </PageHeaderDescription>
      </PageHeader>

      <div style={{ display: 'grid', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
        <Card>
          <CardHeader>
            <CardTitle>Plan limits</CardTitle>
            <CardDescription>
              {plan.name} plan: {plan.storageQuotaGb} GB of storage and {plan.seatLimit} seats.
            </CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: 'var(--space-6)' }}>
            <Meter
              label="Storage"
              value={current.storageUsedGb}
              max={plan.storageQuotaGb}
              high={plan.storageQuotaGb * 0.8}
              format={(n) => `${n} GB`}
            />
            <Meter
              label="Seats"
              value={current.seatsUsed}
              max={plan.seatLimit}
              high={plan.seatLimit * 0.8}
              format={(n) => `${n}`}
            />
          </CardContent>
        </Card>

        <StatGroup aria-label="Storage at a glance">
          <Card>
            <CardContent>
              <Stat
                label="Storage remaining"
                value={remainingGb}
                format={gb}
                help={`At October's rate, you'd reach ${plan.storageQuotaGb} GB around ${dateFmt.format(fullOn)}.`}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Added in October"
                value={monthGrowthGb}
                format={gb}
                change={{ value: monthGrowthGb / first.usedGb, vs: '1 October', previous: first.usedGb }}
                help="Net of files deleted during the month."
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Seats available"
                value={plan.seatLimit - current.seatsUsed}
                help={`${current.seatsUsed} of ${plan.seatLimit} seats are assigned.`}
              />
            </CardContent>
          </Card>
        </StatGroup>

        <Card>
          <CardContent style={{ paddingTop: 'var(--space-5)' }}>
            <ChartContainer
              title="Storage used each day, October 2026"
              takeaway={growthTakeaway}
              summary={growthSummary}
              config={{ usedGb: { label: 'Storage used', format: gb } }}
              zero={false}
              views
              aspect={2.6}
            >
              <LineChart data={dailyStorage} x="day" />
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
  </AltitudeProvider>,
);
