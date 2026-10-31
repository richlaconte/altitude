// Report frame (altitude-design guidance, patterns/screen-layout.md). Design record: README.md.
//   Task: the head of library services reads how use of the service changed over the last twelve months.
//   Lead: one chart of the chosen measure, month by month against the year before, its takeaway as the heading.
//   Primary action: none (reading is the task). Next: a branch's own report (not built; no routes yet).
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as A from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';
import { MEASURES, BRANCHES, RIVERSIDE_CLOSED, type Measure, serviceMonths, totals, branchRows } from './data';

const LOCALE = 'en-GB';
const num = new Intl.NumberFormat(LOCALE);
const pct = (v: number) => `${(Math.abs(v) * 100).toFixed(1)}%`;
const signed = (v: number) => `${v >= 0 ? 'up' : 'down'} ${pct(v)}`;
const monthName = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthShort = (v: unknown) => new Date(v as string | number).toLocaleDateString(LOCALE, { month: 'short', year: 'numeric', timeZone: 'UTC' });
const capital =(s: string) => s[0].toUpperCase() + s.slice(1);

/** The heading the lead chart carries, written from the figures it shows. */
function takeaway(k: Measure) {
  const t = totals(k), rows = branchRows(k);
  const top = rows.reduce((a, b) => (b.change > a.change ? b : a));
  const falling = rows.filter((r) => r.change < 0).map((r) => r.name);
  const lead = `${MEASURES[k].label} ${t.change >= 0 ? 'rose' : 'fell'} ${pct(t.change)} on the year before`;
  const why = `, led by ${top.name} (${signed(top.change)})`;
  const but = falling.length ? `; ${new Intl.ListFormat(LOCALE).format(falling)} fell` : '';
  return lead + why + but;
}

function summary(k: Measure) {
  const months = serviceMonths(k), t = totals(k);
  const peak = months.reduce((a, b) => ((b[k] as number) > (a[k] as number) ? b : a));
  const low = months.reduce((a, b) => ((b[k] as number) < (a[k] as number) ? b : a));
  return `${num.format(t.now)} ${MEASURES[k].noun} from October 2025 to September 2026, against ${num.format(t.before)} the year before. ` +
    `Busiest in ${monthName(peak.month)} (${num.format(peak[k] as number)}), during the Summer Reading Challenge; quietest in ${monthName(low.month)} (${num.format(low[k] as number)}). ` +
    `Riverside was closed for refurbishment through March 2026.`;
}

function Change({ value }: { value: number }) {
  return <span className="ld-change">{value >= 0 ? '↑' : '↓'} {capital(signed(value))}</span>;
}

function BranchTable({ measure }: { measure: Measure }) {
  const rows = branchRows(measure);
  const m = MEASURES[measure];
  return (
    <A.Table className="ld-table">
      <A.TableCaption>{m.label} by service point, October 2025 to September 2026, against the twelve months before</A.TableCaption>
      <A.TableHeader>
        <A.TableRow>
          <A.TableHead>Service point</A.TableHead>
          <A.TableHead align="end">{m.label}</A.TableHead>
          <A.TableHead align="end">Against the year before</A.TableHead>
          <A.TableHead align="end">Share of service</A.TableHead>
          <A.TableHead>Monthly trend</A.TableHead>
        </A.TableRow>
      </A.TableHeader>
      <A.TableBody>
        {rows.map((r) => (
          <A.TableRow key={r.id} rowId={r.id}>
            <A.TableCell>
              <span className="ld-branch">{r.name}</span>
              {r.id === 'riverside' && <span className="ld-note">Closed March 2026, reopened April</span>}
            </A.TableCell>
            <A.TableCell align="end" className="ld-num">{num.format(r.now)}</A.TableCell>
            <A.TableCell align="end"><Change value={r.change} /></A.TableCell>
            <A.TableCell align="end" className="ld-num">{pct(r.share)}</A.TableCell>
            <A.TableCell>
              <A.Sparkline data={r.months} width="7em" locale={LOCALE}
                summary={`${r.name}, ${m.noun} by month: from ${num.format(r.months[0])} in October 2025 to ${num.format(r.months[11])} in September 2026, highest ${num.format(Math.max(...r.months))}.`} />
            </A.TableCell>
          </A.TableRow>
        ))}
      </A.TableBody>
    </A.Table>
  );
}

function App() {
  const [measure, setMeasure] = React.useState<Measure>('loans');
  const m = MEASURES[measure];
  const data = React.useMemo(() => serviceMonths(measure), [measure]);
  return (
    <main className="ld-page">
      <A.PageHeader>
        <A.PageHeaderTitle>Library use, last twelve months</A.PageHeaderTitle>
        <A.PageHeaderDescription>
          Halden City Libraries, all {BRANCHES.length} service points. October 2025 to September 2026; October’s figures follow month-end close.
        </A.PageHeaderDescription>
      </A.PageHeader>

      <section className="ld-lead" aria-label="Trend">
        <div className="ld-measure">
          <span id="ld-measure-label" className="ld-measure-label">Show</span>
          <A.ToggleGroup type="single" value={measure} onValueChange={(v) => v && setMeasure(v as Measure)} aria-labelledby="ld-measure-label">
            {(Object.keys(MEASURES) as Measure[]).map((k) => <A.ToggleGroupItem key={k} value={k}>{MEASURES[k].short}</A.ToggleGroupItem>)}
          </A.ToggleGroup>
        </div>
        <A.ChartContainer key={measure} title={`${m.label} per month, all service points`} takeaway={takeaway(measure)}
          config={{ [measure]: { label: m.label } }} aspect={2.6} locale={LOCALE} views xLabel="Month" xFormat={monthShort}
          summary={summary(measure)}>
          <A.LineChart data={data} x="month" compare={{ key: 'lastYear', label: 'Year before' }}>
            <A.ChartAnnotation x={RIVERSIDE_CLOSED} label="Riverside closed" />
          </A.LineChart>
        </A.ChartContainer>
      </section>

      <section className="ld-more" aria-labelledby="ld-totals-h">
        <h2 id="ld-totals-h" className="ld-sub">Twelve-month totals</h2>
        <A.StatGroup aria-label="Twelve-month totals">
          {(Object.keys(MEASURES) as Measure[]).map((k) => {
            const t = totals(k);
            return <A.Stat key={k} label={MEASURES[k].label} value={t.now} locale={LOCALE} good="up"
              change={{ value: t.change, vs: 'previous 12 months', previous: t.before }} />;
          })}
        </A.StatGroup>
      </section>

      <section className="ld-more" aria-labelledby="ld-branches-h">
        <h2 id="ld-branches-h" className="ld-sub">By service point: {m.noun}</h2>
        <BranchTable measure={measure} />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<A.AltitudeProvider><App /></A.AltitudeProvider>);
