import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Card,
  CardContent,
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
import {
  plan,
  seatsHigh,
  seatsUsed,
  storageByDay,
  storageHighGb,
  storageStartGb,
  storageUsedGb,
} from './data';

const gb = (n: number) => `${n.toLocaleString('en', { maximumFractionDigits: 1 })} GB`;

const octoberEnd = storageByDay[storageByDay.length - 1].storage;
const octoberGrowth = octoberEnd - storageStartGb;
const perDay = octoberGrowth / storageByDay.length;

function App() {
  return (
    <main className="usage">
      <PageHeader>
        <PageHeaderTitle>Usage</PageHeaderTitle>
        <PageHeaderDescription>
          {plan.name} plan: {plan.storageQuotaGb} GB of storage and {plan.seats} seats. Readings as of 3 November 2026.
        </PageHeaderDescription>
      </PageHeader>

      <section className="usage-quotas" aria-labelledby="quotas-h">
        <h2 id="quotas-h" className="usage-h2">Plan quotas</h2>
        <div className="usage-meters">
          <div>
            <Meter
              label="Storage"
              value={storageUsedGb}
              max={plan.storageQuotaGb}
              high={storageHighGb}
              format={gb}
            />
            <p className="usage-note">
              {gb(plan.storageQuotaGb - storageUsedGb)} left. At October’s pace you’ll reach the quota around mid-January.
            </p>
          </div>
          <div>
            <Meter
              label="Seats"
              value={seatsUsed}
              max={plan.seats}
              high={seatsHigh}
              format={(n) => String(n)}
            />
            <p className="usage-note">{plan.seats - seatsUsed} seats free for new members.</p>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="usage-chart">
          <ChartContainer
            title="Storage used each day, October 2026"
            takeaway={`Storage grew ${gb(octoberGrowth)} in October, about ${gb(perDay)} a day`}
            summary={`Storage rose steadily from ${gb(storageByDay[0].storage)} on 1 October to ${gb(octoberEnd)} on 31 October. It grew on every weekday and barely moved at weekends. The one drop, 5.2 GB on 16 October, was the trash being emptied. Usage passed the ${gb(storageHighGb)} near-limit threshold on 27 October.`}
            config={{ storage: { label: 'Storage used', format: gb } }}
            zero={false}
            aspect={2.6}
            views
            xLabel="Day"
          >
            <LineChart data={storageByDay} x="day" />
            <ChartReference y={storageHighGb} label={`Near limit, ${gb(storageHighGb)}`} tone="caution" />
          </ChartContainer>
        </CardContent>
      </Card>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
