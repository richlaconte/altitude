import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
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
import 'altitude-design/altitude.css';
import './app.css';

const CLINIC = {
  name: 'Harbourside Dental Practice',
  address: '14 Quay Street, Bristol BS1 4DB',
  phone: '0117 496 0382',
  hours: 'Mon–Fri 8:00–18:00 · Sat 9:00–13:00',
};

type AppointmentType = 'checkup' | 'hygiene' | 'problem';

const TYPES: { value: AppointmentType; label: string; description: string }[] = [
  { value: 'checkup', label: 'Check-up', description: 'Routine examination with a dentist, about 20 minutes.' },
  { value: 'hygiene', label: 'Hygiene', description: 'Scale and polish with our hygienist, about 30 minutes.' },
  { value: 'problem', label: 'Problem tooth', description: 'Pain, swelling, a chip or a lost filling. We prioritise these.' },
];

type Values = { type: AppointmentType | ''; name: string; email: string; date: string };
type FieldKey = keyof Values;
type Errors = Partial<Record<FieldKey, string>>;

// Order matches the order of fields on the page, so the summary reads top to bottom.
const FIELD_ORDER: FieldKey[] = ['type', 'name', 'email', 'date'];
const FIELD_IDS: Record<FieldKey, string> = { type: 'appt-type', name: 'appt-name', email: 'appt-email', date: 'appt-date' };

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDate(d);
};
const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.type) e.type = 'Choose an appointment type';

  if (!v.name.trim()) e.name = 'Enter your full name';

  const email = v.email.trim();
  if (!email) e.email = 'Enter your email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter an email address in the right format, like name@example.com';

  if (!v.date) e.date = 'Enter a preferred date';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || Number.isNaN(new Date(`${v.date}T12:00:00`).getTime()))
    e.date = 'Enter a real date';
  else if (v.date < tomorrow()) e.date = 'Preferred date must be tomorrow or later';
  else if (new Date(`${v.date}T12:00:00`).getDay() === 0) e.date = 'We are closed on Sundays. Choose Monday to Saturday';

  return e;
}

function focusField(key: FieldKey) {
  if (key === 'type') {
    const group = document.getElementById(FIELD_IDS.type);
    const radio = group?.querySelector<HTMLInputElement>('input[type="radio"]:checked') ?? group?.querySelector<HTMLInputElement>('input[type="radio"]');
    group?.scrollIntoView({ block: 'center' });
    radio?.focus({ preventScroll: true });
    return;
  }
  const el = document.getElementById(FIELD_IDS[key]);
  el?.scrollIntoView({ block: 'center' });
  el?.focus({ preventScroll: true });
}

function ErrorSummary({ errors }: { errors: Errors }) {
  const keys = FIELD_ORDER.filter((k) => errors[k]);
  const n = keys.length;
  return (
    <Alert
      id="error-summary"
      tone="critical"
      // Focus is moved here on submit, which announces it; role="alert" on top would announce it twice.
      role={undefined}
      tabIndex={-1}
      aria-labelledby="error-summary-title"
      className="error-summary"
      title={<span id="error-summary-title">{n === 1 ? 'There is a problem with your request' : `There are ${n} problems with your request`}</span>}
    >
      <ul className="error-summary-list">
        {keys.map((k) => (
          <li key={k}>
            <a
              href={`#${FIELD_IDS[k]}`}
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
  );
}

function AppointmentForm({ onSent }: { onSent: (v: Values) => void }) {
  const [values, setValues] = React.useState<Values>({ type: '', name: '', email: '', date: '' });
  const [errors, setErrors] = React.useState<Errors>({});
  const [attempt, setAttempt] = React.useState(0);
  const [sending, setSending] = React.useState(false);
  const hasErrors = Object.keys(errors).length > 0;

  const set = <K extends FieldKey>(key: K) => (val: Values[K]) => setValues((p) => ({ ...p, [key]: val }));

  // After each failed send, move focus to the summary so keyboard and screen reader users land on it.
  React.useEffect(() => {
    if (attempt > 0 && hasErrors) {
      const el = document.getElementById('error-summary');
      el?.scrollIntoView({ block: 'start' });
      el?.focus({ preventScroll: true });
    }
  }, [attempt]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setAttempt((a) => a + 1);
    if (Object.keys(found).length) return;
    // No backend: simulate the request briefly.
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      onSent({ ...values, name: values.name.trim(), email: values.email.trim() });
    }, 700);
  };

  return (
    <form noValidate onSubmit={submit} className="appt-form">
      {hasErrors && <ErrorSummary errors={errors} />}

      <div
        className="type-group"
        data-invalid={errors.type ? '' : undefined}
      >
        <span className="alt-field-label" id="appt-type-label">
          Appointment type<span className="alt-field-req" aria-hidden="true"> *</span>
        </span>
        <RadioGroup
          id={FIELD_IDS.type}
          name="type"
          value={values.type}
          onValueChange={(v) => set('type')(v as AppointmentType)}
          aria-labelledby="appt-type-label"
          aria-describedby={errors.type ? 'appt-type-error' : undefined}
          aria-required="true"
          aria-invalid={errors.type ? true : undefined}
        >
          {TYPES.map((t) => (
            <Radio key={t.value} value={t.value} label={t.label} description={t.description} />
          ))}
        </RadioGroup>
        {errors.type && (
          <p className="alt-field-error" id="appt-type-error">
            <Icons.AlertCircle size={14} />
            {errors.type}
          </p>
        )}
      </div>

      <Field label="Full name" required error={errors.name}>
        <Input
          id={FIELD_IDS.name}
          name="name"
          autoComplete="name"
          placeholder="e.g. Priya Raman"
          value={values.name}
          onChange={(e) => set('name')(e.target.value)}
        />
      </Field>

      <Field label="Email address" required hint="We'll email you to confirm a time." error={errors.email}>
        <Input
          id={FIELD_IDS.email}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="e.g. priya.raman@example.com"
          value={values.email}
          onChange={(e) => set('email')(e.target.value)}
        />
      </Field>

      <Field label="Preferred date" required hint="Monday to Saturday. We'll offer the nearest free slot." error={errors.date}>
        <Input
          id={FIELD_IDS.date}
          name="date"
          type="date"
          min={tomorrow()}
          value={values.date}
          onChange={(e) => set('date')(e.target.value)}
        />
      </Field>

      <div className="appt-actions">
        <Button type="submit" variant="primary" loading={sending} disabled={sending}>
          {sending ? 'Sending request…' : 'Send request'}
        </Button>
      </div>
    </form>
  );
}

function Confirmation({ values, onReset }: { values: Values; onReset: () => void }) {
  const type = TYPES.find((t) => t.value === values.type)!;
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => ref.current?.focus(), []);
  return (
    <div className="appt-done">
      <Alert tone="positive" title={<span ref={ref} tabIndex={-1}>Request sent</span>}>
        Thanks, {values.name.split(/\s+/)[0]}. We'll email <strong>{values.email}</strong> within one working day to confirm a time.
      </Alert>
      <dl className="appt-summary">
        <dt>Appointment</dt>
        <dd>{type.label}</dd>
        <dt>Name</dt>
        <dd>{values.name}</dd>
        <dt>Email</dt>
        <dd>{values.email}</dd>
        <dt>Preferred date</dt>
        <dd>{formatDate(values.date)}</dd>
      </dl>
      <Button variant="secondary" onClick={onReset}>
        Request another appointment
      </Button>
    </div>
  );
}

function App() {
  const [sent, setSent] = React.useState<Values | null>(null);
  return (
    <main className="page">
      <header className="clinic">
        <p className="clinic-name">{CLINIC.name}</p>
        <p className="clinic-meta">
          {CLINIC.address} · {CLINIC.phone}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Request an appointment</CardTitle>
          <CardDescription>
            Tell us what you need and when suits you. Fields marked * are required. In severe pain or swelling out of hours? Call NHS 111.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? <Confirmation values={sent} onReset={() => setSent(null)} /> : <AppointmentForm onSent={setSent} />}
        </CardContent>
        <CardFooter>
          <span className="clinic-meta">Opening hours: {CLINIC.hours}</span>
        </CardFooter>
      </Card>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <App />
  </AltitudeProvider>,
);
