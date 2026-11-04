import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './dashboard.css';
import { MONTHS, MonthRow, int, money, moneyCompact, pct, signed } from './data';
import { Legend, MrrChart, Sparkline, SubscriptionsChart } from './charts';

type Mode = 'light' | 'dark';
type Range = '12' | '6' | '3';

// Categorical slots 1–2, validated against Altitude's raised surfaces (#ffffff / #191c23).
const SERIES: Record<Mode, React.CSSProperties> = {
  light: { ['--series-1' as string]: '#2a78d6', ['--series-2' as string]: '#eb6834' },
  dark: { ['--series-1' as string]: '#3987e5', ['--series-2' as string]: '#d95926' },
};

/* ---------- stat tiles ---------- */

interface StatProps {
  label: string;
  value: string;
  delta: number;
  deltaText: string;
  upIsGood: boolean;
  period: string;
  trend: number[];
  trendLabel: string;
}

function Stat({ label, value, delta, deltaText, upIsGood, period, trend, trendLabel }: StatProps) {
  const good = delta === 0 ? null : (delta > 0) === upIsGood;
  return (
    <Card className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        <span className={`stat-delta ${good == null ? '' : good ? 'is-good' : 'is-bad'}`}>
          <span aria-hidden="true">{delta > 0 ? '▲' : delta < 0 ? '▼' : '■'}</span> {deltaText}
          <span className="stat-period"> vs {period}</span>
        </span>
        <Sparkline values={trend} label={trendLabel} />
      </div>
    </Card>
  );
}

/* ---------- movement table ---------- */

function MovementTable({ rows }: { rows: MonthRow[] }) {
  const newestFirst = [...rows].reverse();
  return (
    <div className="table-scroll">
      <Table>
        <TableCaption>MRR and subscription movement by month, newest first</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead align="end">New MRR</TableHead>
            <TableHead align="end">Expansion</TableHead>
            <TableHead align="end">Contraction</TableHead>
            <TableHead align="end">Churned MRR</TableHead>
            <TableHead align="end">Net new MRR</TableHead>
            <TableHead align="end">Ending MRR</TableHead>
            <TableHead align="end">New subs</TableHead>
            <TableHead align="end">Cancelled</TableHead>
            <TableHead align="end">Churn rate</TableHead>
            <TableHead align="end">Active subs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {newestFirst.map((r) => (
            <TableRow key={r.key} rowId={r.key}>
              <TableCell>{r.longLabel}</TableCell>
              <TableCell align="end">{money(r.newMrr)}</TableCell>
              <TableCell align="end">{money(r.expansionMrr)}</TableCell>
              <TableCell align="end">−{money(r.contractionMrr)}</TableCell>
              <TableCell align="end">−{money(r.churnedMrr)}</TableCell>
              <TableCell align="end"><b>{signed(r.netNewMrr, money)}</b></TableCell>
              <TableCell align="end">{money(r.endMrr)}</TableCell>
              <TableCell align="end">{int(r.newSubs)}</TableCell>
              <TableCell align="end">{int(r.cancelledSubs)}</TableCell>
              <TableCell align="end">{pct(r.churnRate, 2)}</TableCell>
              <TableCell align="end">{int(r.endSubs)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ---------- page ---------- */

function Dashboard({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const [range, setRange] = React.useState<Range>('12');
  const rows = MONTHS.slice(-Number(range));
  const cur = MONTHS[MONTHS.length - 1];
  const prev = MONTHS[MONTHS.length - 2];
  const first = rows[0];
  const growth = cur.endMrr / first.startMrr - 1;
  const totalNew = rows.reduce((s, r) => s + r.newSubs, 0);
  const totalCancelled = rows.reduce((s, r) => s + r.cancelledSubs, 0);
  const churnDelta = cur.churnRate - prev.churnRate;
  const rangeLabel = range === '12' ? 'last 12 months' : `last ${range} months`;

  return (
    <div className="page" style={SERIES[mode]}>
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">Subscriptions and recurring revenue · data through October 31, 2026</p>
        </div>
        <div className="controls">
          <Tabs variant="segmented" value={range} onValueChange={(v) => setRange(v as Range)} aria-label="Time range">
            <TabsList>
              <TabsTrigger value="12">12 months</TabsTrigger>
              <TabsTrigger value="6">6 months</TabsTrigger>
              <TabsTrigger value="3">3 months</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs variant="segmented" value={mode} onValueChange={(v) => setMode(v as Mode)} aria-label="Colour scheme">
            <TabsList>
              <TabsTrigger value="light">Light</TabsTrigger>
              <TabsTrigger value="dark">Dark</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <section className="stats" aria-label="October 2026 at a glance">
        <Stat
          label="Monthly recurring revenue"
          value={money(cur.endMrr)}
          delta={cur.netNewMrr}
          deltaText={`${signed(cur.netNewMrr, moneyCompact)} (${signed(cur.endMrr / prev.endMrr - 1, (n) => pct(n))})`}
          upIsGood
          period="September"
          trend={MONTHS.map((r) => r.endMrr)}
          trendLabel="MRR trend, last 12 months, rising"
        />
        <Stat
          label="New subscriptions in October"
          value={int(cur.newSubs)}
          delta={cur.newSubs - prev.newSubs}
          deltaText={signed(cur.newSubs - prev.newSubs, int)}
          upIsGood
          period="September"
          trend={MONTHS.map((r) => r.newSubs)}
          trendLabel="New subscriptions trend, last 12 months"
        />
        <Stat
          label="Cancelled subscriptions in October"
          value={int(cur.cancelledSubs)}
          delta={cur.cancelledSubs - prev.cancelledSubs}
          deltaText={signed(cur.cancelledSubs - prev.cancelledSubs, int)}
          upIsGood={false}
          period="September"
          trend={MONTHS.map((r) => r.cancelledSubs)}
          trendLabel="Cancelled subscriptions trend, last 12 months"
        />
        <Stat
          label="Subscriber churn rate"
          value={pct(cur.churnRate, 2)}
          delta={churnDelta}
          deltaText={`${signed(churnDelta * 100, (n) => n.toFixed(2))} pts`}
          upIsGood={false}
          period="September"
          trend={MONTHS.map((r) => r.churnRate)}
          trendLabel="Churn rate trend, last 12 months, falling"
        />
      </section>

      <section className="charts">
        <Card>
          <CardHeader>
            <CardTitle>Monthly recurring revenue</CardTitle>
            <CardDescription>
              Ending MRR each month · {signed(growth, (n) => pct(n))} over the {rangeLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MrrChart rows={rows} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New vs cancelled subscriptions</CardTitle>
            <CardDescription>
              {int(totalNew)} new, {int(totalCancelled)} cancelled · net {signed(totalNew - totalCancelled, int)} over the {rangeLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Legend
              items={[
                { label: 'New', color: 'var(--series-1)' },
                { label: 'Cancelled', color: 'var(--series-2)' },
              ]}
            />
            <SubscriptionsChart rows={rows} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Monthly movement</CardTitle>
          <CardDescription>How each month's MRR and subscriber count changed</CardDescription>
        </CardHeader>
        <CardContent>
          <MovementTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  const [mode, setMode] = React.useState<Mode>(() =>
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  return (
    <AltitudeProvider scheme={mode === 'dark' ? 'nightfall' : 'daylight'} className="app-root">
      <Dashboard mode={mode} setMode={setMode} />
    </AltitudeProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
