import * as React from 'react';
import {
  Alert,
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
  WorkflowStatus,
  useEditRecord,
  type FieldErrors,
} from 'altitude-design';
import {
  appointmentTypes,
  clinic,
  sendAppointmentRequest,
  type AppointmentRequest,
  type AppointmentType,
  type StoredRequest,
} from './requestService';

const empty: AppointmentRequest = { type: '', name: '', email: '', date: null };

const ids: Record<keyof AppointmentRequest, string> = {
  type: 'appt-type',
  name: 'appt-name',
  email: 'appt-email',
  date: 'appt-date',
};

const labels: Record<keyof AppointmentRequest, string> = {
  type: 'Appointment type',
  name: 'Your name',
  email: 'Email',
  date: 'Preferred date',
};

const order: (keyof AppointmentRequest)[] = ['type', 'name', 'email', 'date'];

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localISO(d);
}

function isSunday(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

function validate(draft: AppointmentRequest): FieldErrors<AppointmentRequest> {
  const errors: FieldErrors<AppointmentRequest> = {};
  if (!draft.type) errors.type = 'Choose the type of appointment you need.';
  if (!draft.name.trim()) errors.name = 'Enter your name.';
  const email = draft.email.trim();
  if (!email) errors.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter an email address like name@example.com.';
  if (!draft.date) errors.date = 'Enter a preferred date from tomorrow onwards, Monday to Saturday.';
  return errors;
}

export function AppointmentForm() {
  const [sent, setSent] = React.useState<StoredRequest | null>(null);
  const [minDate] = React.useState(tomorrowISO);
  const confirmationHeading = React.useRef<HTMLHeadingElement>(null);

  const form = useEditRecord<AppointmentRequest>({
    initialValue: empty,
    validationMode: 'submit',
    validate,
    save: async (draft) => {
      try {
        const saved = await sendAppointmentRequest({ ...draft, name: draft.name.trim(), email: draft.email.trim() });
        setSent(saved);
        return { ok: true, value: draft };
      } catch {
        return { ok: false, error: 'We couldn’t send your request. Check your connection and try again.' };
      }
    },
    messages: {
      saving: 'Sending your request…',
      saved: 'Request sent.',
      invalid: 'Some answers need attention. They’re listed at the top of the form.',
    },
  });

  React.useEffect(() => {
    if (sent) confirmationHeading.current?.focus();
  }, [sent]);

  const summary = order
    .filter((key) => form.errors[key])
    .map((key) => ({ id: ids[key], label: labels[key], message: form.errors[key] as string }));

  const sending = form.phase === 'submitting';

  function startAnother() {
    form.reset(empty);
    setSent(null);
  }

  return (
    <div className="appt-page">
      <PageHeader>
        <PageHeaderTitle>Request an appointment</PageHeaderTitle>
        <PageHeaderDescription>
          Tell us what you need and when suits you. Our reception team at {clinic.name} will email you to confirm a time.
        </PageHeaderDescription>
      </PageHeader>

      <div className="appt-layout">
        <Card className="appt-card">
          {sent ? (
            <section className="appt-confirmation" aria-labelledby="appt-confirmation-title">
              <h2 id="appt-confirmation-title" ref={confirmationHeading} tabIndex={-1} className="appt-heading">
                We’ve got your request
              </h2>
              <p className="appt-body">
                Thanks, {sent.name}. We’ll email <strong>{sent.email}</strong> within one working day to offer a time.
              </p>
              <dl className="appt-details">
                <div><dt>Reference</dt><dd className="appt-mono">{sent.reference}</dd></div>
                <div><dt>Appointment</dt><dd>{appointmentTypes.find((t) => t.value === sent.type)?.label}</dd></div>
                <div><dt>Preferred date</dt><dd>{sent.date ? formatDate(sent.date) : ''}</dd></div>
              </dl>
              <p className="appt-caption">
                This preview has no clinic server: the request is kept in this browser tab only.
              </p>
              <div className="appt-actions">
                <Button variant="secondary" onClick={startAnother}>Request another appointment</Button>
              </div>
            </section>
          ) : (
            <form
              aria-labelledby="appt-form-title"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void form.submit();
              }}
            >
              <h2 id="appt-form-title" className="appt-visually-hidden">Appointment request</h2>
              <ErrorSummary
                title="Check these answers before sending"
                errors={summary}
                focusKey={form.submitCount}
              />

              <div className="appt-fields">
                <Field label={labels.type} required error={form.errors.type}>
                  <RadioGroup
                    id={ids.type}
                    name="type"
                    value={form.draft.type}
                    onValueChange={(v) => form.setField('type', v as AppointmentType)}
                  >
                    {appointmentTypes.map((t) => (
                      <Radio key={t.value} value={t.value} label={t.label} description={t.description} />
                    ))}
                  </RadioGroup>
                </Field>

                <Field label={labels.name} required error={form.errors.name}>
                  <Input
                    id={ids.name}
                    name="name"
                    autoComplete="name"
                    value={form.draft.name}
                    onChange={(e) => form.setField('name', e.target.value)}
                  />
                </Field>

                <Field label={labels.email} required hint="We’ll send your appointment time here." error={form.errors.email}>
                  <Input
                    id={ids.email}
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="aoife.brennan@example.com"
                    value={form.draft.email}
                    onChange={(e) => form.setField('email', e.target.value)}
                  />
                </Field>

                <Field
                  label={labels.date}
                  required
                  hint="We’re closed on Sundays. We’ll offer the nearest time we have."
                  error={form.errors.date}
                >
                  <DatePicker
                    id={ids.date}
                    name="date"
                    locale="en-GB"
                    min={minDate}
                    isUnavailable={isSunday}
                    value={form.draft.date}
                    onValueChange={(v) => form.setField('date', v)}
                  />
                </Field>
              </div>

              {form.error ? (
                <Alert className="appt-failure" tone="critical" title="Request not sent">{form.error}</Alert>
              ) : null}

              <div className="appt-actions">
                <Button type="submit" variant="primary" loading={sending} disabled={sending}>
                  {sending ? 'Sending request…' : 'Send request'}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <aside className="appt-aside" aria-labelledby="appt-clinic-title">
          <h2 id="appt-clinic-title" className="appt-subheading">{clinic.name}</h2>
          <p className="appt-caption">{clinic.address}</p>
          <dl className="appt-hours">
            {clinic.hours.map((h) => (
              <div key={h.days}><dt>{h.days}</dt><dd>{h.time}</dd></div>
            ))}
          </dl>
          <p className="appt-caption">
            In severe pain or swelling today? Call us on <a className="appt-link" href="tel:+441326318442">{clinic.phone}</a> instead of sending a request.
          </p>
        </aside>
      </div>

      <WorkflowStatus>{form.status}</WorkflowStatus>
    </div>
  );
}
