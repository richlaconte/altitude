// Example: book a physiotherapy appointment (#403), designed phone first.
//   Task: a customer books and pays for an appointment on their phone.
//   Lead: the current step. Primary action: Continue, then Book and pay.
//   Next: the booking, with Add to calendar and Cancel booking side by side.
// Honesty: nothing that costs money starts chosen; the held time is a real hold and says when it ends; the total shows
// every charge before Book and pay, with the cancellation terms beside it at body size. Continue is never disabled: it
// says what's missing. Answers live in memory only, so a reload starts over.
import * as React from 'react';
import { Alert, Button, Dialog, ErrorSummary, Stepper, WorkflowStatus, useReviewSubmit } from 'altitude-design';
import { errorMessage, isDemoError, useDemoQuery, useDemoService } from '../shared/react';
import { ADDON, BOOKING_FEE, CARD, CLINIC, clock, dayName, firstOpen, money, phoneOk, refundFor, service, total, treatment } from './data';
import type { Booking, Hold } from './data';
import { DetailsStep, FIELD_ID, FIELD_LABEL, ServiceStep, TimeStep } from './steps';
import type { Draft, Errors } from './steps';

const STEPS = [{ title: 'Service' }, { title: 'Time' }, { title: 'Details' }, { title: 'Review' }];
const HEADINGS = ['Choose a treatment', 'Choose a time', 'Your details', 'Check and pay'];
const STEP_KEYS: (keyof Draft)[][] = [['service'], ['date', 'time'], ['name', 'email', 'phone', 'token']];
const START: Draft = { service: '', addon: false, date: firstOpen(), time: '', hold: null, name: '', email: '', phone: '', notes: '', token: null };

const validate = (d: Draft): Errors => {
  const e: Errors = {};
  if (!d.service) e.service = 'Choose a treatment.';
  if (!d.date) e.date = 'Choose a day.';
  if (!d.time) e.time = 'Choose a time.';
  if (!d.name.trim()) e.name = 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = d.email.trim() ? 'Enter an email address like name@example.com.' : 'Enter your email address.';
  if (!phoneOk(d.phone)) e.phone = d.phone.trim() ? 'Enter a mobile number with 9 to 15 digits.' : 'Enter your mobile number.';
  else if (!d.token) e.token = 'Check your number with the code we text you.';
  return e;
};
const pick = (e: Errors, keys: (keyof Draft)[]) => Object.fromEntries(keys.filter((k) => e[k]).map((k) => [k, e[k]])) as Errors;

export function App() {
  const { resetRevision } = useDemoService(service);
  const [run, setRun] = React.useState(0);
  return (
    <main className="bk-page">
      <header className="bk-head">
        <p className="bk-clinic">Kinetic Physio</p>
        <h1>Book an appointment</h1>
      </header>
      <Flow key={`${resetRevision}:${run}`} onAgain={() => setRun((n) => n + 1)} />
    </main>
  );
}

function Flow({ onAgain }: { onAgain: () => void }) {
  const requestId = React.useRef(`r${Math.random().toString(36).slice(2, 10)}`);
  const [stale, setStale] = React.useState(false);
  const form = useReviewSubmit<Draft, Booking>({
    initialValue: START,
    validate,
    messages: { submitting: 'Booking and paying…', complete: 'Booked.', failed: 'We couldn’t book the appointment. Nothing was charged. Try again.' },
    submit: async (d) => {
      const answers = { requestId: requestId.current, service: d.service, addon: d.addon, date: d.date!, time: d.time, name: d.name.trim(), email: d.email.trim(), phone: d.phone, hold: d.hold?.id, token: d.token };
      try {
        const r = await service.request<Booking | { declined: string }>('booking.create', answers);
        return 'declined' in r ? { ok: false, error: r.declined } : { ok: true, receipt: r };
      } catch (e) {
        if (isDemoError(e, 'lost-response')) {
          // The request key makes a retry safe, so ask whether this one landed before saying anything about money.
          try {
            const found = await service.request<Booking | null>('booking.find', { requestId: requestId.current });
            if (found) return { ok: true, receipt: found };
            return { ok: false, error: 'The connection dropped before the clinic answered. Nothing was booked or charged. Try again.' };
          } catch {
            return { ok: false, error: 'The connection dropped and we couldn’t check whether the booking went through. Trying again won’t book or charge twice.' };
          }
        }
        if (isDemoError(e, 'invalid') && e.field === 'time') setStale(true);
        return { ok: false, error: errorMessage(e) };
      }
    },
  });
  const [step, setStep] = React.useState(0);
  const [shown, setShown] = React.useState<(keyof Draft)[]>([]);
  const [attempt, setAttempt] = React.useState(0);
  const [returning, setReturning] = React.useState<keyof Draft | null>(null);
  const [holding, setHolding] = React.useState(false);
  const [stepError, setStepError] = React.useState('');
  const [phoneError, setPhoneError] = React.useState<string>();
  const heading = React.useRef<HTMLHeadingElement>(null);
  const failure = React.useRef<HTMLDivElement>(null);
  const d = form.draft;
  const reviewing = form.phase === 'review' || form.phase === 'submitting';

  // Errors appear for the fields Continue checked, and follow corrections from then on.
  const errors = { ...pick(validate(d), shown), ...(phoneError ? { phone: phoneError } : {}) } as Errors;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => form.setField(key, value);

  // Focus goes to each step's heading, and to the outcome when it replaces the flow.
  const where = `${form.phase === 'submitting' ? 'review' : form.phase}:${step}`;
  const last = React.useRef(where);
  React.useEffect(() => {
    if (last.current === where) return;
    last.current = where;
    if (returning && form.phase === 'review') { document.getElementById(`bk-change-${returning}`)?.focus(); setReturning(null); return; }
    heading.current?.focus();
  }, [where]); // eslint-disable-line react-hooks/exhaustive-deps
  // A refused booking says why, and takes focus so it's heard.
  React.useEffect(() => { if (form.phase === 'review' && form.error) failure.current?.focus(); }, [form.submitCount, form.phase, form.error]);

  const goTo = (n: number) => { setStepError(''); setShown([]); setStep(n); };
  const advance = () => {
    if (returning && Object.keys(validate(d)).length === 0) { form.review(); return; }
    if (step < 2) goTo(step + 1); else form.review();
  };
  const next = async () => {
    setStepError('');
    const missing = pick(validate(d), STEP_KEYS[step]);
    if (phoneError && step === 2) missing.phone = phoneError;
    if (Object.keys(missing).length) { setShown(STEP_KEYS[step]); setAttempt((n) => n + 1); return; }
    if (step === 1) {
      // Choosing a time holds it. A time that went while you looked is refused here, not at payment.
      setHolding(true);
      try { set('hold', await service.request<Hold>('slots.hold', { date: d.date, time: d.time })); setStale(false); }
      catch (e) {
        setHolding(false);
        if (isDemoError(e, 'invalid') && e.field === 'time') { set('time', ''); setShown(['time']); setStepError(e.message); }
        else setStepError(isDemoError(e, 'lost-response') ? 'The connection dropped before the clinic answered. Try again.' : errorMessage(e));
        return;
      }
      setHolding(false);
    }
    advance();
  };
  const change = (n: number, key: keyof Draft) => { form.correct(); setReturning(key); goTo(n); };
  const back = () => { if (reviewing) { form.correct(); goTo(2); } else goTo(step - 1); };

  if (form.phase === 'complete' && form.receipt) return <Booked booking={form.receipt} onAgain={onAgain} />;

  const summary = Object.entries(errors).map(([k, message]) => ({ id: FIELD_ID[k], label: FIELD_LABEL[k], message: message! }));
  const current = reviewing ? 3 : step;
  return (
    <div className="bk-layout">
      <div className="bk-flow">
        <Stepper steps={STEPS} current={current} orientation="auto" aria-label="Booking steps"
          onStepChange={form.phase === 'submitting' ? undefined : (n) => { if (reviewing) form.correct(); goTo(n); }} />
        <section className="bk-step" aria-labelledby="bk-step-title">
          <p className="bk-count">Step {current + 1} of 4</p>
          <h2 id="bk-step-title" ref={heading} tabIndex={-1}>{HEADINGS[current]}</h2>
          {reviewing ? (
            <Review draft={d} stale={stale} error={form.error} failure={failure} submitting={form.phase === 'submitting'}
              onChange={change} onBack={back} onSubmit={() => void form.submit()}
              onChooseAgain={() => { form.correct(); set('time', ''); set('hold', null); setStale(false); setReturning('time'); goTo(1); }} />
          ) : (
            <form noValidate onSubmit={(e) => { e.preventDefault(); void next(); }}>
              <ErrorSummary errors={summary} focusKey={attempt} title="Before you continue" />
              {stepError && <Alert tone="critical" title="That didn’t work">{stepError}</Alert>}
              {step === 0 && <ServiceStep draft={d} errors={errors} set={set} />}
              {step === 1 && <TimeStep draft={d} errors={errors} set={set} />}
              {step === 2 && <>
                {d.hold && <HoldNote hold={d.hold} />}
                <DetailsStep draft={d} errors={errors} set={set} phoneError={phoneError} onPhoneError={setPhoneError} />
              </>}
              <div className="bk-actions">
                {step > 0 && <Button type="button" onClick={back}>Back</Button>}
                <Button type="submit" variant="primary" loading={holding}>{returning ? 'Back to review' : 'Continue'}</Button>
              </div>
            </form>
          )}
        </section>
      </div>
      {/* The review lays out every answer and charge itself, so the summary steps aside for it. */}
      {!reviewing && <Summary draft={d} />}
      <WorkflowStatus>{form.status}</WorkflowStatus>
    </div>
  );
}

/** The hold, checked with the clinic rather than assumed: once it's gone, it stops saying it's held. */
function HoldNote({ hold }: { hold: Hold }) {
  const q = useDemoQuery<unknown, Hold | null>(service, 'hold.get', { id: hold.id });
  if (q.data === null) return <p className="bk-hold" data-tone="caution">{hold.time} on {dayName(hold.date)} is no longer held for you. You’ll choose another time before paying.</p>;
  return <p className="bk-hold">We’re holding {hold.time} on {dayName(hold.date)} for you until {clock(hold.until)}.</p>;
}

function Charges({ draft }: { draft: Draft }) {
  const t = treatment(draft.service);
  if (!t) return null;
  return (
    <dl className="bk-charges">
      <dt>{t.name}, {t.minutes} minutes</dt><dd>{money(t.price)}</dd>
      {draft.addon && <><dt>{ADDON.name}</dt><dd>{money(ADDON.price)}</dd></>}
      <dt>Online booking fee</dt><dd>{money(BOOKING_FEE)}</dd>
      <dt className="bk-total">Total, charged now</dt><dd className="bk-total">{money(total(draft.service, draft.addon))}</dd>
    </dl>
  );
}

function Review({ draft, stale, error, failure, submitting, onChange, onBack, onSubmit, onChooseAgain }: {
  draft: Draft; stale: boolean; error: string; failure: React.RefObject<HTMLDivElement | null>; submitting: boolean;
  onChange: (step: number, key: keyof Draft) => void; onBack: () => void; onSubmit: () => void; onChooseAgain: () => void;
}) {
  // The hold is checked as the review opens, and again whenever something changes elsewhere.
  const hold = useDemoQuery<unknown, Hold | null>(service, 'hold.get', { id: draft.hold?.id });
  const gone = stale || (hold.data === null && !hold.loading);
  const t = treatment(draft.service)!;
  const row = (label: string, value: React.ReactNode, step: number, key: keyof Draft, what: string) => (
    <div className="bk-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
      <dd className="bk-change"><Button id={`bk-change-${key}`} size="sm" variant="ghost" aria-label={`Change ${what}`} disabled={submitting} onClick={() => onChange(step, key)}>Change</Button></dd>
    </div>
  );
  return (
    <div className="bk-review">
      {gone ? (
        <div ref={failure} tabIndex={-1}>
          <Alert tone="critical" title={`${draft.time} is no longer available`}>
            {draft.time} on {dayName(draft.date!)} was booked by someone else while you were filling in your details. Nothing was charged. Your other answers are kept.
          </Alert>
        </div>
      ) : error ? (
        <div ref={failure} tabIndex={-1}><Alert tone="critical" title="Not booked yet">{error}</Alert></div>
      ) : draft.hold && <HoldNote hold={draft.hold} />}
      <dl className="bk-answers">
        {row('Treatment', `${t.name}, ${t.minutes} minutes`, 0, 'service', 'treatment')}
        {row('Exercise plan', draft.addon ? `Added, ${money(ADDON.price)}` : 'Not added', 0, 'addon', 'exercise plan')}
        {row('When', <>{dayName(draft.date!)} at {draft.time}<br />{CLINIC}</>, 1, 'time', 'day or time')}
        {row('Your details', <>{draft.name}<br />{draft.email}<br />{draft.phone} (verified)</>, 2, 'name', 'your details')}
        {draft.notes.trim() && row('For your physio', draft.notes, 2, 'notes', 'note for your physio')}
        <div className="bk-row"><dt>Payment</dt><dd>Saved card, {CARD}</dd></div>
      </dl>
      <Charges draft={draft} />
      <p className="bk-terms">
        Free to cancel until 24 hours before your appointment, with everything refunded. Later than that we keep half the
        treatment price ({money(Math.round(t.price / 2))}); the rest is refunded. Cancel from the confirmation page or the email.
      </p>
      <div className="bk-actions">
        <Button type="button" disabled={submitting} onClick={onBack}>Back</Button>
        {gone ? <Button variant="primary" onClick={onChooseAgain}>Choose another time</Button>
          : <Button variant="primary" loading={submitting} onClick={onSubmit}>Book and pay {money(total(draft.service, draft.addon))}</Button>}
      </div>
    </div>
  );
}

function Summary({ draft }: { draft: Draft }) {
  const t = treatment(draft.service);
  return (
    <aside className="bk-summary" aria-label="Your appointment so far">
      <h2 className="bk-summary-title">Your appointment</h2>
      {t ? <p>{t.name}, {t.minutes} minutes</p> : <p className="bk-quiet">No treatment chosen yet.</p>}
      {draft.hold ? <p>{dayName(draft.hold.date)} at {draft.hold.time}</p> : draft.time && draft.date ? <p>{dayName(draft.date)} at {draft.time} (not held yet)</p> : null}
      <p className="bk-quiet">{CLINIC}</p>
      <Charges draft={draft} />
    </aside>
  );
}

function ics(b: Booking) {
  const t = treatment(b.service)!;
  const stamp = (date: string, time: string, plus = 0) => {
    const d = new Date(`${date}T${time}`); d.setMinutes(d.getMinutes() + plus);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Altitude examples//Booking//EN', 'BEGIN:VEVENT', `UID:${b.ref}@example.invalid`,
    `DTSTAMP:${stamp(b.date, b.time)}`, `DTSTART:${stamp(b.date, b.time)}`, `DTEND:${stamp(b.date, b.time, t.minutes)}`,
    `SUMMARY:${t.name} at Kinetic Physio`, `LOCATION:${CLINIC.replace(/,/g, '\\,')}`, `DESCRIPTION:Booking ${b.ref}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

function Booked({ booking, onAgain }: { booking: Booking; onAgain: () => void }) {
  const [b, setB] = React.useState(booking);
  const [asking, setAsking] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [error, setError] = React.useState('');
  const [status, setStatus] = React.useState('');
  const heading = React.useRef<HTMLHeadingElement>(null);
  const t = treatment(b.service)!;
  const refund = refundFor(b);
  React.useEffect(() => { heading.current?.focus(); }, [b.status]);

  const cancel = async () => {
    setCancelling(true); setError(''); setStatus('Cancelling…');
    try { setB(await service.request<Booking>('booking.cancel', { ref: b.ref })); setAsking(false); setStatus('Booking cancelled.'); }
    catch (e) {
      let done: Booking | null = null;
      if (isDemoError(e, 'lost-response')) { try { done = await service.request<Booking | null>('booking.find', { requestId: b.requestId }); } catch { /* unknown */ } }
      if (done?.status === 'cancelled') { setB(done); setAsking(false); setStatus('Booking cancelled.'); }
      else { setError(isDemoError(e, 'lost-response') ? 'The connection dropped and we couldn’t confirm the cancellation. Try again: it won’t refund twice.' : errorMessage(e)); setStatus(''); }
    } finally { setCancelling(false); }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([ics(b)], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = url; a.download = `kinetic-physio-${b.ref}.ics`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Calendar file downloaded.');
  };

  if (b.status === 'cancelled') {
    return (
      <section className="bk-outcome" aria-labelledby="bk-outcome-title">
        <h2 id="bk-outcome-title" ref={heading} tabIndex={-1}>Booking cancelled</h2>
        <p>{t.name} on {dayName(b.date)} at {b.time} is cancelled. {money(b.refund ?? 0)} is on its way back to your {CARD}; it usually shows within five working days.</p>
        <p className="bk-quiet">Reference {b.ref}</p>
        <div className="bk-actions"><Button onClick={onAgain}>Book another appointment</Button></div>
        <WorkflowStatus>{status}</WorkflowStatus>
      </section>
    );
  }
  return (
    <section className="bk-outcome" aria-labelledby="bk-outcome-title">
      <h2 id="bk-outcome-title" ref={heading} tabIndex={-1}>You’re booked</h2>
      <dl className="bk-answers">
        <div className="bk-row"><dt>Treatment</dt><dd>{t.name}, {t.minutes} minutes{b.addon ? `, with a ${ADDON.name.toLowerCase()}` : ''}</dd></div>
        <div className="bk-row"><dt>When</dt><dd>{dayName(b.date)} at {b.time}<br />{CLINIC}</dd></div>
        <div className="bk-row"><dt>Paid</dt><dd>{money(b.total)} from your {CARD}</dd></div>
        <div className="bk-row"><dt>Reference</dt><dd>{b.ref}</dd></div>
      </dl>
      <p>A receipt is on its way to {b.email}, and we’ll text {b.phone} the day before.</p>
      <div className="bk-actions bk-actions-even">
        <Button onClick={download}>Add to calendar</Button>
        <Button onClick={() => { setError(''); setAsking(true); }}>Cancel booking</Button>
      </div>
      <Dialog open={asking} onOpenChange={(o) => { if (!o && !cancelling) setAsking(false); }} dismissible={!cancelling} title="Cancel this booking?"
        description={`${t.name} on ${dayName(b.date)} at ${b.time}.`}
        footer={<>
          <Button disabled={cancelling} onClick={() => setAsking(false)}>Keep booking</Button>
          <Button variant="danger" loading={cancelling} onClick={() => void cancel()}>Cancel booking</Button>
        </>}>
        <p>{refund === b.total ? `It’s more than 24 hours away, so all ${money(refund)} comes back to your ${CARD}.` : `It’s less than 24 hours away, so we keep half the treatment price and refund ${money(refund)} to your ${CARD}.`}</p>
        {error && <Alert tone="critical" title="Not cancelled">{error}</Alert>}
      </Dialog>
      <WorkflowStatus>{status}</WorkflowStatus>
    </section>
  );
}

