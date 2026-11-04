/*
 * Design record: appointment request, Harbourside Dental
 * - Task: a patient asks the clinic for an appointment. They pick one type, give a name, email and a preferred date, and send.
 * - Lead: the request form. Primary action: "Send request" (the only primary in the view).
 * - Frame: guided flow with a single step; no review stage, since the request isn't binding (reception confirms by email).
 * - Pattern: edit-record / review-submit validation rules: validate on send, inline Field errors plus a linked ErrorSummary,
 *   answers kept as typed, the button disabled only while sending, the outcome kept visible in place of the form.
 * - States: editing, invalid (summary + inline errors), sending, sent (reference shown), failed (answers kept, retry).
 * - Application-owned, unresolved: there's no backend. `sendRequest` simulates the clinic's booking service in memory,
 *   so nothing persists across reload and no email is actually sent. Real availability, idempotency and the
 *   reference format belong to that service. No authentication or permissions are involved.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Alert, Button, DatePicker, ErrorSummary, Field, Input, Radio, RadioGroup, WorkflowStatus,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';

type AppointmentType = '' | 'check-up' | 'hygiene' | 'problem-tooth';
type Request = { type: AppointmentType; name: string; email: string; date: string | null };
type Errors = Partial<Record<keyof Request, string>>;

const TYPE_LABELS: Record<Exclude<AppointmentType, ''>, string> = {
  'check-up': 'Check-up',
  hygiene: 'Hygiene appointment',
  'problem-tooth': 'Problem tooth',
};

// Field ids, shared by each control and the ErrorSummary links that focus it.
const IDS = { type: 'appt-type', name: 'appt-name', email: 'appt-email', date: 'appt-date' } as const;
const LABELS = { type: 'Appointment type', name: 'Your name', email: 'Email address', date: 'Preferred date' } as const;
const ORDER: (keyof Request)[] = ['type', 'name', 'email', 'date'];

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return toISO(d); })();
const isSunday = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
};
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

function validate(r: Request): Errors {
  const errors: Errors = {};
  if (!r.type) errors.type = 'Choose the type of appointment you need.';
  if (!r.name.trim()) errors.name = 'Enter your name.';
  if (!r.email.trim()) errors.email = 'Enter your email address, like aoife@brennan.example.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) errors.email = 'Enter an email address in the format name@example.com.';
  if (!r.date) errors.date = 'Choose a preferred date from tomorrow onwards, Monday to Saturday.';
  return errors;
}

// Simulated booking service: there is no backend, so requests live in memory for this session only.
const sent: Request[] = [];
async function sendRequest(r: Request): Promise<{ reference: string }> {
  await new Promise(resolve => setTimeout(resolve, 700));
  sent.push(r);
  return { reference: `HD-${String(4180 + sent.length).padStart(5, '0')}` };
}

const EMPTY: Request = { type: '', name: '', email: '', date: null };

function AppointmentRequest() {
  const [draft, setDraft] = React.useState<Request>(EMPTY);
  const [errors, setErrors] = React.useState<Errors>({});
  const [attempts, setAttempts] = React.useState(0);
  const [phase, setPhase] = React.useState<'editing' | 'sending' | 'sent' | 'failed'>('editing');
  const [receipt, setReceipt] = React.useState<{ reference: string; request: Request } | null>(null);
  const outcomeRef = React.useRef<HTMLHeadingElement>(null);

  const set = <K extends keyof Request>(key: K, value: Request[K]) => {
    setDraft(d => ({ ...d, [key]: value }));
    // Once an error has been shown, clear it as soon as the answer is fixed; never add new errors while typing.
    if (errors[key]) setErrors(e => { const next = { ...e }; if (!validate({ ...draft, [key]: value })[key]) delete next[key]; return next; });
  };

  const onSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (phase === 'sending') return;
    const found = validate(draft);
    setErrors(found);
    setAttempts(n => n + 1);
    if (Object.keys(found).length) return;
    setPhase('sending');
    try {
      const result = await sendRequest(draft);
      setReceipt({ reference: result.reference, request: draft });
      setPhase('sent');
    } catch {
      setPhase('failed');
    }
  };

  React.useEffect(() => { if (phase === 'sent') outcomeRef.current?.focus(); }, [phase]);

  const summary = ORDER.filter(k => errors[k]).map(k => ({ id: IDS[k], label: LABELS[k], message: errors[k]! }));
  const status = phase === 'sending' ? 'Sending your request…'
    : phase === 'sent' ? 'Request sent.'
    : phase === 'failed' ? 'We couldn’t send your request. Your answers are still here.' : '';

  if (phase === 'sent' && receipt) {
    const r = receipt.request;
    return (
      <section className="hd-outcome" aria-labelledby="outcome-title">
        <h2 id="outcome-title" ref={outcomeRef} tabIndex={-1}>Request sent</h2>
        <p>
          Your reference is <strong className="hd-ref">{receipt.reference}</strong>. Reception will email {r.email} within one
          working day to confirm a time, or to offer another date if {formatDate(r.date!)} is full.
        </p>
        <dl className="hd-answers">
          <dt>Appointment type</dt><dd>{TYPE_LABELS[r.type as Exclude<AppointmentType, ''>]}</dd>
          <dt>Name</dt><dd>{r.name}</dd>
          <dt>Email</dt><dd>{r.email}</dd>
          <dt>Preferred date</dt><dd>{formatDate(r.date!)}</dd>
        </dl>
        <p className="hd-muted">Need to change something? Call reception on 0131 496 0732 and quote your reference.</p>
        <Button variant="secondary" onClick={() => { setDraft(EMPTY); setErrors({}); setAttempts(0); setReceipt(null); setPhase('editing'); }}>
          Request another appointment
        </Button>
        <WorkflowStatus>{status}</WorkflowStatus>
      </section>
    );
  }

  return (
    <form className="hd-form" noValidate onSubmit={onSend} aria-labelledby="form-title">
      <h2 id="form-title" className="hd-visually-hidden">Appointment request</h2>
      <ErrorSummary
        errors={summary}
        title={summary.length === 1 ? 'Check 1 answer before sending' : `Check ${summary.length} answers before sending`}
        focusKey={attempts}
      />
      {phase === 'failed' && (
        <Alert tone="critical" title="We couldn’t send your request">
          Your answers are still here. Check your connection and send it again, or call reception on 0131 496 0732.
        </Alert>
      )}

      <Field label={LABELS.type} required error={errors.type}>
        <RadioGroup id={IDS.type} name="type" value={draft.type} onValueChange={v => set('type', v as AppointmentType)}>
          <Radio value="check-up" label="Check-up" description="A routine examination of your teeth and gums, about 20 minutes." />
          <Radio value="hygiene" label="Hygiene appointment" description="A scale and polish with our hygienist, about 30 minutes." />
          <Radio value="problem-tooth" label="Problem tooth" description="Pain, a chipped tooth or a lost filling. We keep same-week slots for these." />
        </RadioGroup>
      </Field>

      <Field label={LABELS.name} required error={errors.name}>
        <Input id={IDS.name} name="name" autoComplete="name" placeholder="Aoife Brennan"
          value={draft.name} onChange={e => set('name', e.target.value)} />
      </Field>

      <Field label={LABELS.email} required hint="We’ll confirm your appointment time here." error={errors.email}>
        <Input id={IDS.email} name="email" type="email" autoComplete="email" placeholder="aoife@brennan.example"
          value={draft.email} onChange={e => set('email', e.target.value)} />
      </Field>

      <Field label={LABELS.date} required hint="We’re open Monday to Saturday. Reception will confirm a time on this day or the nearest free one." error={errors.date}>
        <DatePicker id={IDS.date} name="date" locale="en-GB" min={tomorrow} isUnavailable={isSunday}
          value={draft.date} onValueChange={v => set('date', v)} />
      </Field>

      <div className="hd-actions">
        <Button type="submit" variant="primary" loading={phase === 'sending'} disabled={phase === 'sending'}>Send request</Button>
      </div>
      <WorkflowStatus>{status}</WorkflowStatus>
    </form>
  );
}

function App() {
  return (
    <main className="hd-page">
      <header className="hd-header">
        <p className="hd-clinic">Harbourside Dental · 14 Shore Road, Leith</p>
        <h1>Request an appointment</h1>
        <p className="hd-muted">
          Tell us what you need and when suits you. This is a request, not a booking: reception replies by email within one working day.
          For severe swelling or bleeding that won’t stop, call 0131 496 0732.
        </p>
      </header>
      <AppointmentRequest />
      <p className="hd-note">Demo: requests are kept in this browser tab only and no email is sent.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<AltitudeProvider><App /></AltitudeProvider>);
