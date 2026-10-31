// Overview dashboard, the screen-layout "report" frame (design record in README.md).
//   Task: the leadership team reads how recurring revenue and subscriptions moved over the last twelve months.
//   Lead: the MRR chart, its takeaway as the heading. Primary action: none (reading is the task). Next: the movement chart.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import * as A from 'altitude-design';
import 'altitude-design/altitude.css';
import './dashboard.css';
import {MONTHS, LOCALE, churn, formatMonth, formatMonthLong, formatPct, formatUsd, formatUsdCompact, toCsv} from './data';

const first = MONTHS[0];
const last = MONTHS[MONTHS.length - 1];
const prev = MONTHS[MONTHS.length - 2];
const lastI = MONTHS.length - 1;

const mrrGrowth = last.mrr / first.mrr - 1;
const totalNew = MONTHS.reduce((n, m) => n + m.newSubs, 0);
const totalCancelled = MONTHS.reduce((n, m) => n + m.cancelled, 0);
const growingEveryMonth = MONTHS.every((m) => m.newSubs > m.cancelled);
const weakest = MONTHS.reduce((w, m) => (m.newSubs - m.cancelled < w.newSubs - w.cancelled ? m : w));
const period = `${formatMonthLong(first.month)} to ${formatMonthLong(last.month)}`;

const mrrConfig: A.ChartConfig = {mrr: {label: 'MRR', format: formatUsd}};
const movementConfig: A.ChartConfig = {
  newSubs: {label: 'New subscriptions'},
  cancelled: {label: 'Cancelled subscriptions'},
};

function downloadCsv() {
  const url = URL.createObjectURL(new Blob([toCsv(MONTHS)], {type: 'text/csv'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = `subscriptions-${first.month.slice(0, 7)}-to-${last.month.slice(0, 7)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function App() {
  return (
    <main className="ov-page">
      <A.PageHeader actions={<A.Button variant="secondary" onClick={downloadCsv}>Export CSV</A.Button>}>
        <A.PageHeaderTitle>Revenue and subscriptions</A.PageHeaderTitle>
        <A.PageHeaderDescription>The last twelve complete months, {period}.</A.PageHeaderDescription>
      </A.PageHeader>

      <A.ChartContainer
        className="ov-lead"
        title="Monthly recurring revenue"
        takeaway={`MRR grew ${formatPct(mrrGrowth)} in twelve months, to ${formatUsdCompact(last.mrr)} in ${formatMonthLong(last.month)}`}
        config={mrrConfig}
        data={MONTHS}
        x="month"
        xFormat={formatMonth}
        yFormat={formatUsdCompact}
        xLabel="Month"
        locale={LOCALE}
        aspect={2.6}
        views
        summary={`MRR rose every month, from ${formatUsd(first.mrr)} in ${formatMonthLong(first.month)} to ${formatUsd(last.mrr)} in ${formatMonthLong(last.month)}. The largest rises came with the February price change and in September; December was the flattest month.`}>
        <A.LineChart data={MONTHS} x="month">
          <A.ChartAnnotation x="2026-02-01" label="Price change" />
        </A.LineChart>
      </A.ChartContainer>

      <section className="ov-more" aria-labelledby="ov-more-h">
        <h2 id="ov-more-h" className="ov-sub">{formatMonthLong(last.month)} against {formatMonthLong(prev.month)}</h2>
        <A.StatGroup aria-label={`${formatMonthLong(last.month)} in numbers`}>
          <A.Stat label="MRR" value={last.mrr} format={formatUsd} locale={LOCALE}
            change={{value: last.mrr / prev.mrr - 1, vs: formatMonthLong(prev.month), previous: prev.mrr}} good="up" />
          <A.Stat label="New subscriptions" value={last.newSubs} locale={LOCALE}
            change={{value: last.newSubs / prev.newSubs - 1, vs: formatMonthLong(prev.month), previous: prev.newSubs}} good="up" />
          <A.Stat label="Cancelled subscriptions" value={last.cancelled} locale={LOCALE}
            change={{value: last.cancelled / prev.cancelled - 1, vs: formatMonthLong(prev.month), previous: prev.cancelled}} good="down" />
          <A.Stat label="Monthly churn" value={formatPct(churn(lastI))} locale={LOCALE}
            help={`${formatPct(churn(lastI - 1))} in ${formatMonthLong(prev.month)}. Cancellations as a share of subscriptions active at the start of the month.`} />
          <A.Stat label="Active subscriptions" value={last.active} locale={LOCALE}
            help={`${(last.active - prev.active).toLocaleString(LOCALE)} more than at the end of ${formatMonthLong(prev.month)}.`} />
        </A.StatGroup>
      </section>

      <A.ChartContainer
        className="ov-movement"
        title="New and cancelled subscriptions"
        takeaway={`New subscriptions outnumbered cancellations every month, and churn fell from ${formatPct(churn(0))} to ${formatPct(churn(lastI))}`}
        config={movementConfig}
        data={MONTHS}
        x="month"
        xScale="band"
        xFormat={formatMonth}
        xLabel="Month"
        locale={LOCALE}
        aspect={2.6}
        views
        summary={`${totalNew.toLocaleString(LOCALE)} new subscriptions and ${totalCancelled.toLocaleString(LOCALE)} cancellations over twelve months. ${growingEveryMonth ? 'Every month added more subscriptions than it lost' : 'Some months lost more subscriptions than they added'}; the weakest was ${formatMonthLong(weakest.month)}, with ${weakest.newSubs} new against ${weakest.cancelled} cancelled.`}>
        <A.BarChart data={MONTHS} x="month">
          <A.ChartLegend content={<A.ChartLegendContent />} />
        </A.BarChart>
      </A.ChartContainer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<A.AltitudeProvider><App/></A.AltitudeProvider>);
