import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {
  AltitudeProvider,
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';
import {AS_OF, daily, plan, trendPerDay} from './data';
import {UsageChart, gb, signedGb} from './UsageChart';

const fmtLong = new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
const fmtShort = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric'});
const fmtRow =new Intl.DateTimeFormat('en-US', {weekday: 'short', month: 'short', day: 'numeric'});

function Meter({
  label,
  used,
  total,
  unit,
  remaining,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
  remaining: string;
}) {
  const pct = Math.round((used / total) * 100);
  const level = pct >= 90 ? 'critical' : pct >= 80 ? 'caution' : 'normal';
  return (
    <Card className="meter-card">
      <CardHeader>
        <div className="meter-head">
          <CardTitle>{label}</CardTitle>
          {level === 'normal' ? (
            <Badge tone="neutral">{pct}% used</Badge>
          ) : (
            <Badge tone={level} variant="tinted">
              {pct}% used
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="meter-value">
          <span className="meter-used">{used}</span>
          <span className="meter-total">
            {' '}
            of {total} {unit}
          </span>
        </p>
        <Progress
          className="meter"
          data-level={level}
          value={used}
          max={total}
          aria-label={`${label}: ${used} of ${total} ${unit}`}
        />
        <p className="meter-foot">{remaining}</p>
      </CardContent>
    </Card>
  );
}

function App() {
  const first = daily[0];
  const last = daily[daily.length - 1];
  const growth = last.gb - first.gb;
  const growthPct = (growth / first.gb) * 100;
  const slope = trendPerDay(daily);
  const left = plan.storageQuotaGb - plan.storageUsedGb;
  const daysToFull = Math.ceil(left / slope);
  const fullOn = new Date(AS_OF);
  fullOn.setDate(fullOn.getDate() + daysToFull);
  const growing = slope > 0.05;
  const dip = daily.reduce((m, d) => ((d.change ?? 0) < (m.change ?? 0) ? d : m));

  const summary = `Line chart of storage used each day in October 2026. Usage grew from ${gb(first.gb)} on October 1 to ${gb(
    last.gb,
  )} on October 31, ${signedGb(growth)} (${growthPct.toFixed(1)}%), about ${slope.toFixed(1)} GB per day.`;

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Usage</h1>
          <p className="muted">
            {plan.name} plan · as of {fmtLong.format(AS_OF)}
          </p>
        </div>
      </header>

      <section className="meters" aria-label="Plan limits">
        <Meter
          label="Storage"
          used={plan.storageUsedGb}
          total={plan.storageQuotaGb}
          unit="GB"
          remaining={`${left} GB left before you reach your quota`}
        />
        <Meter
          label="Seats"
          used={plan.seatsUsed}
          total={plan.seatsTotal}
          unit="seats"
          remaining={`${plan.seatsTotal - plan.seatsUsed} seats available to invite`}
        />
      </section>

      {growing && (
        <Alert tone="caution" title={`At this rate, storage will be full around ${fmtLong.format(fullOn)}`}>
          Storage grew about {slope.toFixed(1)} GB a day in October. You have {left} GB left, roughly {daysToFull} days at
          that pace.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="chart-head">
            <div>
              <CardTitle>Storage used each day, October 2026</CardTitle>
              <CardDescription>Total stored at the end of each day.</CardDescription>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-value">{signedGb(growth)}</span>
              <span className="muted">
                {growthPct > 0 ? '+' : ''}
                {growthPct.toFixed(1)}% over the month
              </span>
              <Badge tone={growing ? 'caution' : 'positive'}>{growing ? 'Growing' : 'Steady'}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs variant="segmented" defaultValue="chart">
            <TabsList aria-label="View">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
            <TabsContent value="chart">
              <UsageChart days={daily} summary={summary} />
              <p className="chart-note">
                Rose {gb(growth)} from {gb(first.gb)} to {gb(last.gb)}, about {slope.toFixed(1)} GB a day. The one dip, on{' '}
                {fmtShort.format(dip.date)}, was a {gb(Math.abs(dip.change!))} cleanup. The axis starts at 370 GB so
                day-to-day changes are visible.
              </p>
            </TabsContent>
            <TabsContent value="table">
              <Table maxHeight={360}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead align="end">Storage used</TableHead>
                    <TableHead align="end">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daily.map((d) => (
                    <TableRow key={d.date.toISOString()}>
                      <TableCell>{fmtRow.format(d.date)}</TableCell>
                      <TableCell align="end" className="num">
                        {gb(d.gb)}
                      </TableCell>
                      <TableCell align="end" className="num">
                        {d.change === null ? '—' : signedGb(d.change)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
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
