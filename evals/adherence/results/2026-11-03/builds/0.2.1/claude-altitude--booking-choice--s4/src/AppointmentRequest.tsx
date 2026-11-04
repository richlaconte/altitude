import * as React from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Icons,
  Input,
  Radio,
  RadioGroup,
} from 'altitude-design';

const CLINIC = {
  name: 'Northgate Family Dental',
  address: '214 Alder Street, Suite 3, Portland, OR 97205',
  phone: '(503) 555-0142',
  hours: [
    ['Mon – Fri', '8:00 am – 6:00 pm'],
    ['Saturday', '9:00 am – 1:00 pm'],
    ['Sunday', 'Closed'],
  ],
};

const APPOINTMENT_TYPES = [
  { value: 'checkup', label: 'Check-up', description: 'Exam with Dr. Okafor or Dr. Lindqvist. About 30 minutes.' },
  { value: 'hygiene', label: 'Hygiene visit', description: 'Scale and polish with one of our hygienists. About 45 minutes.' },
  { value: 'problem', label: 'Problem tooth', description: 'Pain, a chip, swelling or a lost filling. We hold same-week slots for these.' },
] as const;

type FieldName = 'type' | 'name' | 'email' | 'date';
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

// Each field's id, in the order the fields appear, so the summary lists problems top to bottom.
const FIELD_IDS: Record<FieldName, string> = {
  type: 'appointment-type',
  name: 'patient-name',
  email: 'patient-email',
  date: 'preferred-date',
};
const FIELD_ORDER: FieldName[] = ['type', 'name', 'email', 'date'];

const EMPTY: Values = { type: '', name: '', email: '', date: '' };

function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses YYYY-MM-DD as a local date (new Date('2026-11-03') would be UTC midnight). */
function parseIsoDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(iso: string) {
  return parseIsoDate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function validateField(field: FieldName, values: Values): string | undefined {
  const v = values[field].trim();
  switch (field) {
    case 'type':
      return v ? undefined : 'Choose an appointment type';
    case 'name':
      return v ? undefined : 'Enter your full name';
    case 'email':
      if (!v) return 'Enter your email address';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter an email address in the format name@example.com';
      return undefined;
    case 'date':
      if (!v) return 'Enter a preferred date';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Enter a real date';
      if (v < todayIso()) return 'Preferred date must be today or in the future';
      if (parseIsoDate(v).getDay() === 0) return 'We are closed on Sundays. Choose another day';
      return undefined;
  }
}

function validateAll(values: Values): Errors {
  const errors: Errors = {};
  for (const f of FIELD_ORDER) {
    const e = validateField(f, values);
    if (e) errors[f] = e;
  }
  return errors;
}

/** Moves focus to a field (for the radio group, its chosen option or else the first one) and brings its label into view. */
function focusField(field: FieldName) {
  const el = document.getElementById(FIELD_IDS[field]);
  if (!el) return;
  const target =
    field === 'type'
      ? el.querySelector<HTMLInputElement>('input[type="radio"]:checked') ?? el.querySelector<HTMLInputElement>('input[type="radio"]')
      : el;
  target?.focus({ preventScroll: true });
  (el.closest('.alt-field, fieldset') ?? el).scrollIntoView({ block: 'center', behavior: 'smooth' });
}

type Sent = Values & { reference: string };

export function AppointmentRequest() {
  const [sent, setSent] = React.useState<Sent | null>(null);

  return (
    <div className="page">
      <header className="clinic-header">
        <p className="clinic-name">{CLINIC.name}</p>
        <p className="clinic-meta">
          {CLINIC.address} · <a href="tel:+15035550142">{CLINIC.phone}</a>
        </p>
      </header>

      <main className="layout">
        {sent ? <Confirmation sent={sent} onReset={() => setSent(null)} /> : <RequestForm onSent={setSent} />}

        <aside className="sidebar" aria-label="Clinic information">
          <h2>Opening hours</h2>
          <dl className="hours">
            {CLINIC.hours.map(([day, time]) => (
              <React.Fragment key={day}>
                <dt>{day}</dt>
                <dd>{time}</dd>
              </React.Fragment>
            ))}
          </dl>
          <h2>In pain right now?</h2>
          <p>
            Call us on <a href="tel:+15035550142">{CLINIC.phone}</a> instead of sending a request. We see emergencies the same day
            whenever we can.
          </p>
        </aside>
      </main>
    </div>
  );
}

function RequestForm({ onSent }: { onSent: (s: Sent) => void }) {
  const [values, setValues] = React.useState<Values>(EMPTY);
  const [errors, setErrors] = React.useState<Errors>({});
  const [sending, setSending] = React.useState(false);
  // Bumped on every failed send, so the summary takes focus again even if the list of problems hasn't changed.
  const [failedAttempt, setFailedAttempt] = React.useState(0);
  const summaryRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (failedAttempt > 0) {
      summaryRef.current?.focus();
      summaryRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [failedAttempt]);

  const update = (field: FieldName, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    // Once a field has been flagged, clear (or refine) its message as the person fixes it,
    // but don't raise new errors on fields they haven't been told about yet.
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        const e = validateField(field, next);
        if (e) copy[field] = e;
        else delete copy[field];
        return copy;
      });
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const found = validateAll(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFailedAttempt((n) => n + 1);
      return;
    }
    // No backend: pretend to send it.
    setSending(true);
    window.setTimeout(() => {
      const reference = `NFD-${Math.floor(1000 + Math.random() * 9000)}`;
      onSent({ ...values, name: values.name.trim(), email: values.email.trim(), reference });
    }, 900);
  };

  const errorList = FIELD_ORDER.filter((f) => errors[f]);
  const typeErrorId = 'appointment-type-error';

  return (
    <section className="form-column" aria-labelledby="form-title">
      <h1 id="form-title">Request an appointment</h1>
      <p className="lede">
        Tell us what you need and when suits you. We'll email you within one working day to confirm a time.
      </p>

      {errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="error-summary" role="region" aria-labelledby="error-summary-title">
          {/* role is overridden: focus moving here is what announces it, so it shouldn't also be a live alert. */}
          <Alert tone="critical" role={undefined} title={<span id="error-summary-title">There is a problem</span>}>
            <ul>
              {errorList.map((f) => (
                <li key={f}>
                  <a
                    href={`#${FIELD_IDS[f]}`}
                    onClick={(e) => {
                      e.preventDefault();
                      focusField(f);
                    }}
                  >
                    {errors[f]}
                  </a>
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      <form noValidate onSubmit={onSubmit} className="form">
        <fieldset
          className="type-fieldset"
          aria-describedby={errors.type ? typeErrorId : undefined}
          aria-invalid={errors.type ? true : undefined}
          data-invalid={errors.type ? '' : undefined}
        >
          <legend className="alt-field-label">
            Appointment type<span className="alt-field-req" aria-hidden="true"> *</span>
          </legend>
          {errors.type && (
            <p className="alt-field-error" id={typeErrorId}>
              <Icons.AlertCircle size={14} />
              {errors.type}
            </p>
          )}
          <RadioGroup
            id={FIELD_IDS.type}
            name="appointment-type"
            value={values.type}
            onValueChange={(v) => update('type', v)}
            aria-required="true"
            aria-invalid={errors.type ? true : undefined}
          >
            {APPOINTMENT_TYPES.map((t) => (
              <Radio key={t.value} value={t.value} label={t.label} description={t.description} />
            ))}
          </RadioGroup>
        </fieldset>

        <Field label="Full name" required error={errors.name}>
          <Input
            id={FIELD_IDS.name}
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </Field>

        <Field label="Email address" required error={errors.email} hint="We'll send your confirmed time here.">
          <Input
            id={FIELD_IDS.email}
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </Field>

        <Field label="Preferred date" required error={errors.date} hint="Monday to Saturday. We'll offer the nearest free time.">
          <Input
            id={FIELD_IDS.date}
            name="date"
            type="date"
            min={todayIso()}
            value={values.date}
            onChange={(e) => update('date', e.target.value)}
          />
        </Field>

        <div className="actions">
          <Button type="submit" variant="primary" size="lg" loading={sending}>
            {sending ? 'Sending request…' : 'Send request'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Confirmation({ sent, onReset }: { sent: Sent; onReset: () => void }) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => headingRef.current?.focus(), []);
  const type = APPOINTMENT_TYPES.find((t) => t.value === sent.type)!;
  const firstName = sent.name.split(/\s+/)[0];

  return (
    <section className="form-column" aria-labelledby="sent-title">
      <h1 ref={headingRef} id="sent-title" tabIndex={-1} className="sent-title">
        <Icons.CircleCheck size={26} aria-hidden="true" /> Request sent
      </h1>
      <Card settle>
        <CardHeader>
          <CardTitle aria-level={2}>Your request</CardTitle>
          <CardDescription>
            Thanks, {firstName}. We'll email {sent.email} within one working day to confirm a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="summary">
            <dt>Reference</dt>
            <dd className="mono">{sent.reference}</dd>
            <dt>Appointment</dt>
            <dd>{type.label}</dd>
            <dt>Name</dt>
            <dd>{sent.name}</dd>
            <dt>Preferred date</dt>
            <dd>{formatDate(sent.date)}</dd>
          </dl>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" onClick={onReset}>
            Make another request
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
