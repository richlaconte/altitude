import * as React from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  Icons,
  Input,
  Radio,
  RadioGroup,
} from 'altitude-design';

/* ---------- Sample data (there is no backend) ---------- */

const CLINIC = {
  name: 'Larkfield Dental Care',
  address: '27 Mill Lane, Larkfield, ME20 6HT',
  phone: '01632 960 418',
  hours: 'Mon–Fri 8:00–18:00 · Sat 9:00–13:00 · closed Sunday',
};

const APPOINTMENT_TYPES = [
  { value: 'checkup', label: 'Check-up', description: 'An examination of your teeth and gums with a dentist. About 20 minutes.' },
  { value: 'hygiene', label: 'Hygiene', description: 'A scale and polish with our hygienist. About 30 minutes.' },
  { value: 'problem', label: 'A problem tooth', description: 'Pain, a chip, a lost filling or crown. We’ll offer the earliest slot we have.' },
] as const;

type AppointmentType = (typeof APPOINTMENT_TYPES)[number]['value'] | '';

interface Values {
  type: AppointmentType;
  name: string;
  email: string;
  date: string; // yyyy-mm-dd
}

type FieldKey = keyof Values;
type Errors = Partial<Record<FieldKey, string>>;

/** The order fields appear on the page, and so the order of the error summary. */
const FIELD_ORDER: FieldKey[] = ['type', 'name', 'email', 'date'];

const FIELD_IDS: Record<FieldKey, string> = {
  type: 'appointment-type',
  name: 'patient-name',
  email: 'patient-email',
  date: 'preferred-date',
};

const EMPTY: Values = { type: '', name: '', email: '', date: '' };

/* ---------- Dates ---------- */

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function parseIso(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLong(s: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseIso(s));
}

const today = new Date();
const MIN_DATE = isoDate(addDays(today, 1));
const MAX_DATE = isoDate(addDays(today, 90));

/* ---------- Validation ---------- */

function validate(v: Values): Errors {
  const e: Errors = {};

  if (!v.type) e.type = 'Choose the type of appointment you need';

  if (!v.name.trim()) e.name = 'Enter your full name';

  const email = v.email.trim();
  if (!email) e.email = 'Enter your email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter an email address in the right format, like sam.patel@example.com';

  if (!v.date) e.date = 'Enter a preferred date';
  else if (v.date < MIN_DATE) e.date = 'Preferred date must be tomorrow or later';
  else if (v.date > MAX_DATE) e.date = `Preferred date must be on or before ${formatLong(MAX_DATE)}`;
  else if (parseIso(v.date).getDay() === 0) e.date = 'We’re closed on Sundays. Choose a date from Monday to Saturday';

  return e;
}

/* ---------- Field shells ---------- */

/**
 * Altitude's Field gives each error role="alert". With an error summary that takes focus on send, that would announce
 * every message twice, so these shells reuse Field's classes and wiring but leave the messages unannounced: the
 * summary is what gets read, and each control is described by its own message.
 */
function FieldMessages({ id, hint, error }: { id: string; hint?: React.ReactNode; error?: string }) {
  return (
    <>
      {hint && <p className="alt-field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && (
        <p className="alt-field-error" id={`${id}-error`}>
          <Icons.AlertCircle size={14} />
          <span><span className="visually-hidden">Error: </span>{error}</span>
        </p>
      )}
    </>
  );
}

function describedBy(id: string, hint?: React.ReactNode, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
}

interface TextFieldProps extends Omit<React.ComponentProps<typeof Input>, 'id' | 'value' | 'onChange'> {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  value: string;
  onValueChange: (v: string) => void;
}

function TextField({ id, label, hint, error, value, onValueChange, ...input }: TextFieldProps) {
  return (
    <div className="alt-field">
      <label className="alt-field-label" htmlFor={id}>
        {label}
        <span className="alt-field-req" aria-hidden="true"> *</span>
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        invalid={!!error}
        required
        aria-describedby={describedBy(id, hint, error)}
        {...input}
      />
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

/* ---------- The form ---------- */

interface Sent {
  reference: string;
  values: Values;
}

export function AppointmentRequest() {
  const [values, setValues] = React.useState<Values>(EMPTY);
  // Errors stay hidden until the first send; after that they follow what's typed, so fixed fields clear.
  const [attempted, setAttempted] = React.useState(false);
  const [sendCount, setSendCount] = React.useState(0);
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState<Sent | null>(null);

  const summaryRef = React.useRef<HTMLDivElement>(null);
  const confirmRef = React.useRef<HTMLHeadingElement>(null);
  const typeGroupRef = React.useRef<HTMLDivElement>(null);

  const errors = attempted ? validate(values) : {};
  const errorList = FIELD_ORDER.filter((k) => errors[k]);

  const set = <K extends FieldKey>(key: K) => (v: Values[K]) => setValues((prev) => ({ ...prev, [key]: v }));

  // Move focus to the summary after each failed send, so it's read out and the links are next in tab order.
  React.useEffect(() => {
    if (sendCount > 0) summaryRef.current?.focus();
  }, [sendCount]);

  React.useEffect(() => {
    if (sent) confirmRef.current?.focus();
  }, [sent]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setAttempted(true);
    if (Object.keys(validate(values)).length > 0) {
      setSendCount((n) => n + 1);
      return;
    }
    setSending(true);
    // Simulated request: no backend.
    window.setTimeout(() => {
      setSending(false);
      setSent({ reference: `LDC-${Math.floor(100000 + Math.random() * 900000)}`, values });
    }, 900);
  }

  function focusField(key: FieldKey, e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    let target: HTMLElement | null;
    if (key === 'type') {
      const group = typeGroupRef.current;
      target = group?.querySelector<HTMLInputElement>('input:checked') ?? group?.querySelector<HTMLInputElement>('input[type="radio"]') ?? null;
    } else {
      target = document.getElementById(FIELD_IDS[key]);
    }
    if (!target) return;
    // Bring the label into view with the control, not just the control.
    (target.closest('.alt-field') ?? target).scrollIntoView({ block: 'center', behavior: 'smooth' });
    target.focus({ preventScroll: true });
  }

  function startOver() {
    setValues(EMPTY);
    setAttempted(false);
    setSendCount(0);
    setSent(null);
  }

  if (sent) {
    const type = APPOINTMENT_TYPES.find((t) => t.value === sent.values.type)!;
    return (
      <Card className="request-card">
        <CardHeader>
          <p className="eyebrow">{CLINIC.name}</p>
          <h1 ref={confirmRef} tabIndex={-1} className="alt-card-title page-title">Request sent</h1>
          <CardDescription>
            Thanks, {sent.values.name.trim().split(/\s+/)[0]}. We’ll email {sent.values.email.trim()} within one working day to offer a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="summary-list">
            <div><dt>Reference</dt><dd className="mono">{sent.reference}</dd></div>
            <div><dt>Appointment</dt><dd>{type.label}</dd></div>
            <div><dt>Name</dt><dd>{sent.values.name.trim()}</dd></div>
            <div><dt>Email</dt><dd>{sent.values.email.trim()}</dd></div>
            <div><dt>Preferred date</dt><dd>{formatLong(sent.values.date)}</dd></div>
          </dl>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" onClick={startOver}>Request another appointment</Button>
        </CardFooter>
      </Card>
    );
  }

  const typeError = errors.type;
  const typeLabelId = `${FIELD_IDS.type}-label`;

  return (
    <Card className="request-card">
      <CardHeader>
        <p className="eyebrow">{CLINIC.name}</p>
        <h1 className="alt-card-title page-title">Request an appointment</h1>
        <CardDescription>
          Tell us what you need and when suits you. We’ll email you within one working day to confirm a time. All fields are required.
        </CardDescription>
      </CardHeader>

      <form noValidate onSubmit={onSubmit}>
        <CardContent className="form-body">
          {errorList.length > 0 && (
            <div ref={summaryRef} tabIndex={-1} className="error-summary" aria-labelledby="error-summary-title">
              <Alert tone="critical" role={undefined}>
                <h2 id="error-summary-title" className="error-summary-title">
                  {errorList.length === 1 ? 'There is a problem' : `There are ${errorList.length} problems`}
                </h2>
                <ul className="error-summary-list">
                  {errorList.map((k) => (
                    <li key={k}>
                      <a href={`#${FIELD_IDS[k]}`} onClick={(e) => focusField(k, e)}>{errors[k]}</a>
                    </li>
                  ))}
                </ul>
              </Alert>
            </div>
          )}

          <div className="alt-field" id={FIELD_IDS.type} ref={typeGroupRef}>
            <span className="alt-field-label" id={typeLabelId}>
              Appointment type
              <span className="alt-field-req" aria-hidden="true"> *</span>
            </span>
            <RadioGroup
              name="appointmentType"
              value={values.type}
              onValueChange={(v) => set('type')(v as AppointmentType)}
              aria-labelledby={typeLabelId}
              aria-describedby={describedBy(FIELD_IDS.type, undefined, typeError)}
              aria-required="true"
              aria-invalid={typeError ? true : undefined}
              className={typeError ? 'type-group is-invalid' : 'type-group'}
            >
              {APPOINTMENT_TYPES.map((t) => (
                <Radio key={t.value} value={t.value} label={t.label} description={t.description} />
              ))}
            </RadioGroup>
            <FieldMessages id={FIELD_IDS.type} error={typeError} />
          </div>

          <TextField
            id={FIELD_IDS.name}
            label="Full name"
            name="name"
            autoComplete="name"
            placeholder="Sam Patel"
            value={values.name}
            onValueChange={set('name')}
            error={errors.name}
          />

          <TextField
            id={FIELD_IDS.email}
            label="Email address"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="sam.patel@example.com"
            hint="We’ll only use this to arrange your appointment."
            value={values.email}
            onValueChange={set('email')}
            error={errors.email}
          />

          <TextField
            id={FIELD_IDS.date}
            label="Preferred date"
            name="date"
            type="date"
            min={MIN_DATE}
            max={MAX_DATE}
            hint="Monday to Saturday, within the next 3 months. We’ll offer the nearest free slot."
            value={values.date}
            onValueChange={set('date')}
            error={errors.date}
            className="date-input"
          />
        </CardContent>

        <CardFooter className="form-footer">
          <p className="urgent-note">
            In severe pain or swelling? Call us on <a href={`tel:${CLINIC.phone.replace(/\s/g, '')}`}>{CLINIC.phone}</a>.
          </p>
          <Button type="submit" variant="primary" loading={sending}>
            {sending ? 'Sending request' : 'Send request'}
          </Button>
        </CardFooter>
      </form>

      <p className="clinic-meta">
        {CLINIC.address}
        <br />
        {CLINIC.hours}
      </p>
    </Card>
  );
}
