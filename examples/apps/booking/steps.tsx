// The three steps that collect answers: the treatment, the time, and who's coming. Each renders its own fields from the
// draft and the errors the flow hands it; the flow owns moving between them.
import * as React from 'react';
import { Button, Checkbox, DatePicker, Field, Input, InputOTP, Radio, RadioGroup, Textarea, TimeSlot, TimeSlotPicker } from 'altitude-design';
import { DemoResource, errorMessage, isDemoError, useDemoQuery } from '../shared/react';
import { ADDON, CODE_MINUTES, TREATMENTS, clock, closed, dayName, firstOpen, lastBookable, masked, money, service } from './data';
import type { Hold, Slot } from './data';

export interface Draft {
  service: string; addon: boolean; date: string | null; time: string; hold: Hold | null;
  name: string; email: string; phone: string; notes: string; token: string | null;
}
export type Errors = Partial<Record<keyof Draft, string>>;
export interface StepProps { draft: Draft; errors: Errors; set: <K extends keyof Draft>(key: K, value: Draft[K]) => void }

/** Where each answer lives on the page, for the error summary's links and for focus after a correction. */
export const FIELD_ID: Record<string, string> = {
  service: 'bk-service', addon: 'bk-addon', date: 'bk-date', time: 'bk-time', name: 'bk-name', email: 'bk-email', phone: 'bk-phone', token: 'bk-code', notes: 'bk-notes',
};
export const FIELD_LABEL: Record<string, string> = {
  service: 'Treatment', date: 'Day', time: 'Time', name: 'Full name', email: 'Email', phone: 'Mobile number', token: 'Text code',
};

const Alarm = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
  </svg>
);

export function ServiceStep({ draft, errors, set }: StepProps) {
  return (
    <div className="bk-fields">
      <Field className="bk-choices" label="Treatment" error={errors.service}>
        <RadioGroup id={FIELD_ID.service} value={draft.service} onValueChange={(v) => set('service', v)}>
          {TREATMENTS.map((t) => (
            <Radio key={t.id} value={t.id} label={<span className="bk-choice"><span>{t.name}</span><span className="bk-price">{money(t.price)}</span></span>}
              description={`${t.minutes} minutes. ${t.about}`} />
          ))}
        </RadioGroup>
      </Field>
      <Checkbox id={FIELD_ID.addon} checked={draft.addon} onCheckedChange={(v) => set('addon', v)}
        label={`Add a ${ADDON.name.toLowerCase()} (${money(ADDON.price)})`} description="Posted to you after the appointment. Your physio emails the same plan for free." />
    </div>
  );
}

export function TimeStep({ draft, errors, set }: StepProps) {
  return (
    <div className="bk-fields">
      <Field label="Day" hint="We’re open Monday to Saturday, up to four weeks ahead." error={errors.date}>
        <DatePicker id={FIELD_ID.date} value={draft.date} min={firstOpen()} max={lastBookable()} isUnavailable={closed} locale="en-IE"
          onValueChange={(d) => { set('date', d); set('time', ''); }} />
      </Field>
      {draft.date ? <Slots date={draft.date} value={draft.time} error={errors.time} onValueChange={(t) => set('time', t)} />
        : <p className="bk-quiet">Choose a day to see its times.</p>}
    </div>
  );
}

function Slots({ date, value, error, onValueChange }: { date: string; value: string; error?: string; onValueChange: (t: string) => void }) {
  const q = useDemoQuery<unknown, Slot[]>(service, 'slots.list', { date });
  return (
    <DemoResource query={q} noun={`the times on ${dayName(date)}`}>
      {(slots) => slots.some((s) => s.free) ? (
        <Field label={`Times on ${dayName(date)}`} error={error}>
          <TimeSlotPicker id={FIELD_ID.time} value={value} onValueChange={onValueChange} locale="en-GB">
            {slots.map((s) => <TimeSlot key={s.time} value={s.time} booked={!s.free && s.time !== value} />)}
          </TimeSlotPicker>
        </Field>
      ) : <p className="bk-quiet" id={FIELD_ID.time} tabIndex={-1}>Every time on {dayName(date)} is booked. Choose another day.</p>}
    </DemoResource>
  );
}

interface Sent { to: string; until: number; text: string }

export function DetailsStep({ draft, errors, set, phoneError, onPhoneError }: StepProps & { phoneError?: string; onPhoneError: (e?: string) => void }) {
  const [sent, setSent] = React.useState<Sent | null>(null);
  const [sending, setSending] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);
  const [codeError, setCodeError] = React.useState('');
  const codeInput = React.useRef<HTMLInputElement>(null);
  // Focus goes to the code once its field is on the page: after a code is sent, and after a code is refused.
  const [focusCode, setFocusCode] = React.useState(0);
  React.useEffect(() => { if (focusCode) codeInput.current?.focus(); }, [focusCode]);

  const send = async () => {
    setSending(true); setCodeError(''); onPhoneError(undefined);
    try {
      const r = await service.request<Sent>('code.send', { phone: draft.phone });
      setSent(r); setCode(''); setFocusCode((n) => n + 1);
    } catch (e) {
      if (isDemoError(e, 'invalid') && e.field === 'phone') onPhoneError(e.message);
      else setCodeError(errorMessage(e));
    } finally { setSending(false); }
  };
  const verify = async (value: string) => {
    setVerifying(true); setCodeError('');
    try {
      const r = await service.request<{ token: string }>('code.verify', { phone: draft.phone, code: value });
      set('token', r.token); setSent(null);
    } catch (e) {
      setCodeError(isDemoError(e, 'lost-response') ? 'The connection dropped while we checked the code. Send a new one.' : errorMessage(e));
      setCode(''); setFocusCode((n) => n + 1);
    } finally { setVerifying(false); }
  };

  return (
    <div className="bk-fields">
      <Field label="Full name" error={errors.name}>
        <Input id={FIELD_ID.name} autoComplete="name" value={draft.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Email" hint="Your receipt and any changes to the appointment go here." error={errors.email}>
        <Input id={FIELD_ID.email} type="email" inputMode="email" autoComplete="email" spellCheck={false} value={draft.email} onChange={(e) => set('email', e.target.value)} />
      </Field>
      <Field label="Mobile number" hint="We text a code to check it, and a reminder the day before." error={phoneError ?? errors.phone}>
        <Input id={FIELD_ID.phone} type="tel" inputMode="tel" autoComplete="tel" value={draft.phone}
          onChange={(e) => { set('phone', e.target.value); if (draft.token) set('token', null); setSent(null); onPhoneError(undefined); }} />
      </Field>
      {draft.token ? (
        <p className="bk-verified" id={FIELD_ID.token} tabIndex={-1} role="status"><span aria-hidden="true">✓</span> {masked(draft.phone)} is verified.</p>
      ) : sent ? (
        <div className="bk-code">
          <p className="bk-message" aria-label="Simulated text message">
            <span className="bk-message-from">Text message to {sent.to} (simulated)</span>
            Your Kinetic Physio code is <strong>{sent.text}</strong>. It works for {CODE_MINUTES} minutes.
          </p>
          <Field label="Code from the text message" hint={`Sent to ${sent.to}. It works until ${clock(sent.until)}.`} error={codeError || errors.token}>
            <InputOTP ref={codeInput} id={FIELD_ID.token} maxLength={6} value={code} onChange={setCode} onComplete={(v) => void verify(v)} verifying={verifying} />
          </Field>
          <div><Button size="sm" variant="ghost" loading={sending} onClick={() => void send()}>Send a new code</Button></div>
        </div>
      ) : (
        <div className="bk-code">
          <Button id={FIELD_ID.token} loading={sending} aria-describedby={codeError || errors.token ? 'bk-code-error' : undefined} onClick={() => void send()}>Text me a code</Button>
          {(codeError || errors.token) && <p className="alt-field-error" id="bk-code-error" role="alert"><Alarm />{codeError || errors.token}</p>}
        </div>
      )}
      <Field label="Anything your physio should know (optional)">
        <Textarea id={FIELD_ID.notes} rows={3} maxLength={400} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </div>
  );
}
