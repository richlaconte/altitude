import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Button,
  Card,
  CardContent,
  ChartAnnotation,
  ChartContainer,
  BarChart,
  DataTable,
  Field,
  LineChart,
  PageHeader,
  PageHeaderTitle,
  Select,
  Sparkline,
  Stat,
  StatGroup,
  Toaster,
  type DataTableColumn,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {
  BRANCHES,
  PERIOD_LABEL,
  UPDATED,
  branchTotals,
  monthsFor,
  type BranchTotals,
  type MonthWithPrev,
  type Scope,
} from './data';

const LOCALE = 'en-GB';
const num = new Intl.NumberFormat(LOCALE);
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const monthShort = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthLong = new Intl.DateTimeFormat(LOCALE, { month: 'long', timeZone: 'UTC' });
const dayLong = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const toDate = (v: unknown) => new Date(typeof v === 'number' ? v : String(v).slice(0, 10) + 'T00:00:00Z');
const fmtMonth = (v: unknown) => monthShort.format(toDate(v));
const nameMonth = (iso: string) => monthLong.format(toDate(iso));

const sum = (rows: MonthWithPrev[], key: keyof MonthWithPrev) => rows.reduce((n, r) => n + (r[key] as number), 0);
const change = (now: number, prev: number) => (prev === 0 ? 0 : (now - prev) / prev);
const pctWords = (c: number) => `${Math.abs(Math.round(c * 100))}%`;
const upDown = (c: number) => (Math.round(c * 100) === 0 ? 'level with' : c > 0 ? `up ${pctWords(c)} on` : `down ${pctWords(c)} on`);
const peak = (rows: MonthWithPrev[], key: 'loans' | 'members' | 'visits') =>
  rows.reduce((best, r) => (r[key] > best[key] ? r : best), rows[0]);

const SCOPE_ITEMS = [
  { value: 'all', label: 'All branches' },
  ...BRANCHES.map((b) => ({ value: b.id, label: b.name })),
];
const scopeName = (s: Scope) => (s === 'all' ? 'All branches' : BRANCHES.find((b) => b.id === s)!.name);

// Takeaways are written from the figures shown, with the two events the service knows about named where they matter.
function loansTakeaway(scope: Scope, rows: MonthWithPrev[]): string {
  const c = change(sum(rows, 'loans'), sum(rows, 'loansPrev'));
  const p = peak(rows, 'loans');
  if (scope === 'ashby') {
    return `Ashby Green lent nothing in February and March while its roof was repaired, leaving its year ${upDown(c)} the one before`;
  }
  if (scope === 'quayside') {
    return `Quayside's loans have run about a fifth higher since it began opening on Sundays in April`;
  }
  const who = scope === 'all' ? 'Loans across the service' : `${scopeName(scope)}'s loans`;
  return `${who} were ${upDown(c)} the year before, busiest in ${nameMonth(p.month)} with ${num.format(p.loans)}`;
}

function membersTakeaway(rows: MonthWithPrev[]): string {
  const p = peak(rows, 'members');
  const c = change(sum(rows, 'members'), sum(rows, 'membersPrev'));
  return `Most people joined in ${nameMonth(p.month)}, as the school term began; joins were ${upDown(c)} the year before`;
}

function visitsTakeaway(scope: Scope, rows: MonthWithPrev[]): string {
  const c = change(sum(rows, 'visits'), sum(rows, 'visitsPrev'));
  const low = rows.reduce((best, r) => (r.visits < best.visits ? r : best), rows[0]);
  if (scope === 'ashby') return `Visits returned to their usual level as soon as Ashby Green reopened in April`;
  return `Visits were ${upDown(c)} the year before; ${nameMonth(low.month)} was the quietest month`;
}

function ChangeText({ now, prev }: { now: number; prev: number }) {
  const c = change(now, prev);
  const flat = Math.round(c * 1000) === 0;
  const word = flat ? 'No change' : `${c > 0 ? 'Up' : 'Down'} ${(Math.abs(c) * 100).toFixed(1)}%`;
  return (
    <span className="lib-change">
      {!flat && (
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          {c > 0 ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M19 12l-7 7-7-7" />}
        </svg>
      )}
      {word}
    </span>
  );
}

function downloadCsv(scope: Scope, rows: MonthWithPrev[]) {
  const header = ['Month', 'Loans', 'Loans a year before', 'New members', 'New members a year before', 'Visits', 'Visits a year before'];
  const lines = rows.map((r) => [r.month.slice(0, 7), r.loans, r.loansPrev, r.members, r.membersPrev, r.visits, r.visitsPrev].join(','));
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lowmere-libraries-${scope}-2025-11-to-2026-10.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const TOTALS = branchTotals();

function App() {
  const [scope, setScope] = React.useState<Scope>('all');
  const rows = React.useMemo(() => monthsFor(scope), [scope]);

  const loans = sum(rows, 'loans');
  const members = sum(rows, 'members');
  const visits = sum(rows, 'visits');
  const showClosure = scope === 'all' || scope === 'ashby';
  const showSundays = scope === 'all' || scope === 'quayside';
  const slice = `${scopeName(scope)} · ${PERIOD_LABEL}`;

  const columns: DataTableColumn<BranchTotals>[] = [
    {
      key: 'name',
      header: 'Branch',
      sortValue: (r) => r.name,
      cell: (r) => (
        <span className="lib-branch">
          {r.name}
          {r.id === 'ashby' && <span className="lib-note">Closed February and March for repairs</span>}
          {r.id === 'quayside' && <span className="lib-note">Open Sundays from April</span>}
        </span>
      ),
    },
    { key: 'loans', header: 'Loans', align: 'end', sortValue: (r) => r.loans, cell: (r) => num.format(r.loans) },
    { key: 'loansChange', header: 'Loans vs year before', align: 'end', sortValue: (r) => change(r.loans, r.loansPrev), cell: (r) => <ChangeText now={r.loans} prev={r.loansPrev} /> },
    { key: 'members', header: 'New members', align: 'end', sortValue: (r) => r.members, cell: (r) => num.format(r.members) },
    { key: 'membersChange', header: 'Joins vs year before', align: 'end', sortValue: (r) => change(r.members, r.membersPrev), cell: (r) => <ChangeText now={r.members} prev={r.membersPrev} /> },
    { key: 'visits', header: 'Visits', align: 'end', sortValue: (r) => r.visits, cell: (r) => num.format(r.visits) },
    { key: 'visitsChange', header: 'Visits vs year before', align: 'end', sortValue: (r) => change(r.visits, r.visitsPrev), cell: (r) => <ChangeText now={r.visits} prev={r.visitsPrev} /> },
  ];

  return (
    <main className="lib-page">
      <PageHeader
        actions={
          <Button variant="secondary" onClick={() => downloadCsv(scope, rows)}>
            Download figures as CSV
          </Button>
        }
      >
        <PageHeaderTitle>Lowmere City Libraries</PageHeaderTitle>
      </PageHeader>

      <div className="lib-filters">
        <Field label="Branch">
          <Select items={SCOPE_ITEMS} value={scope} onValueChange={(v) => setScope(v as Scope)} />
        </Field>
        <p className="lib-slice" aria-live="polite">
          Showing {slice}. Figures to {dayLong.format(toDate(UPDATED))}.
        </p>
      </div>

      <ChartContainer
        className="lib-lead"
        title="Loans each month, against the year before"
        takeaway={loansTakeaway(scope, rows)}
        config={{ loans: { label: 'Loans', format: (v) => num.format(v) } }}
        aspect={2.8}
        yFormat={(v) => compact.format(v)}
        xFormat={fmtMonth}
        locale={LOCALE}
        views
        xLabel="Month"
        summary={`${num.format(loans)} loans from November 2025 to October 2026, against ${num.format(sum(rows, 'loansPrev'))} in the twelve months before. The busiest month was ${nameMonth(peak(rows, 'loans').month)}.`}
      >
        <LineChart data={rows} x="month" compare={{ key: 'loansPrev', label: 'Year before' }}>
          {showClosure && <ChartAnnotation x="2026-02-01" label="Ashby Green closed" />}
          {showSundays && <ChartAnnotation x="2026-04-01" label="Quayside opens Sundays" />}
        </LineChart>
      </ChartContainer>

      <section className="lib-section" aria-labelledby="lib-year-h">
        <h2 id="lib-year-h" className="lib-h2">The year in numbers</h2>
        <StatGroup aria-label={`Twelve months, ${scopeName(scope)}`}>
          <Stat
            label="Loans"
            value={loans}
            locale={LOCALE}
            good="up"
            change={{ value: change(loans, sum(rows, 'loansPrev')), vs: 'the year before', previous: sum(rows, 'loansPrev') }}
            trend={<Sparkline data={rows.map((r) => r.loans)} width={96} aria-label="Loans by month" />}
          />
          <Stat
            label="New members"
            value={members}
            locale={LOCALE}
            good="up"
            change={{ value: change(members, sum(rows, 'membersPrev')), vs: 'the year before', previous: sum(rows, 'membersPrev') }}
            trend={<Sparkline data={rows.map((r) => r.members)} kind="bar" width={96} aria-label="New members by month" />}
          />
          <Stat
            label="Visits"
            value={visits}
            locale={LOCALE}
            good="up"
            change={{ value: change(visits, sum(rows, 'visitsPrev')), vs: 'the year before', previous: sum(rows, 'visitsPrev') }}
            trend={<Sparkline data={rows.map((r) => r.visits)} width={96} aria-label="Visits by month" />}
            help="Counted at the door, in person."
          />
        </StatGroup>
      </section>

      <div className="lib-pair">
        <Card>
          <CardContent>
            <ChartContainer
              title="New members each month"
              takeaway={membersTakeaway(rows)}
              config={{ members: { label: 'New members', format: (v) => num.format(v) } }}
              aspect={1.6}
              xFormat={fmtMonth}
              locale={LOCALE}
              views
              xLabel="Month"
              summary={`${num.format(members)} people joined, against ${num.format(sum(rows, 'membersPrev'))} the year before. Ticks mark the same month a year earlier.`}
            >
              <BarChart data={rows} x="month" compare={{ key: 'membersPrev', label: 'Year before' }} />
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <ChartContainer
              title="Visits each month"
              takeaway={visitsTakeaway(scope, rows)}
              config={{ visits: { label: 'Visits', format: (v) => num.format(v) } }}
              aspect={1.6}
              yFormat={(v) => compact.format(v)}
              xFormat={fmtMonth}
              locale={LOCALE}
              views
              xLabel="Month"
              summary={`${num.format(visits)} visits, against ${num.format(sum(rows, 'visitsPrev'))} the year before.`}
            >
              <LineChart data={rows} x="month" compare={{ key: 'visitsPrev', label: 'Year before' }} />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <section className="lib-section" aria-labelledby="lib-branches-h">
        <h2 id="lib-branches-h" className="lib-h2">By branch</h2>
        <p className="lib-caption">
          Twelve months to October 2026, each against the twelve before.
          {scope !== 'all' && ` ${scopeName(scope)} is highlighted.`}
        </p>
        <DataTable
          aria-label="Branches, twelve months to October 2026"
          columns={columns}
          rows={TOTALS}
          getRowId={(r) => r.id}
          getRowLabel={(r) => r.name}
          defaultSort={{ key: 'loans', direction: 'descending' }}
          relevance={scope === 'all' ? undefined : (r) => (r.id === scope ? 'match' : 'miss')}
          noun="branches"
        />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
    <Toaster />
  </AltitudeProvider>,
);
