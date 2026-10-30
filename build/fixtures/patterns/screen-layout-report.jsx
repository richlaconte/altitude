// Screen layout pattern (project/framework/patterns/screen-layout.md), the report frame.
//   Task: the growth team reads how October's signups went after the pricing change.
//   Lead: a chart whose takeaway is the heading. Primary action: none (reading is the task). Next: the cohort report.
// The takeaway is written from the data shown; the secondary numbers follow, smaller and grouped, never a row of equal
// cards above the chart. The lines between the preview markers are its "ScreenLayoutReport" preview
// (scripts/pattern-previews.mjs copies them); build/checks/pattern-types.mjs type-checks this file against the public
// declarations and fails if the two differ.
// preview-name: ScreenLayoutReport
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
// Daily signups for October 2026: about 40 a day, then about 80 a day from the pricing change on the 14th.
const SIGNUPS = Array.from({ length: 31 }, (_, i) => ({ day: `2026-10-${String(i + 1).padStart(2, '0')}`, signups: (i < 13 ? 41 : 82) + Math.round(4 * Math.sin(i * 2.3)) - (new Date(Date.UTC(2026, 9, i + 1)).getUTCDay() % 6 === 0 ? 6 : 0) }));
const total = SIGNUPS.reduce((n, d) => n + d.signups, 0);
const before = SIGNUPS.slice(0, 13), after = SIGNUPS.slice(13);
const mean = (rows) => Math.round(rows.reduce((n, d) => n + d.signups, 0) / rows.length);
function App() {
  return (
    <main className="lr-page">
      <A.PageHeader breadcrumb={<A.Breadcrumb items={[{ label: 'Reports', href: '#/reports' }, { label: 'Signups' }]} />}
        actions={<A.Button variant="secondary">Export CSV</A.Button>}>
        <A.PageHeaderTitle>Signups, October 2026</A.PageHeaderTitle>
      </A.PageHeader>
      <A.ChartContainer className="lr-lead" title="Daily signups" takeaway={`Signups doubled after the pricing change on 14 October, from ${mean(before)} a day to ${mean(after)}`}
        config={{ signups: { label: 'Signups' } }} aspect={2.6} zero
        summary={`${total.toLocaleString('en-IE')} signups in October. From 1 to 13 October about ${mean(before)} a day; from 14 October, when the free plan gained a third project, about ${mean(after)} a day.`}>
        <A.LineChart data={SIGNUPS} x="day" />
      </A.ChartContainer>
      <section className="lr-more" aria-labelledby="lr-more-h">
        <h2 id="lr-more-h" className="lr-sub">Around it</h2>
        <A.StatGroup aria-label="October in numbers">
          <A.Stat label="Signups in October" value={total} change={{ value: 0.41, vs: 'September' }} good="up" locale="en-IE" />
          <A.Stat label="Became paying within 7 days" value="6.1%" help="5.8% in September" />
          <A.Stat label="Cancelled in their first week" value={38} change={{ value: -0.12, vs: 'September' }} good="down" locale="en-IE" />
        </A.StatGroup>
        <p className="lr-note">Paid conversion held while signups doubled, so the new free-plan signups aren’t lower-intent so far. <A.Link href="#/reports/cohorts">See the October cohort</A.Link></p>
      </section>
    </main>
  );
}
// preview:end
export default App;
