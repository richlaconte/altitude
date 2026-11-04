import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Icons,
  Input,
  Radio,
  RadioGroup,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';

const CLINIC = {
  name: 'Harbourside Dental Care',
  address: '14 Quay Street, Bristol BS1 4DB',
  phone: '0117 496 0382',
  hours: 'Mon–Fri 8:00–18:00, Sat 9:00–13:00',
};

const TYPES = [
  { value: 'checkup', label: 'Check-up', description: 'Routine examination with the dentist · 20 min' },
  { value: 'hygiene', label: 'Hygiene', description: 'Scale and polish with our hygienist · 30 min' },
  { value: 'problem', label: 'A problem tooth', description: 'Pain, a chip or a lost filling · 30 min' },
] as const;

type FieldKey = 'type' | 'name' | 'email' | 'date';
type Values = Record<FieldKey, string>;
type Errors = Partial<Record<FieldKey, string>>;

const ORDER: FieldKey[] = ['type', 'name', 'email', 'date'];
const IDS: Record<FieldKey, string> = {
  type: 'appointment-type',
  name: 'patient-name',
  email: 'patient-email',
  date: 'preferred-date',
};
const EMPTY: Values = { type: '', name: '', email: '', date: '' };

function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDate(d);
}

function validateField(key: FieldKey, v: Values): string | undefined {
  const value = v[key].trim();
  switch (key) {
    case 'type':
      return value ? undefined : 'Choose an appointment type';
    case 'name':
      return value ? undefined : 'Enter your full name';
    case 'email':
      if (!value) return 'Enter your email address';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? undefined
        : 'Enter an email address in the right format, like name@example.com';
    case 'date':
      if (!value) return 'Enter a preferred date';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter a real date';
      return value < tomorrow() ? 'Preferred date must be tomorrow or later' : undefined;
  }
}

function validate(v: Values): Errors {
  const errors: Errors = {};
  for (const key of ORDER) {
    const message = validateField(key, v);
    if (message) errors[key] = message;
  }
  return errors;
}

/** Moves focus to the field an error-summary link points at. Radios have no id, so the group's selected (or first) radio takes focus. */
function focusField(key: FieldKey) {
  const target = document.getElementById(IDS[key]);
  if (!target) return;
  const focusable =
    key === 'type'
      ? target.querySelector<HTMLInputElement>('input:checked') ?? target.querySelector<HTMLInputElement>('input')
      : (target as HTMLInputElement);
  target.closest('.field-block')?.scrollIntoView({ block: 'center' });
  focusable?.focus({ preventScroll: true });
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function ErrorSummary({ errors, summaryRef }: { errors: Errors; summaryRef: React.RefObject<HTMLDivElement | null> }) {
  const keys = ORDER.filter((k) => errors[k]);
  if (keys.length === 0) return null;
  return (
    <div ref={summaryRef} tabIndex={-1} className="error-summary" role="group" aria-labelledby="error-summary-title">
      <Alert tone="critical" role="presentation">
        <h2 id="error-summary-title" className="error-summary-title">
          {keys.length === 1 ? 'There is a problem' : `There are ${keys.length} problems`}
        </h2>
        <ul className="error-summary-list">
          {keys.map((k) => (
            <li key={k}>
              <a
                href={`#${IDS[k]}`}
                onClick={(e) => {
                  e.preventDefault();
                  focusField(k);
                }}
              >
                {errors[k]}
              </a>
            </li>
          ))}
        </ul>
      </Alert>
    </div>
  );
}

function Confirmation({ values, onReset }: { values: Values; onReset: () => void }) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => headingRef.current?.focus(), []);
  const type = TYPES.find((t) => t.value === values.type);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span ref={headingRef} tabIndex={-1} className="focus-target">
            Request sent
          </span>
        </CardTitle>
        <CardDescription>
          Thanks, {values.name.trim().split(/\s+/)[0]}. We'll email {values.email.trim()} within one working day to
          confirm a time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="summary-list">
          <div>
            <dt>Appointment</dt>
            <dd>{type?.label}</dd>
          </div>
          <div>
            <dt>Name</dt>
            <dd>{values.name.trim()}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{values.email.trim()}</dd>
          </div>
          <div>
            <dt>Preferred date</dt>
            <dd>{formatDate(values.date)}</dd>
          </div>
        </dl>
        <p className="muted">
          Reference HD-{values.date.replace(/-/g, '').slice(2)}-{String(values.name.length * 37 + 1042).slice(-4)}
        </p>
        <Button variant="secondary" onClick={onReset}>
          Make another request
        </Button>
      </CardContent>
    </Card>
  );
}

function AppointmentForm() {
  const [values, setValues] = React.useState<Values>(EMPTY);
  const [errors, setErrors] = React.useState<Errors>({});
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState<Values | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const summaryRef = React.useRef<HTMLDivElement>(null);

  // After each failed send, move focus to the summary so it is read out and the links are next in tab order.
  React.useEffect(() => {
    if (attempt > 0) {
      summaryRef.current?.scrollIntoView({ block: 'start' });
      summaryRef.current?.focus({ preventScroll: true });
    }
  }, [attempt]);

  const update = (key: FieldKey, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);
    // Clear an error as soon as it's fixed; new errors only appear when they press send.
    if (errors[key] && !validateField(key, next)) {
      setErrors(({ [key]: _, ...rest }) => rest);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setAttempt((n) => n + 1);
      return;
    }
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setSent(values);
    }, 900);
  };

  if (sent) {
    return (
      <Confirmation
        values={sent}
        onReset={() => {
          setSent(null);
          setValues(EMPTY);
          setErrors({});
          setAttempt(0);
        }}
      />
    );
  }

  const typeErrorId = 'appointment-type-error';

  return (
    <form noValidate onSubmit={onSubmit} className="form">
      <ErrorSummary errors={errors} summaryRef={summaryRef} />

      <fieldset className="field-block fieldset" aria-describedby={errors.type ? typeErrorId : undefined}>
        <legend className="legend">
          Appointment type<span className="req" aria-hidden="true"> *</span>
        </legend>
        <RadioGroup
          id={IDS.type}
          name="type"
          value={values.type}
          onValueChange={(v) => update('type', v)}
          aria-required="true"
          aria-invalid={errors.type ? true : undefined}
          className={errors.type ? 'radio-invalid' : undefined}
        >
          {TYPES.map((t) => (
            <Radio key={t.value} value={t.value} label={t.label} description={t.description} />
          ))}
        </RadioGroup>
        {errors.type && (
          <p className="alt-field-error" id={typeErrorId}>
            <Icons.AlertCircle size={14} />
            {errors.type}
          </p>
        )}
      </fieldset>

      <div className="field-block">
        <Field label="Full name" required error={errors.name}>
          <Input
            id={IDS.name}
            name="name"
            autoComplete="name"
            placeholder="Priya Shah"
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </Field>
      </div>

      <div className="field-block">
        <Field label="Email" required hint="We'll confirm your appointment time here." error={errors.email}>
          <Input
            id={IDS.email}
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="priya.shah@example.com"
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </Field>
      </div>

      <div className="field-block">
        <Field
          label="Preferred date"
          required
          hint="We'll offer the nearest available time. Closed Sundays."
          error={errors.date}
        >
          <Input
            id={IDS.date}
            name="date"
            type="date"
            min={tomorrow()}
            value={values.date}
            onChange={(e) => update('date', e.target.value)}
          />
        </Field>
      </div>

      <div className="actions">
        <Button type="submit" variant="primary" size="lg" loading={sending}>
          Send request
        </Button>
        <p className="muted">Fields marked * are required.</p>
      </div>
    </form>
  );
}

function App() {
  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">{CLINIC.name}</p>
        <h1>Request an appointment</h1>
        <p className="muted">
          Tell us what you need and when suits you. For severe pain or swelling, call us on{' '}
          <a href={`tel:${CLINIC.phone.replace(/\s/g, '')}`}>{CLINIC.phone}</a>.
        </p>
      </header>
      <AppointmentForm />
      <footer className="clinic-footer muted">
        <p>{CLINIC.address}</p>
        <p>{CLINIC.hours}</p>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <App />
  </AltitudeProvider>,
);
