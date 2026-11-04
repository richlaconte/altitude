// Design record (screen-layout pattern, report frame)
//   Task: the founders and finance lead of Drafthall read how the subscription business has moved over the last
//         twelve months, at the start of a month.
//   Lead: monthly recurring revenue, as the one hero number and the chart whose takeaway heads it.
//   Primary action: none (reading is the task). Next: the October cohort and plan reports (not built here).
//   Data shape: one record per month, November 2025 to October 2026: MRR at month end, subscriptions started,
//         cancelled and active at month end. Sample data only; there is no backend, so there are no loading, error,
//         refresh or permission states to show. If a service is added, pass undefined or a promise to the charts and
//         stats while it loads; the application owns persistence, permissions and navigation.
//   States: populated only. November 2026 has just begun and is left out rather than shown as a partial month.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  BarChart,
  Card,
  CardContent,
  ChartContainer,
  LineChart,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Stat,
  StatGroup,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { MONTHS, OPENING, count, pct, usd } from './data';

const last = MONTHS[MONTHS.length - 1];
const prev = MONTHS[MONTHS.length - 2];
const prevPrev = MONTHS[MONTHS.length - 3];

const mrrGrowth = last.mrr / OPENING.mrr - 1;
const totalStarted = MONTHS.reduce((n, m) => n + m.started, 0);
const totalCancelled = MONTHS.reduce((n, m) => n + m.cancelled, 0);
const churn = last.cancelled / prev.active;
const prevChurn = prev.cancelled / prevPrev.active;
const net = last.started - last.cancelled;
const prevNet = prev.started - prev.cancelled;
const signed = (v: number) => `${v > 0 ? '+' : ''}${count.format(v)}`;

const monthName = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortMonth = (v: unknown) =>
  new Date(`${String(v)}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const compactUsd = (v: number) => `$${Math.round(v / 1000)}k`;

function App() {
  return (
    <main className="dash">
      <PageHeader>
        <PageHeaderTitle>Subscriptions overview</PageHeaderTitle>
        <PageHeaderDescription>
          November 2025 to October 2026, closed months only. Sample figures for Drafthall; there is no live data.
        </PageHeaderDescription>
      </PageHeader>

      <Card className="dash-lead">
        <CardContent>
          <Stat
            label="Monthly recurring revenue, end of October"
            size="hero"
            value={last.mrr}
            format={usd.format}
            good="up"
            change={{ value: last.mrr / prev.mrr - 1, vs: 'September', previous: prev.mrr }}
            help="Active paid subscriptions at month end, before refunds and tax."
            locale="en-US"
          />
          <ChartContainer
            className="dash-chart"
            title="Monthly recurring revenue"
            takeaway={`Up ${Math.round(mrrGrowth * 100)}% in twelve months, from ${usd.format(OPENING.mrr)} to ${usd.format(last.mrr)}`}
            summary={`MRR rose every month, from ${usd.format(OPENING.mrr)} at the end of October 2025 to ${usd.format(last.mrr)} at the end of October 2026. The steepest month was May 2026, when list prices rose, adding ${usd.format(MONTHS[6].mrr - MONTHS[5].mrr)}.`}
            config={{ mrr: { label: 'MRR', format: usd.format } }}
            yFormat={compactUsd}
            xFormat={shortMonth}
            xLabel="Month"
            aspect={2.8}
            views
            locale="en-US"
          >
            <LineChart data={MONTHS} x="month" />
          </ChartContainer>
        </CardContent>
      </Card>

      <section className="dash-section" aria-labelledby="october-heading">
        <h2 id="october-heading" className="dash-subhead">October in subscriptions</h2>
        <StatGroup aria-label="October in subscriptions">
          <Card><CardContent>
            <Stat label="New subscriptions" value={last.started} good="up" locale="en-US"
              change={{ value: last.started / prev.started - 1, vs: 'September', previous: prev.started }} />
          </CardContent></Card>
          <Card><CardContent>
            <Stat label="Cancelled subscriptions" value={last.cancelled} good="down" locale="en-US"
              change={{ value: last.cancelled / prev.cancelled - 1, vs: 'September', previous: prev.cancelled }} />
          </CardContent></Card>
          <Card><CardContent>
            <Stat label="Net new subscriptions" value={net} format={signed} good="up" locale="en-US"
              change={{ value: net - prevNet, vs: 'September', format: (m) => count.format(m) }}
              help={`${count.format(last.active)} active at month end.`} />
          </CardContent></Card>
          <Card><CardContent>
            <Stat label="Monthly cancellation rate" value={pct(churn)} good="down" locale="en-US"
              change={{ value: (churn - prevChurn) * 100, vs: 'September', format: (m) => `${m.toFixed(1)} pts` }}
              help="Cancelled in the month ÷ active at its start." />
          </CardContent></Card>
        </StatGroup>
      </section>

      <Card className="dash-section">
        <CardContent>
          <ChartContainer
            title="New and cancelled subscriptions by month"
            takeaway={`New subscriptions outnumbered cancellations every month, and by ${(last.started / last.cancelled).toFixed(1)} to 1 in October`}
            summary={`${count.format(totalStarted)} subscriptions started and ${count.format(totalCancelled)} were cancelled over the twelve months. Cancellations peaked at ${MONTHS[2].cancelled} in January 2026, when annual budgets reset, and fell to ${last.cancelled} in October; new subscriptions rose from ${MONTHS[0].started} in November 2025 to ${last.started} in October 2026.`}
            config={{
              started: { label: 'New', format: count.format },
              cancelled: { label: 'Cancelled', format: count.format },
            }}
            xFormat={shortMonth}
            xLabel="Month"
            aspect={2.8}
            patterns
            views
            locale="en-US"
          >
            <BarChart data={MONTHS} x="month" labels="last" />
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
