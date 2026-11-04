// Design record (screen-layout pattern, report frame)
//   Task: a founder or finance lead at Rotawell reads how the subscription business has moved over the last twelve
//         complete months: recurring revenue, signups and cancellations.
//   Lead: the MRR trend, its takeaway as the heading. Secondary numbers (October's new, cancelled, churn, active)
//         follow, smaller and grouped, then the new-versus-cancelled chart that explains them.
//   Primary action: none; reading is the task. Each chart offers a table view for checking exact figures.
//   Data shape: one row per month (see src/data.ts). Sample data, said so on screen; no backend, so no loading,
//         error, refresh, permissions or persistence states apply. Unresolved: the real data source, the reporting
//         currency, and whether MRR should include annual plans normalised to monthly.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  BarChart,
  Card,
  CardContent,
  ChartAnnotation,
  ChartContainer,
  LineChart,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Sparkline,
  Stat,
  StatGroup,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { MONTHS, PRICE_CHANGE_MONTH, count, percent, usd, usdCompact } from './data';

const first = MONTHS[0];
const last = MONTHS[MONTHS.length - 1];
const prev = MONTHS[MONTHS.length - 2];
const period = `${first.label} – ${last.label}`;

const mrrGrowth = last.mrr / first.mrr - 1;
const totalNew = MONTHS.reduce((n, m) => n + m.newSubs, 0);
const totalCancelled = MONTHS.reduce((n, m) => n + m.cancelled, 0);
const peakCancel = MONTHS.reduce((a, m) => (m.cancelled > a.cancelled ? m : a));
const allPositive = MONTHS.every((m) => m.newSubs > m.cancelled);
const firstHalfChurn = MONTHS.slice(0, 6).reduce((n, m) => n + m.churnRate, 0) / 6;
const secondHalfChurn = MONTHS.slice(6).reduce((n, m) => n + m.churnRate, 0) / 6;

const change = (now: number, before: number) => now / before - 1;
const pp = (magnitude: number) => `${(magnitude * 100).toFixed(1)} pts`;

function App() {
  return (
    <main className="dash">
      <PageHeader>
        <PageHeaderTitle>Subscription overview</PageHeaderTitle>
        <PageHeaderDescription>
          Rotawell, {period}. Sample data for illustration; figures are not from a live system.
        </PageHeaderDescription>
      </PageHeader>

      <Card className="dash-lead">
        <CardContent className="dash-card-body">
          <ChartContainer
            title="Monthly recurring revenue"
            takeaway={`MRR grew ${percent.format(mrrGrowth)} in twelve months, to ${usdCompact.format(last.mrr)}, with a price rise in April and faster signups from August`}
            config={{ mrr: { label: 'MRR', format: usd.format } }}
            yFormat={(v) => usdCompact.format(v)}
            xLabel="Month"
            aspect={2.8}
            zero
            views
            summary={`Monthly recurring revenue rose every month, from ${usd.format(first.mrr)} at the end of ${first.label} to ${usd.format(last.mrr)} at the end of ${last.label}, up ${percent.format(mrrGrowth)}. The list price moved from $94 to $99 a month in April 2026.`}
          >
            <LineChart data={MONTHS} x="month">
              <ChartAnnotation x={PRICE_CHANGE_MONTH} label="Price $94 → $99" />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <section className="dash-section" aria-labelledby="october-heading">
        <h2 id="october-heading" className="dash-heading">{last.label} in numbers</h2>
        <StatGroup aria-label={`${last.label} in numbers`}>
          <Card>
            <CardContent>
              <Stat
                label="MRR at month end"
                value={last.mrr}
                format={usd.format}
                good="up"
                change={{ value: change(last.mrr, prev.mrr), vs: prev.label, previous: prev.mrr }}
                trend={<Sparkline data={MONTHS} y="mrr" x="month" decorative />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="New subscriptions"
                value={last.newSubs}
                good="up"
                change={{ value: change(last.newSubs, prev.newSubs), vs: prev.label, previous: prev.newSubs }}
                trend={<Sparkline data={MONTHS} y="newSubs" x="month" decorative />}
                locale="en-US"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Cancelled subscriptions"
                value={last.cancelled}
                good="down"
                change={{ value: change(last.cancelled, prev.cancelled), vs: prev.label, previous: prev.cancelled }}
                trend={<Sparkline data={MONTHS} y="cancelled" x="month" decorative />}
                locale="en-US"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Monthly churn rate"
                value={percent.format(last.churnRate)}
                good="down"
                change={{ value: last.churnRate - prev.churnRate, vs: prev.label, format: pp }}
                help={`Cancelled ÷ active on 1 ${last.label.split(' ')[0]}.`}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Active subscriptions"
                value={last.endSubs}
                good="up"
                change={{ value: change(last.endSubs, prev.endSubs), vs: prev.label, previous: prev.endSubs }}
                help={`${count.format(first.startSubs)} on 1 ${first.label}.`}
                locale="en-US"
              />
            </CardContent>
          </Card>
        </StatGroup>
      </section>

      <Card>
        <CardContent className="dash-card-body">
          <ChartContainer
            title="New and cancelled subscriptions per month"
            takeaway={
              allPositive
                ? `New subscriptions outnumbered cancellations every month; cancellations peaked in ${peakCancel.label.split(' ')[0]} at ${peakCancel.cancelled}`
                : `Cancellations peaked in ${peakCancel.label} at ${peakCancel.cancelled}`
            }
            config={{
              newSubs: { label: 'New', format: count.format },
              cancelled: { label: 'Cancelled', format: count.format },
            }}
            xLabel="Month"
            xFormat={(v) => MONTHS.find((m) => m.month === v)?.label.split(' ')[0] ?? String(v)}
            aspect={2.8}
            views
            summary={`${count.format(totalNew)} new subscriptions and ${count.format(totalCancelled)} cancellations from ${period}, a net gain of ${count.format(totalNew - totalCancelled)}. New subscriptions were highest in ${MONTHS.reduce((a, m) => (m.newSubs > a.newSubs ? m : a)).label}. Average monthly churn fell from ${percent.format(firstHalfChurn)} in the first six months to ${percent.format(secondHalfChurn)} in the last six.`}
          >
            <BarChart data={MONTHS} x="month" />
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
