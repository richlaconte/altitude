// Example: Storefront health (#406). The report frame on live data, with partial failure.
//   Task: the on-call engineer answers "is anything wrong, and where?"
//   Lead: the error-rate chart, whose takeaway says the answer ("Checkout errors rose from 0.05% to 3.7% of requests
//   after the 14:05 deploy…"). Primary action: none while all is well; when the takeaway names a service over its
//   budget, "Declare incident for Checkout" under the lead is the view's one primary. "Declare incident" stays in the
//   header as a secondary action, because people declare incidents for things a dashboard can't see.
//   Next: the incident, with its timeline, under the lead.
// The takeaway is written by a fixed rule (writeTakeaway in data.ts): an error-budget burn rate over a 60- and a
// 5-minute window against a 99.9% SLO (SRE workbook, "Alerting on SLOs"), the nearest earlier deploy named as a time,
// not a cause. It never claims the all-clear when the error rates didn't load or a service stopped reporting, and
// stale data says when it was true. Missing data is drawn as a gap and reads "No data", never healthy.
// Each panel is its own query, so one can fail while the rest stay. Every live chart is pausable (WCAG 2.2.2), one
// switch pauses the whole page, and only changes of status are announced.
// Not here: a span waterfall (Altitude has none; the detail ranks the slowest request's spans as a BarList and says
// so), and rolling back a deploy.
import * as React from 'react';
import {
  Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, ChartAnnotation, ChartContainer, ChartReference, Heatmap,
  LineChart, BarList, Meter, PageHeader, PageHeaderDescription, PageHeaderTitle, Sparkline, Stat, StatGroup, Table, TableBody,
  TableCell, TableHead, TableHeader, TableRow,
} from 'altitude-design';
import { errorMessage, useDemoQuery, useDemoService } from '../shared/react';
import type { DemoQuery } from '../shared/react';
import { BUDGET, formatRate, HEALTH, hhmm, SERVICES, service, serviceName, writeTakeaway } from './data';
import type { EndpointsAnswer, ErrorsAnswer, HeatAnswer, Incident, LatencyAnswer, ServicesAnswer } from './data';
import { DeclareDialog, IncidentPanel } from './incident';
import type { DeclareRequest } from './incident';
import { ServiceDetail, StatusBadge } from './detail';

const ms = (v: number) => `${Math.round(v).toLocaleString('en-GB')} ms`;
const count = (v: number) => Math.round(v).toLocaleString('en-GB');
const xTime = (v: unknown) => hhmm(Number(v));

/** While paused, a panel keeps showing what it showed when the pause began. */
function useHeld<T>(value: T, paused: boolean): T {
  const held = React.useRef(value);
  if (!paused) held.current = value;
  return held.current;
}

// A panel's freshness: two minutes behind the page's clock (the real one, or the newest answer if the simulated clock
// was skipped ahead of it) is stale. Its data keeps full strength; half strength is for a refresh in flight.
type Fresh = { asOf: number } | undefined;
const STALE_AFTER = 2 * 60_000;
const isStale = (data: Fresh, pageNow: number | null) => !!data && pageNow !== null && pageNow - data.asOf >= STALE_AFTER;

/** The real clock, a minute at a time, so a page whose feed stalls notices without anything else happening. */
function useMinuteClock() {
  const [now, setNow] = React.useState(() => Math.floor(Date.now() / 60_000) * 60_000);
  React.useEffect(() => { const id = setInterval(() => setNow(Math.floor(Date.now() / 60_000) * 60_000), 10_000); return () => clearInterval(id); }, []);
  return now;
}

/** A panel's frame: its title, whether it's stale, and what happened if a read failed, around its content. */
function Panel<T extends { asOf: number }>({ id, title, query, shown, pageAsOf, noun, className, updated = true, children }: {
  id: string; title: string; query: DemoQuery<T>; pageAsOf: number | null; noun: string; className?: string;
  /** What the panel shows, which pausing holds; its freshness is this, not the latest answer. */
  shown: T | undefined;
  /** Say when it was updated. Off for a live chart, whose frame says it already. */
  updated?: boolean;
  children: (data: T | undefined) => React.ReactNode;
}) {
  const stale = isStale(shown, pageAsOf);
  const retry = <Button size="sm" onClick={() => void query.reload()}>Try again</Button>;
  return (
    <Card className={['sh-panel', className].filter(Boolean).join(' ')} aria-labelledby={`${id}-title`}>
      <CardHeader className="sh-panel-head">
        <CardTitle id={`${id}-title`}>{title}</CardTitle>
        {shown && (stale
          ? <Badge tone="caution">{`Stale · as of ${hhmm(shown.asOf)}`}</Badge>
          : (updated ? <span className="sh-caption">Updated {hhmm(shown.asOf)}</span> : null))}
      </CardHeader>
      <CardContent className="sh-panel-body">
        {query.data === undefined && query.error
          ? <Alert tone="critical" title={`We couldn’t load ${noun}`} action={retry}>{errorMessage(query.error)}</Alert>
          : <>
            {query.error && <p className="sh-refresh-failed" role="status">Couldn’t refresh {noun}: {errorMessage(query.error)} {retry}</p>}
            {children(query.data)}
          </>}
      </CardContent>
    </Card>
  );
}

export function App() {
  const snap = useDemoService(service);
  const [paused, setPaused] = React.useState(false);
  const [online, setOnline] = React.useState(() => service.isOnline());
  React.useEffect(() => service.onConnectivity(setOnline), []);

  const errorsQ = useDemoQuery<typeof snap.state, ErrorsAnswer>(service, 'metrics.errors');
  const servicesQ = useDemoQuery<typeof snap.state, ServicesAnswer>(service, 'services.list');
  const heatQ = useDemoQuery<typeof snap.state, HeatAnswer>(service, 'metrics.heatmap');
  const endpointsQ = useDemoQuery<typeof snap.state, EndpointsAnswer>(service, 'endpoints.noisy');
  const incidentsQ = useDemoQuery<typeof snap.state, Incident[]>(service, 'incidents.list');

  const errors = useHeld(errorsQ.data, paused);
  const clock = useMinuteClock();
  const newest = Math.max(-1, ...[errorsQ, servicesQ, heatQ, endpointsQ].map((q) => q.data?.asOf ?? -1));
  // While paused, nothing is stale: the person chose to hold the page still.
  const asOf = useHeld(newest < 0 ? null : Math.max(clock, newest), paused);
  const newestAsOf = newest < 0 ? null : newest;
  const takeaway = writeTakeaway(errors, isStale(errors, asOf));
  const worst = takeaway.worst ?? null;
  const burning = takeaway.health === 'outage' || takeaway.health === 'degraded';
  const latencyQ = useDemoQuery<typeof snap.state, LatencyAnswer>(service, 'metrics.latency', { service: burning ? worst : null });

  // Open the service's detail, and remember where to put focus back.
  const [detail, setDetail] = React.useState<string | null>(null);
  // Declaring: the request the dialog opens with.
  const [declare, setDeclareRaw] = React.useState<DeclareRequest | null>(null);
  // Each declaration is its own: a fresh dialog, so a finished one never blocks the next.
  const [declaration, setDeclaration] = React.useState(0);
  const setDeclare = (r: DeclareRequest | null) => { if (r) setDeclaration((n) => n + 1); setDeclareRaw(r); };
  const incidents = incidentsQ.data ?? [];
  const openFor = (id: string | null) => incidents.find((x) => x.service === id);

  // Announce changes of status only, never values: "Checkout: partial outage."
  const [said, setSaid] = React.useState('');
  const prev = React.useRef<Record<string, string> | null>(null);
  React.useEffect(() => {
    if (!errors) return;
    const now = Object.fromEntries(errors.readings.map((r) => [r.id, r.health]));
    if (prev.current) {
      const changed = errors.readings.filter((r) => prev.current![r.id] !== r.health);
      if (changed.length) setSaid(changed.map((r) => `${serviceName(r.id)}: ${HEALTH[r.health].word.toLowerCase()}.`).join(' '));
    }
    prev.current = now;
  }, [errors]);
  React.useEffect(() => { if (snap.resetRevision) { prev.current = null; setSaid(''); setDetail(null); setDeclare(null); } }, [snap.resetRevision]);

  // The incident takes focus once it's there and the page is no longer inert behind a closing dialog.
  const goToIncident = (inc: Incident, tries = 40) => {
    const h = document.getElementById(`sh-${inc.id}`);
    if (h && !h.closest('[inert]')) { h.focus(); if (document.activeElement === h) { h.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; } }
    if (tries > 0) requestAnimationFrame(() => goToIncident(inc, tries - 1));
  };

  const leadOpen = openFor(worst);
  // Every panel's data is held here, at the top, so pausing freezes the whole page at once.
  const servicesData = useHeld(servicesQ.data, paused);
  const latencyData = useHeld(latencyQ.data, paused);
  const heatData = useHeld(heatQ.data, paused);
  const endpointsData = useHeld(endpointsQ.data, paused);
  const focusRow = servicesData?.rows.find((r) => r.id === (burning ? worst : null));

  return (
    <main className="sh">
      <PageHeader actions={<Button onClick={() => setDeclare({ service: worst ?? SERVICES[0].id, summary: burning ? takeaway.text : '' })}>Declare incident</Button>}>
        <PageHeaderTitle>Storefront health</PageHeaderTitle>
        <PageHeaderDescription>Production, the last two hours. The SLO for every service is 99.9% of requests succeeding.</PageHeaderDescription>
      </PageHeader>

      {!online && (
        <Alert tone="caution" title="You’re offline">
          {newestAsOf !== null ? `Showing data as of ${hhmm(newestAsOf)}. It updates when you’re back online.` : 'Nothing has loaded yet. It loads when you’re back online.'}
        </Alert>
      )}

      <Lead query={errorsQ} errors={errors} takeaway={takeaway.text} worst={burning ? worst : null} health={takeaway.health} paused={paused} onPausedChange={setPaused}
        stale={isStale(errors, asOf)} onDeploy={(id) => setDetail(id)}
        action={burning && worst ? (leadOpen
          ? <Button onClick={() => goToIncident(leadOpen)}>{`Go to ${leadOpen.id}`}</Button>
          : <Button variant="primary" onClick={() => setDeclare({ service: worst, summary: takeaway.text })}>{`Declare incident for ${serviceName(worst)}`}</Button>) : null} />

      {incidents.length > 0 && (
        <section className="sh-incidents" aria-label="Open incidents">
          {incidents.map((inc) => <IncidentPanel key={inc.id} incident={inc} onChanged={() => void incidentsQ.reload()} />)}
        </section>
      )}

      <section className="sh-around" aria-labelledby="sh-around-title">
        <h2 id="sh-around-title" className="sh-h2">Around it</h2>
        <div className="sh-numbers">
          <StatGroup aria-label="Traffic, latency and incidents">
            <Stat label="Requests a minute, all services" value={servicesData ? servicesData.traffic[servicesData.traffic.length - 1] ?? null : undefined} format={count} locale="en-GB"
              trend={servicesData && <Sparkline data={servicesData.traffic} decorative />} />
            <Stat label={focusRow ? `${focusRow.name} p99, last 5 minutes` : 'Slowest p99, last 5 minutes'}
              value={servicesData ? (focusRow?.p99 ?? Math.max(...servicesData.rows.map((r) => r.p99 ?? 0))) : undefined} format={ms} locale="en-GB" />
            <Stat label="Open incidents" value={incidentsQ.data ? incidents.length : undefined} />
          </StatGroup>
          {servicesData && (() => {
            // The error budget of the service the takeaway names, or the one that's spent the most.
            const row = focusRow ?? [...servicesData.rows].sort((a, b) => b.reading.budgetUsed - a.reading.budgetUsed)[0];
            return <Meter className="sh-budget" label={`${row.name}: error budget used, last 30 days`}
              value={Math.round(row.reading.budgetUsed * 100)} max={100} high={75} format={(v) => `${v}%`} />;
          })()}
        </div>
      </section>

      <Panel id="sh-latency" updated={false} title={latencyData?.service ? `${serviceName(latencyData.service)} latency` : 'Latency, all traffic'} query={latencyQ} shown={latencyData} pageAsOf={asOf} noun="latency">
        {() => <LatencyChart data={latencyData} paused={paused} onPausedChange={setPaused} />}
      </Panel>

      <Panel id="sh-services" title="Services" query={servicesQ} shown={servicesData} pageAsOf={asOf} noun="the services">
        {() => <ServicesTable data={servicesData} onOpen={setDetail} />}
      </Panel>

      <div className="sh-pair">
        <Panel id="sh-heat" title="Errors by service, every 10 minutes" query={heatQ} shown={heatData} pageAsOf={asOf} noun="errors by service">
          {() => (
            // Not `live`: a live container clips its marks at the plot's edge, and Heatmap draws its row labels there,
            // so the service names disappeared (#463). It still updates, and the page's pause holds it.
            <ChartContainer aria-labelledby="sh-heat-title" config={{ errors: { label: 'Errors', format: count } }} data={heatData?.cells} locale="en-GB" views
              summary={heatSummary(heatData)}>
              <Heatmap data={heatData?.cells} x="bucket" y="service" value="errors" bins={[0, 1, 10, 50, 200]} />
            </ChartContainer>
          )}
        </Panel>
        <Panel id="sh-endpoints" title="Noisiest endpoints, last 15 minutes" query={endpointsQ} shown={endpointsData} pageAsOf={asOf} noun="the endpoints">
          {() => <BarList aria-labelledby="sh-endpoints-title" data={endpointsData?.items} format={(v) => `${count(v)} errors`} limit={6} noun="endpoints" />}
        </Panel>
      </div>

      <ServiceDetail id={detail} onClose={() => setDetail(null)} />
      <DeclareDialog key={declaration} request={declare} readings={errors?.readings ?? []} onClose={() => setDeclare(null)}
        onDeclared={(inc) => { incidentsQ.setData((list) => [inc, ...(list ?? []).filter((x) => x.id !== inc.id)]); void incidentsQ.reload(); goToIncident(inc); }}
        onGoTo={(inc) => { incidentsQ.setData((list) => [...(list ?? []).filter((x) => x.id !== inc.id), inc]); void incidentsQ.reload(); setDeclare(null); goToIncident(inc); }} />
      <span className="sh-sr" role="status">{said}</span>
    </main>
  );
}

const heatSummary = (data: HeatAnswer | undefined) => {
  if (!data) return undefined;
  const byService = new Map<string, number>();
  for (const c of data.cells) byService.set(c.service, (byService.get(c.service) ?? 0) + (c.errors ?? 0));
  const [top, n] = [...byService].sort((a, b) => b[1] - a[1])[0];
  const missing = [...new Set(data.cells.filter((c) => c.errors === null).map((c) => c.service))];
  return `Errors per service in 10-minute steps over two hours. ${top} had the most, ${count(n)}.${missing.length ? ` No data from ${missing.join(', ')} for part of it.` : ''}`;
};

/** The lead: error rate by service, with the takeaway as its heading, the SLO to read against and the deploys on it. */
function Lead({ query, errors, takeaway, worst, health, paused, onPausedChange, stale, onDeploy, action }: {
  query: DemoQuery<ErrorsAnswer>; errors: ErrorsAnswer | undefined; takeaway: string; worst: string | null; health: string; paused: boolean;
  onPausedChange: (p: boolean) => void; stale: boolean; onDeploy: (service: string) => void; action: React.ReactNode;
}) {
  const config = Object.fromEntries(SERVICES.map((s) => [s.id, { label: s.name, format: formatRate }]));
  // What the chart is about: the service the takeaway names keeps its colour, the rest are context. All clear: none.
  const focus = worst ? [worst] : health === 'no-data' && errors ? errors.readings.filter((r) => r.health === 'no-data').map((r) => r.id) : [];
  const first = errors?.rows[0]?.t as number | undefined;
  const failedFirst = !errors && !!query.error;
  return (
    <section className="sh-lead" aria-label="Error rate by service">
      {failedFirst ? (
        <div className="sh-lead-failed">
          <p className="sh-label">Error rate by service</p>
          <p className="sh-lead-takeaway">{takeaway}</p>
          <Alert tone="critical" title="We couldn’t load error rates" action={<Button size="sm" onClick={() => void query.reload()}>Try again</Button>}>{errorMessage(query.error)}</Alert>
        </div>
      ) : (
        <ChartContainer title="Error rate by service" takeaway={errors ? takeaway : undefined} config={config} data={errors?.rows} x="t" xFormat={xTime} yFormat={formatRate}
          height={300} live pausable paused={paused} onPausedChange={onPausedChange} views xLabel="Time" locale="en-GB"
          summary={errors ? leadSummary(errors) : undefined}>
          <LineChart data={errors?.rows} x="t" focus={focus} />
          <ChartReference y={BUDGET} label="SLO: 0.1% may fail" tone="critical" />
          {errors?.deploys.filter((d) => first !== undefined && d.at >= first).map((d) => (
            <ChartAnnotation key={d.id} x={d.at} label={`${serviceName(d.service)} deploy ${d.id}`} onSelect={() => onDeploy(d.service)} />
          ))}
        </ChartContainer>
      )}
      {(query.error && errors) || stale || action ? (
        <div className="sh-lead-foot">
          {query.error && errors && <p className="sh-refresh-failed" role="status">Couldn’t refresh error rates: {errorMessage(query.error)} <Button size="sm" onClick={() => void query.reload()}>Try again</Button></p>}
          {stale && !query.error && <Badge tone="caution">Stale</Badge>}
          {action}
        </div>
      ) : null}
    </section>
  );
}

const leadSummary = (e: ErrorsAnswer) => {
  const over = e.readings.filter((r) => r.health === 'outage' || r.health === 'degraded');
  const silent = e.readings.filter((r) => r.health === 'no-data');
  const ok = e.readings.length - over.length - silent.length;
  const parts = [
    ...over.map((r) => `${serviceName(r.id)} failed ${formatRate(r.rate5 ?? 0)} of requests in the last 5 minutes`),
    ...silent.map((r) => `${serviceName(r.id)} has not reported since ${hhmm(r.silentSince ?? e.asOf)}`),
    `${ok} ${over.length || silent.length ? 'other ' : ''}service${ok === 1 ? ' is' : 's are'} under the SLO line of 0.1%`,
  ];
  return `Errors as a share of requests, per minute, for ${e.readings.length} services from ${hhmm(e.rows[0].t as number)} to ${hhmm(e.asOf)}. ${parts.join('; ')}.`;
};

function LatencyChart({ data, paused, onPausedChange }: { data: LatencyAnswer | undefined; paused: boolean; onPausedChange: (p: boolean) => void }) {
  const first = data?.rows[0]?.t;
  const last = data?.rows[data.rows.length - 1];
  return (
    <ChartContainer aria-labelledby="sh-latency-title" config={{ p50: { label: 'p50 (median)', format: ms }, p99: { label: 'p99', format: ms } }}
      data={data?.rows} x="t" xFormat={xTime} yFormat={ms} height={200} live pausable paused={paused} onPausedChange={onPausedChange} views xLabel="Time" locale="en-GB"
      summary={data && last ? `Half of requests finish within the p50 and 99 in 100 within the p99. Now: p50 ${ms(last.p50 ?? 0)}, p99 ${ms(last.p99 ?? 0)}.` : undefined}>
      <LineChart data={data?.rows} x="t" />
      {data?.deploys.filter((d) => first !== undefined && d.at >= first).map((d) => <ChartAnnotation key={d.id} x={d.at} label={`Deploy ${d.id}`} />)}
    </ChartContainer>
  );
}

function ServicesTable({ data, onOpen }: { data: ServicesAnswer | undefined; onOpen: (id: string) => void }) {
  if (!data) return <div className="ex-loading" role="status" aria-label="Loading the services"><Table><TableBody>{SERVICES.map((s) => <TableRow key={s.id}><TableCell>{s.name}</TableCell></TableRow>)}</TableBody></Table></div>;
  return (
    <Table className="sh-table">
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Errors, last hour</TableHead>
          <TableHead align="end">Errors, last 5 min</TableHead>
          <TableHead align="end">p99</TableHead>
          <TableHead align="end">Requests a minute</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((r) => (
          // The row lifts on hover because clicking it opens the service; its name is the button for the keyboard.
          <TableRow key={r.id} rowId={r.id} interactive settle={r.reading.health} onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) onOpen(r.id); }}>
            <TableCell><button type="button" className="sh-link" onClick={() => onOpen(r.id)}>{r.name}</button></TableCell>
            <TableCell><StatusBadge reading={r.reading} /></TableCell>
            <TableCell>{r.spark.some((v) => v !== null) ? <Sparkline data={r.spark} width="7em" format={formatRate} tone={r.reading.health === 'outage' ? 'critical' : 'neutral'} summary={`${r.name}: errors over the last hour${r.spark.some((v) => v === null) ? ', with a gap where it stopped reporting' : ''}.`} /> : <span className="sh-caption">No data</span>}</TableCell>
            <TableCell align="end">{r.reading.rate5 === null ? '—' : formatRate(r.reading.rate5)}</TableCell>
            <TableCell align="end">{r.p99 === null ? '—' : ms(r.p99)}</TableCell>
            <TableCell align="end">{r.rpm === null ? '—' : count(r.rpm)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
