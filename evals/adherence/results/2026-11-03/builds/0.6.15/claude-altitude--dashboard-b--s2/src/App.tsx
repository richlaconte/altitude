// Design record: see DESIGN.md. Report frame: the lead is the twelve-month chart, its takeaway the heading.
import * as React from 'react';
import {
  BarChart, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartAnnotation,
  ChartContainer, Field, LineChart, PageHeader, PageHeaderDescription, PageHeaderTitle, Select, Sparkline, Stat,
  StatGroup, Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow, Tabs,
  TabsContent, TabsList, TabsTrigger,
} from 'altitude-design';
import { ALL, BRANCHES, FIGURES, MEASURES, MONTHS, type MeasureKey, longMonth, monthly, shortMonth, total } from './data';

const LOCALE = 'en-GB';
const num = new Intl.NumberFormat(LOCALE);
const pct = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 });
const pct0 = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 });
const PERIOD = 'November 2025 to October 2026';
const PREVIOUS = 'Nov 2024 to Oct 2025';

const measureOf = (k: MeasureKey) => MEASURES.find((m) => m.key === k)!;
const branchName = (id: string) => (id === ALL ? 'All branches' : BRANCHES.find((b) => b.id === id)!.name);
const xLabel = (v: unknown) => shortMonth(typeof v === 'number' ? new Date(v).toISOString().slice(0, 10) : String(v));

function Arrow({ dir }: { dir: 'up' | 'down' | 'flat' }) {
  const d = dir === 'up' ? 'M7 17 17 7M9 7h8v8' : dir === 'down' ? 'M7 7l10 10M17 9v8H9' : 'M5 12h14';
  return (
    <svg className="lib-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  );
}

/** A change against the year before, in words and with an arrow; neutral ink, so colour carries nothing alone. */
function Change({ now, before }: { now: number; before: number }) {
  const p = before === 0 ? 0 : now / before - 1;
  const dir = Math.abs(p) < 0.005 ? 'flat' : p > 0 ? 'up' : 'down';
  return (
    <span className="lib-change">
      <Arrow dir={dir} />
      {dir === 'flat' ? 'No change' : `${dir === 'up' ? 'Up' : 'Down'} ${pct.format(Math.abs(p))}`}
    </span>
  );
}

function trendTakeaway(label: string, current: number[], previous: number[], closed: boolean) {
  const p = total(current) / total(previous) - 1;
  const peak = MONTHS[current.indexOf(Math.max(...current))];
  const move = Math.abs(p) < 0.005 ? 'held level with' : `${p > 0 ? 'rose' : 'fell'} ${pct0.format(Math.abs(p))} on`;
  const why = closed ? ', with the branch closed from November to February' : '';
  return `${label} ${move} the year before${why}, and were highest in ${longMonth(peak).split(' ')[0]}`;
}

function TrendChart({ branch, measure }: { branch: string; measure: MeasureKey }) {
  const m = measureOf(measure);
  const { current, previous } = monthly(branch, measure);
  const rows = React.useMemo(() => MONTHS.map((month, i) => ({ month, value: current[i], prev: previous[i] })), [branch, measure]);
  const b = BRANCHES.find((x) => x.id === branch);
  const showsKestrel = branch === ALL || branch === 'kestrel';
  const low = current.indexOf(Math.min(...current));
  const high = current.indexOf(Math.max(...current));
  return (
    <ChartContainer
      title={`${m.label} per month, ${branchName(branch)}`}
      takeaway={trendTakeaway(m.label, current, previous, Boolean(b?.closed))}
      summary={`${num.format(total(current))} ${m.noun} from ${PERIOD}, against ${num.format(total(previous))} in the twelve months before. Lowest in ${longMonth(MONTHS[low])} (${num.format(current[low])}), highest in ${longMonth(MONTHS[high])} (${num.format(current[high])}).`}
      config={{ value: { label: m.label, format: num.format } }}
      aspect={2.6} locale={LOCALE} xFormat={xLabel} xLabel="Month" views>
      <LineChart data={rows} x="month" compare={{ key: 'prev', label: PREVIOUS }}>
        {showsKestrel && <ChartAnnotation x="2026-03-01" label="Kestrel Park reopens" />}
      </LineChart>
    </ChartContainer>
  );
}

function BranchChart({ branch, measure }: { branch: string; measure: MeasureKey }) {
  const m = measureOf(measure);
  const rows = React.useMemo(() => BRANCHES.map((b) => ({
    branch: b.name, value: total(FIGURES[b.id][measure].current), prev: total(FIGURES[b.id][measure].previous),
  })), [measure]);
  const all = total(rows.map((r) => r.value));
  const top = rows.reduce((a, r) => (r.value > a.value ? r : a));
  const riser = rows.reduce((a, r) => (r.value / r.prev > a.value / a.prev ? r : a));
  const selected = branch === ALL ? null : branchName(branch);
  return (
    <ChartContainer
      title={`${m.label} by branch, ${PERIOD}`}
      takeaway={`${top.branch} accounted for ${pct0.format(top.value / all)} of ${m.noun}; ${riser.branch} grew most, up ${pct.format(riser.value / riser.prev - 1)}`}
      summary={`${rows.length} branches, ${num.format(all)} ${m.noun} in all. Each bar carries a tick at the branch's figure for ${PREVIOUS}.${selected ? ` Highlighted: ${selected}.` : ''}`}
      config={{ value: { label: m.label, format: num.format } }}
      height={rows.length * 44} locale={LOCALE} xLabel="Branch" views>
      <BarChart data={rows} x="branch" layout="horizontal" sort="desc" compare={{ key: 'prev', label: PREVIOUS }}
        focus={selected ? (d) => d.branch === selected : undefined} />
    </ChartContainer>
  );
}

function BranchTable() {
  const sums = (k: MeasureKey, key: 'current' | 'previous') => total(BRANCHES.map((b) => total(FIGURES[b.id][k][key])));
  return (
    <Table>
      <TableCaption>Every branch, {PERIOD}, with the change on {PREVIOUS}.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Branch</TableHead>
          {MEASURES.map((m) => (
            <React.Fragment key={m.key}>
              <TableHead align="end">{m.label}</TableHead>
              <TableHead align="end">Change</TableHead>
            </React.Fragment>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {BRANCHES.map((b) => (
          <TableRow key={b.id} rowId={b.id}>
            <TableCell>
              <span className="lib-branch">{b.name}</span>
              {b.note && <span className="lib-note">{b.note}</span>}
            </TableCell>
            {MEASURES.map((m) => (
              <React.Fragment key={m.key}>
                <TableCell align="end" className="lib-num">{num.format(total(FIGURES[b.id][m.key].current))}</TableCell>
                <TableCell align="end"><Change now={total(FIGURES[b.id][m.key].current)} before={total(FIGURES[b.id][m.key].previous)} /></TableCell>
              </React.Fragment>
            ))}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>All branches</TableCell>
          {MEASURES.map((m) => (
            <React.Fragment key={m.key}>
              <TableCell align="end" className="lib-num">{num.format(sums(m.key, 'current'))}</TableCell>
              <TableCell align="end"><Change now={sums(m.key, 'current')} before={sums(m.key, 'previous')} /></TableCell>
            </React.Fragment>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function downloadCsv() {
  const head = ['Branch', 'Month', ...MEASURES.flatMap((m) => [m.label, `${m.label}, same month a year earlier`])];
  const lines = BRANCHES.flatMap((b) => MONTHS.map((month, i) => [
    `"${b.name}"`, month, ...MEASURES.flatMap((m) => [FIGURES[b.id][m.key].current[i], FIGURES[b.id][m.key].previous[i]]),
  ].join(',')));
  const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'calder-libraries-2025-11-to-2026-10.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

const BRANCH_ITEMS = [{ value: ALL, label: 'All branches' }, ...BRANCHES.map((b) => ({ value: b.id, label: b.name }))];

export function App() {
  const [branch, setBranch] = React.useState(ALL);
  const [measure, setMeasure] = React.useState<MeasureKey>('loans');

  return (
    <main className="lib-page">
      <PageHeader actions={<Button variant="secondary" onClick={downloadCsv}>Download figures as CSV</Button>}>
        <PageHeaderTitle>Library service overview</PageHeaderTitle>
        <PageHeaderDescription>
          Loans, new members and visits across Calder City Libraries’ six branches, {PERIOD}, against the twelve months before.
          Sample figures for illustration, not drawn from the library’s systems.
        </PageHeaderDescription>
      </PageHeader>

      <div className="lib-filters">
        <Field label="Branch">
          <Select items={BRANCH_ITEMS} value={branch} onValueChange={setBranch} />
        </Field>
        <p className="lib-slice" aria-live="polite">Showing {branchName(branch)} · {PERIOD}</p>
      </div>

      <Card className="lib-lead">
        <CardContent>
          <Tabs variant="segmented" value={measure} onValueChange={(v) => setMeasure(v as MeasureKey)}>
            <TabsList aria-label="Measure">
              {MEASURES.map((m) => <TabsTrigger key={m.key} value={m.key}>{m.label}</TabsTrigger>)}
            </TabsList>
            {MEASURES.map((m) => (
              <TabsContent key={m.key} value={m.key} className="lib-tab">
                <TrendChart branch={branch} measure={m.key} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <section className="lib-section" aria-labelledby="lib-numbers">
        <h2 id="lib-numbers" className="lib-h2">Twelve months in numbers · {branchName(branch)}</h2>
        <StatGroup aria-label={`Twelve months to October 2026, ${branchName(branch)}`}>
          {MEASURES.map((m) => {
            const { current, previous } = monthly(branch, m.key);
            const now = total(current), before = total(previous);
            return (
              <Card key={m.key}>
                <CardContent>
                  <Stat label={m.label} value={now} locale={LOCALE} good="up"
                    change={{ value: now / before - 1, vs: 'previous 12 months', previous: before }}
                    trend={<Sparkline data={current} decorative width={80} />} help={m.help} />
                </CardContent>
              </Card>
            );
          })}
        </StatGroup>
      </section>

      <section className="lib-section" aria-labelledby="lib-branches">
        <h2 id="lib-branches" className="lib-h2">By branch</h2>
        <div className="lib-grid">
          <Card>
            <CardContent>
              <BranchChart branch={branch} measure={measure} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>All three measures</CardTitle>
              <CardDescription>The record behind the charts. Changes are against {PREVIOUS}.</CardDescription>
            </CardHeader>
            <CardContent>
              <BranchTable />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
