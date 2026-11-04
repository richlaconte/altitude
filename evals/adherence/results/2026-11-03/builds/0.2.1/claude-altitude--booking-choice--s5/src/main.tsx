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
import './styles.css';

const CLINIC = {
  name: 'Harbourside Dental',
  address: '14 Quay Street, Suite 2',
  phone: '(03) 9412 6650',
  hours: 'Mon–Fri 8:00–18:00, Sat 9:00–13:00',
};

const TYPES = [
  { value: 'checkup', label: 'Check-up', description: 'Exam with Dr. Priya Raman, 30 minutes' },
  { value: 'hygiene', label: 'Hygiene', description: 'Scale and polish with a hygienist, 45 minutes' },
  { value: 'problem', label: 'A problem tooth', description: 'Pain, a chip or a lost filling. We hold same-week slots for these.' },
] as const;

type FieldName = 'type' | 'name' | 'email' | 'date';
type Values = { type: string; name: string; email: string; date: string };
type Errors = Partial<Record<FieldName, string>>;

const ORDER: FieldName[] = ['type', 'name', 'email', 'date'];
const IDS: Record<FieldName, string> = { type: 'appt-type', name: 'appt-name', email: 'appt-email', date: 'appt-date' };

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.type) e.type = 'Choose an appointment type';
  if (!v.name.trim()) e.name = 'Enter your full name';
  if (!v.email.trim()) e.email = 'Enter your email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'Enter an email address like name@example.com';
  if (!v.date) e.date = 'Enter a preferred date';
  else if (v.date < todayISO()) e.date = 'Choose a date from today onwards';
  return e;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function focusField(field: FieldName) {
  const el =
    field === 'type'
      ? document.querySelector<HTMLInputElement>(`#${IDS.type} input:checked`) ??
        document.querySelector<HTMLInputElement>(`#${IDS.type} input[type="radio"]`)
      : document.getElementById(IDS[field]);
  if (!el) return;
  (field === 'type' ? document.getElementById(IDS.type) : el)?.scrollIntoView({ block: 'center' });
  el.focus({ preventScroll: true });
}

function App() {
  const [values, setValues] = React.useState<Values>({ type: '', name: '', email: '', date: '' });
  const [errors, setErrors] = React.useState<Errors>({});
  const [sent, setSent] = React.useState<Values | null>(null);
  const submitted = React.useRef(false);

  const set = (field: FieldName) => (value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    // After a failed send, clear each error as soon as it's fixed (but don't add new ones mid-typing).
    if (submitted.current && errors[field] && !validate(next)[field]) {
      setErrors(({ [field]: _, ...rest }) => rest);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitted.current = true;
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => document.getElementById('error-summary')?.focus());
      return;
    }
    setSent({ ...values, name: values.name.trim(), email: values.email.trim() });
  };

  const errorList = ORDER.filter((f) => errors[f]);
  const typeLabel = (v: string) => TYPES.find((t) => t.value === v)?.label ?? v;

  if (sent) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle>Request sent</CardTitle>
            <CardDescription>
              Thanks, {sent.name.split(' ')[0]}. We'll email {sent.email} within one working day to confirm a time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="summary">
              <dt>Appointment</dt>
              <dd>{typeLabel(sent.type)}</dd>
              <dt>Name</dt>
              <dd>{sent.name}</dd>
              <dt>Email</dt>
              <dd>{sent.email}</dd>
              <dt>Preferred date</dt>
              <dd>{formatDate(sent.date)}</dd>
            </dl>
          </CardContent>
          <CardFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setSent(null);
                setValues({ type: '', name: '', email: '', date: '' });
                setErrors({});
                submitted.current = false;
              }}
            >
              Make another request
            </Button>
          </CardFooter>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <CardHeader>
          <CardTitle>Request an appointment</CardTitle>
          <CardDescription>Tell us what you need and when suits you. We'll reply by email to confirm a time.</CardDescription>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={onSubmit} className="form">
            {errorList.length > 0 && (
              <Alert
                id="error-summary"
                tabIndex={-1}
                tone="critical"
                role="group"
                aria-labelledby="error-summary-title"
                className="error-summary"
                title={
                  <span id="error-summary-title">
                    {errorList.length === 1
                      ? 'There is a problem with your request'
                      : `There are ${errorList.length} problems with your request`}
                  </span>
                }
              >
                <ul>
                  {errorList.map((f) => (
                    <li key={f}>
                      <a
                        href={`#${IDS[f]}`}
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
            )}

            <fieldset className="type-fieldset">
              <legend id="appt-type-label" className="alt-field-label">
                Appointment type<span className="alt-field-req" aria-hidden="true"> *</span>
              </legend>
              {errors.type && (
                <p className="alt-field-error" id="appt-type-error">
                  <Icons.AlertCircle size={14} />
                  {errors.type}
                </p>
              )}
              <RadioGroup
                id={IDS.type}
                name="type"
                value={values.type}
                onValueChange={set('type')}
                aria-labelledby="appt-type-label"
                aria-required="true"
                aria-invalid={errors.type ? true : undefined}
                aria-describedby={errors.type ? 'appt-type-error' : undefined}
                className={errors.type ? 'type-group invalid' : 'type-group'}
              >
                {TYPES.map((t) => (
                  <Radio key={t.value} value={t.value} label={t.label} description={t.description} />
                ))}
              </RadioGroup>
            </fieldset>

            <Field label="Full name" required error={errors.name}>
              <Input
                id={IDS.name}
                name="name"
                autoComplete="name"
                placeholder="Maria Okafor"
                value={values.name}
                onChange={(e) => set('name')(e.target.value)}
              />
            </Field>

            <Field label="Email" required hint="We'll send your confirmation here." error={errors.email}>
              <Input
                id={IDS.email}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                placeholder="maria.okafor@example.com"
                value={values.email}
                onChange={(e) => set('email')(e.target.value)}
              />
            </Field>

            <Field label="Preferred date" required hint="We'll offer the closest available time." error={errors.date}>
              <Input
                id={IDS.date}
                name="date"
                type="date"
                min={todayISO()}
                value={values.date}
                onChange={(e) => set('date')(e.target.value)}
              />
            </Field>

            <div className="actions">
              <Button type="submit" variant="primary">
                Send request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="page">
      <header className="clinic">
        <p className="clinic-name">{CLINIC.name}</p>
        <p className="clinic-meta">
          {CLINIC.address} · <a href="tel:+61394126650">{CLINIC.phone}</a> · {CLINIC.hours}
        </p>
      </header>
      {children}
      <p className="footnote">
        In severe pain or with facial swelling? Call us on <a href="tel:+61394126650">{CLINIC.phone}</a> instead of
        sending a request.
      </p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
