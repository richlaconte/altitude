// Declaring an incident and keeping its timeline (#406).
// Declaring pages people, so the dialog names who (the severity sets it, and the button says the outcome: "Declare
// SEV-2 and page 3 people"). It's confirmed, not held: consequential but recoverable (resolve the incident). The
// request is idempotent by key, so a retry after a lost response never pages anyone twice; a teammate who declared
// first answers as a conflict, with theirs to join. Posted updates hover until they land, and a failed one drops into
// a trench with Retry, its words kept.
import * as React from 'react';
import {
  Alert, Badge, Button, Card, CardContent, Dialog, Field, Radio, RadioGroup, Select, Textarea, Timeline, TimelineItem,
  useConsequentialAction,
} from 'altitude-design';
import { DemoError, errorMessage, isDemoError } from '../shared/react';
import { hhmm, paged, SERVICES, service, serviceName, SEVERITIES } from './data';
import type { Incident, IncidentUpdate, Reading, Severity } from './data';

export interface DeclareRequest { service: string; summary: string }

let counter = 0;
const newKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++counter}`;
const sevLabel = (s: Severity) => SEVERITIES.find((x) => x.value === s)!.label;
const outcome = (severity: Severity, people: number) =>
  people ? `Declare ${sevLabel(severity)} and page ${people} ${people === 1 ? 'person' : 'people'}` : `Declare ${sevLabel(severity)} without paging anyone`;

/** The severity the dialog starts on: a partial outage is a SEV-2, anything less a SEV-3. SEV-1 is a person's call. */
const startSeverity = (r: Reading | undefined): Severity => (r?.health === 'outage' ? 'sev2' : 'sev3');

export function DeclareDialog({ request, readings, onClose, onDeclared, onGoTo }: {
  request: DeclareRequest | null; readings: Reading[]; onClose: () => void; onDeclared: (incident: Incident) => void; onGoTo: (incident: Incident) => void;
}) {
  const [svc, setSvc] = React.useState('');
  const [severity, setSeverity] = React.useState<Severity>('sev3');
  const [summary, setSummary] = React.useState('');
  const [summaryError, setSummaryError] = React.useState('');
  const [theirs, setTheirs] = React.useState<Incident | null>(null);
  // One key per declaration the person means, kept across retries, so a retry is the same request.
  const key = React.useRef('');

  React.useEffect(() => {
    if (!request) return;
    setSvc(request.service); setSummary(request.summary); setSummaryError(''); setTheirs(null);
    setSeverity(startSeverity(readings.find((r) => r.id === request.service)));
    key.current = newKey('declare');
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  const info = SERVICES.find((s) => s.id === svc) ?? SERVICES[0];
  const people = paged(severity, info.rota);
  const consequence = people
    ? `This pages ${people} people on the ${info.team} rota${severity === 'sev1' ? ', an incident commander and comms' : ''}, and opens a channel.`
    : 'This opens a channel. It pages nobody.';
  const summaryRef = React.useRef<HTMLTextAreaElement>(null);
  // useConsequentialAction keeps the options it had when the dialog opened; the dialog is where the service, severity
  // and words are chosen, so execute reads them as they are when the person confirms.
  const form = React.useRef({ svc, severity, summary });
  form.current = { svc, severity, summary };

  const action = useConsequentialAction<Incident>({
    target: `${serviceName(svc)} incident`,
    consequence,
    requiresConfirmation: true,
    messages: { pending: 'Declaring the incident…', succeeded: 'Incident declared.' },
    execute: async () => {
      const { svc, severity, summary } = form.current;
      const input = { key: key.current, service: svc, severity, summary: summary.trim(), by: 'You' };
      try {
        const inc = await service.request<Incident>('incidents.declare', input);
        return { ok: true, value: inc };
      } catch (e) {
        if (isDemoError(e, 'lost-response')) {
          // Don't declare again blind: read the incidents back and find this one by its key.
          try {
            const list = await service.request<Incident[]>('incidents.list');
            const mine = list.find((x) => x.key === key.current);
            if (mine) return { ok: true, value: mine };
            return { ok: false, error: 'It wasn’t declared, and nobody was paged. Try again.' };
          } catch {
            return { ok: false, error: 'We couldn’t check whether it was declared. Try again: nobody will be paged twice.' };
          }
        }
        if (isDemoError(e, 'conflict')) {
          const list = (e as DemoError).current as Incident[] | Incident | undefined;
          const open = Array.isArray(list) ? list.find((x) => x.service === svc) : list;
          if (open) setTheirs(open);
          return { ok: false, error: errorMessage(e) };
        }
        if (isDemoError(e, 'invalid')) { setSummaryError(errorMessage(e)); return { ok: false, error: errorMessage(e) }; }
        return { ok: false, error: `${errorMessage(e)} Nothing was declared and nobody was paged.` };
      }
    },
  });

  // The dialog opening is the request; the hook's confirming phase is the dialog's.
  React.useEffect(() => { if (request && action.phase === 'idle') action.request(); }, [request]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (action.phase === 'succeeded' && action.result) { const inc = action.result; onClose(); onDeclared(inc); }
  }, [action.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  // Once closed, the hook goes back to idle, ready for the next declaration.
  React.useEffect(() => { if (!request && (action.phase === 'confirming' || action.phase === 'failed')) action.cancel(); }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = !!request && action.phase !== 'idle' && action.phase !== 'succeeded';
  const pending = action.phase === 'pending';
  const submit = () => {
    if (!summary.trim()) { setSummaryError('Say what’s happening, in a sentence.'); summaryRef.current?.focus(); return; }
    setSummaryError(''); setTheirs(null);
    if (action.phase === 'failed') void action.retry(); else action.confirm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !pending) onClose(); }} dismissible={!pending}
      title="Declare an incident" description={consequence}
      footer={<>
        <Button onClick={onClose} disabled={pending}>Cancel</Button>
        {theirs
          ? <Button variant="primary" onClick={() => onGoTo(theirs)}>{`Go to ${theirs.id}`}</Button>
          : <Button variant="primary" loading={pending} onClick={submit}>{outcome(severity, people)}</Button>}
      </>}>
      <form className="sh-declare" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <Field label="Service">
          <Select value={svc} onValueChange={(v) => { setSvc(v); setTheirs(null); setSeverity(startSeverity(readings.find((r) => r.id === v))); }}
            items={SERVICES.map((s) => ({ value: s.id, label: s.name }))} disabled={pending} />
        </Field>
        <Field label="Severity">
          <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as Severity)} disabled={pending}>
            {SEVERITIES.map((s) => <Radio key={s.value} value={s.value} label={s.label} description={s.description(info.rota)} />)}
          </RadioGroup>
        </Field>
        <Field label="What’s happening" hint="The first update everyone paged will read." error={summaryError || undefined}>
          <Textarea ref={summaryRef} value={summary} rows={3} onChange={(e) => { setSummary(e.target.value); if (summaryError) setSummaryError(''); }} disabled={pending} />
        </Field>
        {action.phase === 'failed' && (
          <Alert tone={theirs ? 'caution' : 'critical'} variant="raised" title={theirs ? 'Someone declared it first' : 'Not declared'}>{action.error}</Alert>
        )}
      </form>
    </Dialog>
  );
}

type Row = IncidentUpdate & { status?: 'pending' | 'committed' | 'failed'; error?: string };

/** An open incident: what it is, who it paged, and its timeline, with a place to post the next update. */
export function IncidentPanel({ incident, onChanged }: { incident: Incident; onChanged: () => void }) {
  const [local, setLocal] = React.useState<Row[]>([]);
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState('');
  // The server's updates, then this person's that it doesn't have yet (in flight or failed).
  const rows: Row[] = [...incident.updates.map((u): Row => ({ ...u, status: local.find((l) => l.id === u.id)?.status === 'committed' ? 'committed' : undefined })),
    ...local.filter((l) => !incident.updates.some((u) => u.id === l.id))];

  const send = async (u: IncidentUpdate) => {
    setLocal((prev) => [...prev.filter((x) => x.id !== u.id), { ...u, status: 'pending' }]);
    const mark = (patch: Partial<Row>) => setLocal((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...patch } : x)));
    try {
      await service.request('incidents.update', { incident: incident.id, update: u });
      mark({ status: 'committed', error: undefined }); onChanged();
    } catch (e) {
      if (isDemoError(e, 'lost-response')) {
        try {
          const list = await service.request<Incident[]>('incidents.list');
          if (list.find((x) => x.id === incident.id)?.updates.some((x) => x.id === u.id)) { mark({ status: 'committed', error: undefined }); onChanged(); return; }
        } catch { /* fall through: say it may not have posted */ }
        mark({ status: 'failed', error: 'It may not have posted. Try again: it won’t post twice.' });
        return;
      }
      mark({ status: 'failed', error: errorMessage(e) });
    }
  };

  const post = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setError('Write the update first.'); return; }
    setError('');
    void send({ id: newKey('u'), text: text.trim(), by: 'You', at: Date.now() });
    setText('');
  };

  const sev = sevLabel(incident.severity);
  return (
    <Card className="sh-incident">
      <CardContent className="sh-incident-body">
        <div className="sh-incident-head">
          <h2 className="sh-h2" id={`sh-${incident.id}`} tabIndex={-1}>{`${incident.id}: ${serviceName(incident.service)}`}</h2>
          <Badge tone={incident.severity === 'sev3' ? 'caution' : 'critical'}>{sev}</Badge>
        </div>
        <p className="sh-caption">
          {`Declared by ${incident.by} at ${hhmm(incident.at)}. `}
          {incident.paged ? `Paged ${incident.paged} ${incident.paged === 1 ? 'person' : 'people'}.` : 'Nobody was paged.'}
        </p>
        <Timeline aria-label={`${incident.id} timeline`} groupBy="none">
          <TimelineItem key="declared" time={incident.at} locale="en-GB">{`${incident.by} declared it: ${incident.summary}`}</TimelineItem>
          {rows.map((r) => (
            <TimelineItem key={r.id} time={r.at} status={r.status} locale="en-GB" onRetry={r.status === 'failed' ? () => void send(r) : undefined}>
              {`${r.by}: ${r.text}`}{r.status === 'failed' && r.error ? ` (${r.error})` : ''}
            </TimelineItem>
          ))}
        </Timeline>
        <form className="sh-update" onSubmit={post} noValidate>
          <Field label="Post an update" error={error || undefined}>
            <Textarea rows={2} value={text} onChange={(e) => { setText(e.target.value); if (error) setError(''); }} placeholder="What you’ve found, and what happens next." />
          </Field>
          <Button type="submit">Post update</Button>
        </form>
      </CardContent>
    </Card>
  );
}
