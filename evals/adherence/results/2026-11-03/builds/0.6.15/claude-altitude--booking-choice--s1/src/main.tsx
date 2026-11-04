/*
 * Design record: appointment request (Kittiwake Dental, Leith)
 * - Task: a patient asks the clinic for an appointment of one type on a preferred date.
 * - Lead: the request form. Primary action: "Send request" (the only primary on the view).
 * - Frame: focused flow on one page; clinic details sit beside the form, narrower and quieter.
 * - Validation: on submit. Every missing answer is listed in an ErrorSummary at the top of the form,
 *   each linked to its field's id; the summary takes focus; typed answers are kept. After a failed
 *   submit, fixing a field clears its error.
 * - States: editing, invalid, sending (button loading, disabled to prevent double send), sent.
 * - Application-owned (not built here): there is no backend. `sendRequest` simulates the clinic's
 *   service with a delay and always succeeds. Persistence, confirmation emails, availability,
 *   rejection and retry belong to a real service. No permissions or navigation beyond this page.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Alert,
  AltitudeProvider,
  Button,
  Card,
  DatePicker,
  ErrorSummary,
  Field,
  Input,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Radio,
  RadioGroup,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';

type AppointmentType = '' | 'check-up' | 'hygiene' | 'problem-tooth';
interface Request {
  type: AppointmentType;
  name: string;
  email: string;
  date: string | null;
}
type ErrorItem = { id: string; label: string; message: string };

const TYPES: { value: Exclude<AppointmentType, ''>; label: string; description: string }[] = [
  { value: 'check-up', label: 'Check-up', description: 'Routine examination with Dr Okafor or Dr Lindqvist. 20 minutes.' },
  { value: 'hygiene', label: 'Hygiene', description: 'Scale and polish with our hygienist, Marta. 30 minutes.' },
  { value: 'problem-tooth', label: 'A problem tooth', description: 'Pain, a chip or a lost filling. We keep same-week slots for these.' },
];

const IDS = { type: 'appt-type', name: 'appt-name', email: 'appt-email', date: 'appt-date' } as const;

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TOMORROW = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return toIso(d); })();
const LATEST = (() => { const d = new Date(); d.setDate(d.getDate() + 90); return toIso(d); })();
const isSunday = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
};
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
};
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function validate(r: Request): ErrorItem[] {
  const list: ErrorItem[] = [];
  if (!r.type) list.push({ id: IDS.type, label: 'Appointment type', message: 'Choose the type of appointment you need.' });
  if (!r.name.trim()) list.push({ id: IDS.name, label: 'Full name', message: 'Enter your full name.' });
  if (!r.email.trim()) list.push({ id: IDS.email, label: 'Email', message: 'Enter your email address, like rowan.mcallister@example.com.' });
  else if (!looksLikeEmail(r.email)) list.push({ id: IDS.email, label: 'Email', message: 'Enter an email address with an @ and a domain, like rowan.mcallister@example.com.' });
  if (!r.date) list.push({ id: IDS.date, label: 'Preferred date', message: 'Choose a preferred date between tomorrow and 90 days from now, Monday to Saturday.' });
  return list;
}

/** Stands in for the clinic's booking service; there is no backend. */
const sendRequest = (r: Request) =>
  new Promise<{ reference: string }>((resolve) =>
    setTimeout(() => resolve({ reference: `KD-${r.date!.slice(5).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}` }), 900));

function RequestForm({ onSent }: { onSent: (r: Request, reference: string) => void }) {
  const [draft, setDraft] = React.useState<Request>({ type: '', name: '', email: '', date: null });
  const [errors, setErrors] = React.useState<ErrorItem[]>([]);
  const [submits, setSubmits] = React.useState(0);
  const [sending, setSending] = React.useState(false);

  const set = <K extends keyof Request>(key: K, value: Request[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    // After a failed send, corrections clear their own errors; no new errors appear until the next send.
    if (errors.length) {
      const fresh = validate(next);
      setErrors(errors.filter((e) => fresh.some((f) => f.id === e.id)).map((e) => fresh.find((f) => f.id === e.id)!));
    }
  };
  const errorFor = (id: string) => errors.find((e) => e.id === id)?.message;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const list = validate(draft);
    setErrors(list);
    if (list.length) { setSubmits((n) => n + 1); return; }
    setSending(true);
    const { reference } = await sendRequest(draft);
    setSending(false);
    onSent(draft, reference);
  };

  return (
    <form className="kd-form" noValidate onSubmit={onSubmit} aria-label="Appointment request">
      <ErrorSummary errors={errors} focusKey={submits} title="Your request is missing some details" />

      <Field label="Appointment type" required error={errorFor(IDS.type)}>
        <RadioGroup id={IDS.type} name="type" value={draft.type} onValueChange={(v) => set('type', v as AppointmentType)}>
          {TYPES.map((t) => <Radio key={t.value} value={t.value} label={t.label} description={t.description} />)}
        </RadioGroup>
      </Field>

      <Field label="Full name" required error={errorFor(IDS.name)}>
        <Input id={IDS.name} name="name" autoComplete="name" placeholder="Rowan McAllister"
          value={draft.name} onChange={(e) => set('name', e.target.value)} />
      </Field>

      <Field label="Email" required hint="We'll reply here to confirm a time." error={errorFor(IDS.email)}>
        <Input id={IDS.email} name="email" type="email" autoComplete="email" placeholder="rowan.mcallister@example.com"
          value={draft.email} onChange={(e) => set('email', e.target.value)} />
      </Field>

      <Field label="Preferred date" required hint="We're closed on Sundays. Choose a day in the next 90 days." error={errorFor(IDS.date)}>
        <DatePicker id={IDS.date} name="date" locale="en-GB" min={TOMORROW} max={LATEST} isUnavailable={isSunday}
          value={draft.date} onValueChange={(v) => set('date', v)} />
      </Field>

      <div className="kd-actions">
        <Button type="submit" variant="primary" loading={sending} disabled={sending}>
          {sending ? 'Sending request' : 'Send request'}
        </Button>
      </div>
    </form>
  );
}

function Sent({ request, reference, onAnother }: { request: Request; reference: string; onAnother: () => void }) {
  const heading = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => { heading.current?.focus(); }, []);
  const type = TYPES.find((t) => t.value === request.type)!;
  return (
    <section className="kd-sent" aria-labelledby="kd-sent-h">
      <Alert tone="positive" title={<span id="kd-sent-h" ref={heading} tabIndex={-1}>Request sent</span>} role="status">
        We'll email {request.email} within one working day to confirm a time. Reference {reference}.
      </Alert>
      <dl className="kd-summary">
        <dt>Appointment type</dt><dd>{type.label}</dd>
        <dt>Name</dt><dd>{request.name}</dd>
        <dt>Email</dt><dd>{request.email}</dd>
        <dt>Preferred date</dt><dd>{formatDate(request.date!)}</dd>
      </dl>
      <div className="kd-actions">
        <Button variant="secondary" onClick={onAnother}>Request another appointment</Button>
      </div>
    </section>
  );
}

function ClinicDetails() {
  return (
    <Card className="kd-clinic" aria-labelledby="kd-clinic-h">
      <h2 id="kd-clinic-h" className="kd-h2">Kittiwake Dental</h2>
      <p>14 Constitution Street<br />Leith, Edinburgh EH6 7BG</p>
      <dl className="kd-hours">
        <dt>Monday to Friday</dt><dd>8:00 – 18:00</dd>
        <dt>Saturday</dt><dd>9:00 – 13:00</dd>
        <dt>Sunday</dt><dd>Closed</dd>
      </dl>
      <p className="kd-muted">In severe pain or swelling? Call 0131 555 0182 and we'll see you today if we can.</p>
    </Card>
  );
}

function App() {
  const [sent, setSent] = React.useState<{ request: Request; reference: string } | null>(null);
  return (
    <main className="kd-page">
      <PageHeader>
        <PageHeaderTitle>Request an appointment</PageHeaderTitle>
        <PageHeaderDescription>Tell us what you need and when suits you. We'll confirm a time by email.</PageHeaderDescription>
      </PageHeader>
      <div className="kd-layout">
        <div className="kd-lead">
          {sent
            ? <Sent request={sent.request} reference={sent.reference} onAnother={() => setSent(null)} />
            : <RequestForm onSent={(request, reference) => setSent({ request, reference })} />}
        </div>
        <aside className="kd-aside" aria-label="Clinic details"><ClinicDetails /></aside>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<AltitudeProvider><App /></AltitudeProvider>);
