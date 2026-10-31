// Report frame (altitude-design screen-layout pattern). The design record is in README.md.
//   Task: the founders and finance lead read how the subscription business moved over the last twelve months.
//   Lead: the MRR chart, its takeaway as the heading. Primary action: none (reading is the task).
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {AltitudeProvider, BarChart, ChartContainer, LineChart, PageHeader, PageHeaderDescription, PageHeaderTitle, Stat, StatGroup} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {MONTHS, MRR_AT_START} from './data';

const LOCALE = 'en-US';
const usd = new Intl.NumberFormat(LOCALE, {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
const usdShort = new Intl.NumberFormat(LOCALE, {style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1});
const count = new Intl.NumberFormat(LOCALE);
const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const monthName = (iso: string, style: 'long' | 'short' = 'long') => new Date(`${iso}T00:00:00Z`).toLocaleDateString(LOCALE, {month: style, year: style === 'long' ? 'numeric' : '2-digit', timeZone: 'UTC'});

const first = MONTHS[0], last = MONTHS[MONTHS.length - 1], prev = MONTHS[MONTHS.length - 2];
const mrrGrowth = last.mrr / MRR_AT_START - 1;
const totalNew = MONTHS.reduce((n, m) => n + m.newSubs, 0);
const totalCancelled = MONTHS.reduce((n, m) => n + m.cancelled, 0);
const outpacedEveryMonth = MONTHS.every((m) => m.newSubs > m.cancelled);
const mostCancelled = MONTHS.reduce((a, m) => (m.cancelled > a.cancelled ? m : a));
const mostNew = MONTHS.reduce((a, m) => (m.newSubs > a.newSubs ? m : a));
const ratio = (totalNew / totalCancelled).toFixed(1);

function App() {
  return (
    <main className="ov-page">
      <PageHeader>
        <PageHeaderTitle>Subscriptions, last 12 months</PageHeaderTitle>
        <PageHeaderDescription>{monthName(first.month)} to {monthName(last.month)}. October 2026 is still being counted and isn’t shown.</PageHeaderDescription>
      </PageHeader>

      <ChartContainer
        className="ov-lead"
        title="Monthly recurring revenue"
        takeaway={`MRR grew ${pct(mrrGrowth, 0)} in twelve months, to ${usd.format(last.mrr)}`}
        config={{mrr: {label: 'MRR', format: (v) => usdShort.format(v)}}}
        aspect={2.6}
        locale={LOCALE}
        views
        xLabel="Month"
        xFormat={(v) => monthName(String(v), 'short')}
        summary={`MRR rose from ${usd.format(MRR_AT_START)} at the end of September 2025 to ${usd.format(last.mrr)} at the end of September 2026. Active subscriptions grew from ${count.format(first.active - first.newSubs + first.cancelled)} to ${count.format(last.active)}, and the Team plan price rise in April lifted average revenue per subscription from $${first.arpa.toFixed(2)} to $${last.arpa.toFixed(2)}.`}
      >
        <LineChart data={MONTHS} x="month" />
      </ChartContainer>

      <section className="ov-more" aria-labelledby="ov-more-h">
        <h2 id="ov-more-h" className="ov-sub">{monthName(last.month)}</h2>
        <StatGroup aria-label={`${monthName(last.month)} in numbers`}>
          <Stat label="New subscriptions" value={last.newSubs} change={{value: last.newSubs / prev.newSubs - 1, vs: 'August', previous: prev.newSubs}} good="up" locale={LOCALE} />
          <Stat label="Cancelled subscriptions" value={last.cancelled} change={{value: last.cancelled / prev.cancelled - 1, vs: 'August', previous: prev.cancelled}} good="down" locale={LOCALE} />
          <Stat label="Monthly churn" value={pct(last.churn)} help={`${pct(prev.churn)} in August; cancellations ÷ active at the start of the month`} />
          <Stat label="Active subscriptions" value={last.active} change={{value: last.active / prev.active - 1, vs: 'August'}} good="up" locale={LOCALE} />
        </StatGroup>
      </section>

      <section className="ov-flow" aria-labelledby="ov-flow-h">
        <h2 id="ov-flow-h" className="ov-sub">New and cancelled subscriptions</h2>
        <ChartContainer
          aria-labelledby="ov-flow-h"
          takeaway={outpacedEveryMonth
            ? `New subscriptions outpaced cancellations every month, ${ratio} to 1 over the year`
            : `${ratio} new subscriptions for every cancellation over the year`}
          config={{newSubs: {label: 'New'}, cancelled: {label: 'Cancelled'}}}
          aspect={2.8}
          locale={LOCALE}
          views
          xLabel="Month"
          xScale="band"
          xFormat={(v) => monthName(String(v), 'short')}
          summary={`${count.format(totalNew)} new subscriptions and ${count.format(totalCancelled)} cancellations in twelve months. New subscriptions peaked in ${monthName(mostNew.month)} at ${count.format(mostNew.newSubs)}; cancellations peaked in ${monthName(mostCancelled.month)} at ${count.format(mostCancelled.cancelled)}.`}
        >
          <BarChart data={MONTHS} x="month" />
        </ChartContainer>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<AltitudeProvider><App /></AltitudeProvider>);
