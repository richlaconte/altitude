import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Alert,
  Button,
  DatePicker,
  ErrorSummary,
  Field,
  Input,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Radio,
  RadioGroup,
  WorkflowStatus,
  useEditRecord,
} from 'altitude-design';
import type { FieldErrors } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';

/*
 * Design record
 * - Goal: a patient asks Harbour Street Dental for an appointment.
 * - Audience: new and existing patients, on any device.
 * - Primary action: "Send appointment request" (the only primary button).
 * - Consequence: low. A request, not a booking; reception confirms by email.
 * - Data: { type, name, email, date } — all four required.
 * - Pattern: edit-record (submit validation, ErrorSummary linked to each control, WorkflowStatus).
 * - States: editing, invalid (summary + inline errors, input kept), submitting (button held), sent (receipt).
 *   No failure state is reachable because there is no backend.
 * - Application-owned, not invented here: persistence, the real reference number, availability,
 *   spam protection, and where "Back to the clinic site" navigates. The send below is a local stand-in.
 */

type AppointmentType = '' | 'checkup' | 'hygiene' | 'problem';

interface AppointmentRequest {
  type: AppointmentType;
  name: string;
  email: string;
  date: string | null;
}

const TYPES: Record<Exclude<AppointmentType, ''>, { label: string; description: string }> = {
  checkup: { label: 'Check-up', description: 'Routine exam with Dr Okafor or Dr Lindqvist. About 30 minutes.' },
  hygiene: { label: 'Hygiene', description: 'Scale and polish with our hygienist, Marta. About 45 minutes.' },
  problem: { label: 'A problem tooth', description: 'Pain, a chip or a lost filling. We keep slots free each day.' },
};

const FIELD_LABELS: Record<keyof AppointmentRequest, string> = {
  type: 'Appointment type',
  name: 'Full name',
  email: 'Email address',
  date: 'Preferred date',
};

const FIELD_IDS: Record<keyof AppointmentRequest, string> = {
  type: 'appt-type',
  name: 'appt-name',
  email: 'appt-email',
  date: 'appt-date',
};

const EMPTY: AppointmentRequest = { type: '', name: '', email: '', date: null };

const isoToday = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
// The clinic is closed on Sundays.
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

function validate(v: AppointmentRequest): FieldErrors<AppointmentRequest> {
  const errors: FieldErrors<AppointmentRequest> = {};
  if (!v.type) errors.type = 'Choose an appointment type.';
  if (!v.name.trim()) errors.name = 'Enter your full name.';
  if (!v.email.trim()) errors.email = 'Enter your email address, so we can confirm a time.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()))
    errors.email = 'Enter an email address like name@example.com.';
  if (!v.date) errors.date = 'Enter a preferred date, from tomorrow onwards, Monday to Saturday.';
  return errors;
}

// Stand-in for the clinic's booking service: there is no backend in this project.
// A real adapter must return the reference the service issued and reject on failure.
async function sendRequest(v: AppointmentRequest) {
  await new Promise((r) => setTimeout(r, 900));
  return { ok: true as const, value: v };
}

function AppointmentRequestPage() {
  const today = React.useMemo(isoToday, []);
  const [sent, setSent] = React.useState<AppointmentRequest | null>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  const form = useEditRecord<AppointmentRequest>({
    initialValue: EMPTY,
    validationMode: 'submit',
    validate,
    save: sendRequest,
    messages: {
      saving: 'Sending your request…',
      saved: 'Request sent.',
      failed: 'We couldn’t send your request. Try again.',
      invalid: 'Some answers need attention.',
    },
  });

  const summary = (Object.keys(FIELD_IDS) as (keyof AppointmentRequest)[])
    .filter((k) => form.errors[k])
    .map((k) => ({ id: FIELD_IDS[k], label: FIELD_LABELS[k], message: form.errors[k]! }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await form.submit();
    if (result?.ok) setSent(result.value);
  };

  React.useEffect(() => {
    if (sent) headingRef.current?.focus();
  }, [sent]);

  const startAnother = () => {
    form.reset(EMPTY);
    setSent(null);
  };

  return (
    <main className="appt-page">
      <PageHeader>
        <PageHeaderTitle>Request an appointment</PageHeaderTitle>
        <PageHeaderDescription>
          Harbour Street Dental, 14 Harbour Street. Open Monday to Saturday. Reception replies by email within one
          working day to confirm a time.
        </PageHeaderDescription>
      </PageHeader>

      {sent ? (
        <section className="appt-receipt" aria-labelledby="receipt-heading">
          <Alert tone="positive" title="Request received">
            We’ll email {sent.email} within one working day to confirm a time.
          </Alert>
          <h2 id="receipt-heading" ref={headingRef} tabIndex={-1}>What you asked for</h2>
          <dl>
            <dt>Appointment type</dt>
            <dd>{sent.type ? TYPES[sent.type].label : ''}</dd>
            <dt>Name</dt>
            <dd>{sent.name}</dd>
            <dt>Email</dt>
            <dd>{sent.email}</dd>
            <dt>Preferred date</dt>
            <dd>{sent.date ? formatDate(sent.date) : ''}</dd>
          </dl>
          <p className="appt-note">
            This is a demonstration with no booking service connected, so nothing has been sent to the clinic.
          </p>
          <div className="appt-actions">
            <Button variant="secondary" onClick={startAnother}>Request another appointment</Button>
          </div>
        </section>
      ) : (
        <form className="appt-form" noValidate aria-label="Appointment request" onSubmit={onSubmit}>
          <ErrorSummary
            title="Check these answers before sending"
            focusKey={form.submitCount}
            errors={summary}
          />

          <Field label={FIELD_LABELS.type} required error={form.errors.type}>
            <RadioGroup
              id={FIELD_IDS.type}
              value={form.draft.type}
              onValueChange={(v) => form.setField('type', v as AppointmentType)}
            >
              {(Object.keys(TYPES) as (keyof typeof TYPES)[]).map((k) => (
                <Radio key={k} value={k} label={TYPES[k].label} description={TYPES[k].description} />
              ))}
            </RadioGroup>
          </Field>

          <Field label={FIELD_LABELS.name} required error={form.errors.name}>
            <Input
              id={FIELD_IDS.name}
              name="name"
              autoComplete="name"
              placeholder="Priya Raman"
              value={form.draft.name}
              onChange={(e) => form.setField('name', e.target.value)}
            />
          </Field>

          <Field
            label={FIELD_LABELS.email}
            required
            hint="We’ll use it only to confirm your appointment."
            error={form.errors.email}
          >
            <Input
              id={FIELD_IDS.email}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="priya.raman@example.com"
              value={form.draft.email}
              onChange={(e) => form.setField('email', e.target.value)}
            />
          </Field>

          <Field
            label={FIELD_LABELS.date}
            required
            hint="From tomorrow, up to three months ahead. We’re closed on Sundays."
            error={form.errors.date}
          >
            <DatePicker
              id={FIELD_IDS.date}
              name="date"
              locale="en-GB"
              min={addDays(today, 1)}
              max={addDays(today, 92)}
              isUnavailable={isSunday}
              value={form.draft.date}
              onValueChange={(v) => form.setField('date', v)}
            />
          </Field>

          <div className="appt-actions">
            <Button type="submit" variant="primary" loading={form.phase === 'submitting'} disabled={form.phase === 'submitting'}>
              Send appointment request
            </Button>
          </div>
          <WorkflowStatus>{form.status}</WorkflowStatus>
        </form>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <AppointmentRequestPage />
  </AltitudeProvider>,
);
