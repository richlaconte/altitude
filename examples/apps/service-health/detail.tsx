// One service, drilled into from its row or from a deploy on the lead chart (#406): a Sheet, so the report stays where
// it was. Its status and error budget, saturation (the fourth golden signal), its deploys, where the slowest request
// spent its time, and a log excerpt.
// The slowest request's spans are ranked as a BarList, which is a ranked top-N of amounts. They aren't a waterfall:
// a waterfall shows when each span ran and which waited on which, and Altitude doesn't draw one (filed separately).
// The log is a CodeBlock, a fixed excerpt of the record; a live tail would be a Terminal with Stop.
import * as React from 'react';
import {
  Alert, Badge, BarList, Button, CodeBlock, Meter, Sheet, SheetDescription, SheetHeader, SheetTitle, Timeline, TimelineItem,
} from 'altitude-design';
import { errorMessage, useDemoQuery } from '../shared/react';
import { formatRate, HEALTH, hhmm, service, serviceName } from './data';
import type { DetailAnswer, Reading, Store } from './data';

/** A service's status: a word and an icon. No data is a neutral plate with no lamp, never positive. */
export function StatusBadge({ reading }: { reading: Reading }) {
  const h = HEALTH[reading.health];
  return <Badge tone={h.tone} lamp={reading.health === 'no-data' ? false : undefined}>{h.word}</Badge>;
}

export function ServiceDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  return (
    <Sheet open={!!id} onOpenChange={(o) => { if (!o) onClose(); }} size="lg" aria-labelledby="sh-detail-title">
      <SheetHeader>
        <SheetTitle id="sh-detail-title">{id ? serviceName(id) : ''}</SheetTitle>
        <SheetDescription>Status, saturation, deploys and its slowest recent request.</SheetDescription>
      </SheetHeader>
      {id && <DetailBody id={id} />}
    </Sheet>
  );
}

function DetailBody({ id }: { id: string }) {
  const q = useDemoQuery<Store, DetailAnswer>(service, 'service.detail', { id });
  if (q.data === undefined) {
    if (q.error) return <Alert tone="critical" title={`We couldn’t load ${serviceName(id)}`} action={<Button size="sm" onClick={() => void q.reload()}>Try again</Button>}>{errorMessage(q.error)}</Alert>;
    return <div className="ex-loading sh-detail" role="status" aria-label={`Loading ${serviceName(id)}`}><Meter label="Error budget used" /><Meter label="Connections in use" /></div>;
  }
  const d = q.data;
  const ms = (v: number) => `${v.toLocaleString('en-GB')} ms`;
  return (
    <div className="sh-detail">
      {q.error && <p className="sh-refresh-failed" role="status">Couldn’t refresh: {errorMessage(q.error)}</p>}
      <p className="sh-detail-status">
        <StatusBadge reading={d.reading} />
        <span className="sh-caption">
          {d.reading.rate5 === null ? 'Not reporting.' : `${formatRate(d.reading.rate5)} of requests failed in the last 5 minutes${d.reading.burn5 !== null ? `, ${d.reading.burn5.toFixed(1)}× the rate its budget allows` : ''}.`}
          {` Owned by ${d.service.team}; ${d.service.rota} on call.`}
        </span>
      </p>
      <Meter label="Error budget used, last 30 days" value={Math.round(d.reading.budgetUsed * 100)} max={100} high={75} format={(v) => `${v}%`}
        states={{ high: 'Most of it spent' }} />
      <Meter label="Database connections in use" value={Math.round(d.saturation * 40)} max={40} high={32} format={(v) => `${v}`} />

      <section aria-labelledby="sh-spans">
        <h3 id="sh-spans" className="sh-h3">Where the slowest request spent its time</h3>
        <p className="sh-caption">{`${ms(d.slowest)} in all, ranked by span. Spans can overlap, so this isn't a timeline of the request.`}</p>
        <BarList aria-labelledby="sh-spans" data={d.spans} format={ms} sort="desc" noun="spans" />
      </section>

      <section aria-labelledby="sh-deploys">
        <h3 id="sh-deploys" className="sh-h3">Deploys</h3>
        {d.deploys.length ? (
          <Timeline aria-label={`${d.service.name} deploys`} groupBy="none">
            {d.deploys.map((x) => <TimelineItem key={x.id} time={x.at} locale="en-GB">{`${x.by} deployed ${x.id}: ${x.change}`}</TimelineItem>)}
          </Timeline>
        ) : <p className="sh-caption">No deploys in the last two hours.</p>}
      </section>

      <CodeBlock title={`${d.service.name} log, the last minute`} code={d.log} language="text" />
      <p className="sh-caption">{HEALTH[d.reading.health].word} as of {hhmm(d.asOf)}.</p>
    </div>
  );
}
