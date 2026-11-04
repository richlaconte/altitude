import * as React from 'react';
import {
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
  type EditRecordResult,
  type FieldErrors,
} from 'altitude-design';
import { CLINIC, APPOINTMENT_TYPES, sendAppointmentRequest, type AppointmentRequestDraft } from './clinic';

const EMPTY: AppointmentRequestDraft = { type: '', name: '', email: '', date: null };

const LABELS: Record<keyof AppointmentRequestDraft, string> = {
  type: 'Appointment type',
  name: 'Your name',
  email: 'Email address',
  date: 'Preferred date',
};

// Control ids: ErrorSummary links point at these, and Field passes each one to its control.
const IDS: Record<keyof AppointmentRequestDraft, string> = {
  type: 'appointment-type',
  name: 'patient-name',
  email: 'patient-email',
  date: 'preferred-date',
};

function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isSunday(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

const TOMORROW = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDate(d);
})();

function validate(draft: AppointmentRequestDraft): FieldErrors<AppointmentRequestDraft> {
  const errors: FieldErrors<AppointmentRequestDraft> = {};
  if (!draft.type) errors.type = 'Choose the type of appointment you need.';
  if (!draft.name.trim()) errors.name = 'Enter your name.';
  if (!draft.email.trim()) errors.email = 'Enter your email address, so we can confirm a time.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
    errors.email = 'Enter an email address like name@example.com.';
  if (!draft.date) errors.date = 'Choose a preferred date, from tomorrow onwards.';
  else if (draft.date < TOMORROW) errors.date = 'Choose a date from tomorrow onwards.';
  else if (isSunday(draft.date)) errors.date = 'We are closed on Sundays. Choose another day.';
  return errors;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function AppointmentRequest() {
  const [sent, setSent] = React.useState<AppointmentRequestDraft | null>(null);
  const form = useEditRecord<AppointmentRequestDraft>({
    initialValue: EMPTY,
    validationMode: 'submit',
    validate,
    save: async (draft): Promise<EditRecordResult<AppointmentRequestDraft>> => {
      try {
        await sendAppointmentRequest(draft);
        return { ok: true, value: draft };
      } catch {
        return { ok: false, error: "We couldn't send your request. Check your connection and send it again." };
      }
    },
    messages: {
      saving: 'Sending your request…',
      saved: 'Request sent.',
      failed: "We couldn't send your request.",
      invalid: 'Some details are missing. Check the list at the top of the form.',
    },
  });

  const summary = (Object.keys(IDS) as (keyof AppointmentRequestDraft)[])
    .filter((key) => form.errors[key])
    .map((key) => ({ id: IDS[key], label: LABELS[key], message: form.errors[key]! }));

  const confirmationRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (sent) confirmationRef.current?.focus();
  }, [sent]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = await form.submit();
    if (result?.ok) setSent(result.value);
  }

  function startAnother() {
    form.reset(EMPTY);
    setSent(null);
  }

  const submitting = form.phase === 'submitting';
  const sentType = sent && APPOINTMENT_TYPES.find((t) => t.value === sent.type);

  return (
    <main className="page">
      <PageHeader>
        <PageHeaderTitle>Request an appointment</PageHeaderTitle>
        <PageHeaderDescription>
          Tell us what you need and when suits you. Our reception team replies by email within one working day.
        </PageHeaderDescription>
      </PageHeader>

      <div className="layout">
        <section className="lead" aria-label="Appointment request">
          {sent && sentType ? (
            <div ref={confirmationRef} tabIndex={-1} className="confirmation">
              <Alert tone="positive" title="Request sent">
                Thanks, {sent.name.trim()}. We've asked for a {sentType.label.toLowerCase()} on{' '}
                {formatDate(sent.date!)}. We'll email {sent.email.trim()} with a time, or with other options if that
                day is full.
              </Alert>
              <div className="actions">
                <Button variant="secondary" onClick={startAnother}>
                  Request another appointment
                </Button>
              </div>
            </div>
          ) : (
            <form name="appointment-request" noValidate onSubmit={onSubmit} aria-busy={submitting || undefined}>
              <ErrorSummary
                title="Check these details before sending"
                focusKey={form.submitCount}
                errors={summary}
              />

              {form.phase === 'failed' && form.error ? (
                <Alert tone="critical" title="Not sent">
                  {form.error}
                </Alert>
              ) : null}

              <Field label={LABELS.type} required error={form.errors.type}>
                <RadioGroup
                  id={IDS.type}
                  name="type"
                  value={form.draft.type}
                  onValueChange={(v) => form.setField('type', v as AppointmentRequestDraft['type'])}
                >
                  {APPOINTMENT_TYPES.map((t) => (
                    <Radio key={t.value} value={t.value} label={t.label} description={t.description} />
                  ))}
                </RadioGroup>
              </Field>

              <Field label={LABELS.name} required error={form.errors.name}>
                <Input
                  id={IDS.name}
                  name="name"
                  autoComplete="name"
                  placeholder="Aoife Brennan"
                  value={form.draft.name}
                  onChange={(e) => form.setField('name', e.target.value)}
                />
              </Field>

              <Field
                label={LABELS.email}
                required
                hint="We only use this to confirm your appointment."
                error={form.errors.email}
              >
                <Input
                  id={IDS.email}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="aoife.brennan@example.com"
                  value={form.draft.email}
                  onChange={(e) => form.setField('email', e.target.value)}
                />
              </Field>

              <Field
                label={LABELS.date}
                required
                hint="Monday to Saturday. We'll offer the nearest free time on that day."
                error={form.errors.date}
              >
                <DatePicker
                  id={IDS.date}
                  name="date"
                  locale="en-GB"
                  min={TOMORROW}
                  isUnavailable={isSunday}
                  value={form.draft.date}
                  onValueChange={(v) => form.setField('date', v)}
                />
              </Field>

              <div className="actions">
                <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
                  Send request
                </Button>
              </div>
            </form>
          )}
          <WorkflowStatus>{form.status}</WorkflowStatus>
        </section>

        <aside className="details" aria-labelledby="clinic-heading">
          <h2 id="clinic-heading">{CLINIC.name}</h2>
          <address>
            {CLINIC.address.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </address>
          <dl>
            {CLINIC.hours.map(([days, time]) => (
              <div key={days}>
                <dt>{days}</dt>
                <dd>{time}</dd>
              </div>
            ))}
          </dl>
          <p>
            In pain or swelling that can't wait? Call us on <a href={`tel:${CLINIC.phoneHref}`}>{CLINIC.phone}</a> and
            choose option 1.
          </p>
          <p className="note">This is a demonstration: requests stay in this page and nothing is sent.</p>
        </aside>
      </div>
    </main>
  );
}
