import * as React from 'react';
import { cx, Icons } from './core';
import { Input, InputProps } from './controls';
import { Meter } from './meter';
import { Toggle } from './toggle';

/* ───────────────────────── PasswordInput ───────────────────────── */

export interface PasswordRequirement {
  label: string;
  test: (value: string) => boolean;
}
export interface PasswordInputProps extends Omit<InputProps, 'type' | 'trailing'> {
  /** Scores a password from 0 (weakest) to 4 (strongest); your app supplies the scoring (zxcvbn, your rules). Shown as a Meter. */
  strength?: (value: string) => number;
  /** The word for each score, 0 to 4. Default "Very weak", "Weak", "Fair", "Good", "Strong". */
  strengthLabels?: [string, string, string, string, string];
  /** Rules shown under the field, each stamped as met or not as the password changes. */
  requirements?: PasswordRequirement[];
  /** The reveal toggle's name. It never changes with its state. Default "Show password". */
  revealLabel?: string;
}
const WORDS: [string, string, string, string, string] = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

/**
 * A password field: an Input with a reveal Toggle in its end cap, a caps-lock notice, and, when creating one, its
 * strength as a reading (a Meter, never a Progress) and its requirements stamped as met. Strength and requirements
 * describe the field and are announced politely once typing pauses.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { strength, strengthLabels = WORDS, requirements, revealLabel = 'Show password', autoComplete, value, defaultValue, onChange, onKeyDown, onKeyUp, onBlur,
    'aria-describedby': describedBy, className, disabled, ...rest }, ref) {
  const [shown, setShown] = React.useState(false);
  const [text, setText] = React.useState(String(value ?? defaultValue ?? ''));
  React.useEffect(() => { if (value !== undefined) setText(String(value)); }, [value]);
  const [caps, setCaps] = React.useState(false);
  const [said, setSaid] = React.useState('');
  const id = React.useId();
  const creating = !!(strength || requirements);

  const score = strength && text ? Math.max(0, Math.min(4, Math.round(strength(text)))) : undefined;
  const word = score === undefined ? undefined : strengthLabels[score];
  const met = requirements?.map((r) => r.test(text)) ?? [];
  // Strength and requirements are announced once typing pauses, not on every key.
  React.useEffect(() => {
    if (!creating || !text) { setSaid(''); return; }
    const t = window.setTimeout(() => {
      const missing = requirements?.filter((_, i) => !met[i]).map((r) => r.label) ?? [];
      setSaid([word && `Strength: ${word}.`, requirements && (missing.length ? `Not met: ${missing.join(', ')}.` : 'All requirements met.')].filter(Boolean).join(' '));
    }, 900);
    return () => window.clearTimeout(t);
  }, [text, word, met.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const capsCheck = (e: React.KeyboardEvent) => setCaps(e.getModifierState?.('CapsLock') ?? false);
  const ids = [describedBy, caps && `${id}-caps`, strength && `${id}-strength`, requirements && `${id}-reqs`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('alt-pw', className)}>
      <Input ref={ref} {...rest} disabled={disabled} type={shown ? 'text' : 'password'} autoComplete={autoComplete ?? (creating ? 'new-password' : 'current-password')}
        spellCheck={false} autoCapitalize="none" value={value} defaultValue={defaultValue} aria-describedby={ids}
        onChange={(e) => { setText(e.target.value); onChange?.(e); }}
        onKeyDown={(e) => { capsCheck(e); onKeyDown?.(e); }} onKeyUp={(e) => { capsCheck(e); onKeyUp?.(e); }}
        onBlur={(e) => { setCaps(false); onBlur?.(e); }}
        trailing={<Toggle size="sm" square className="alt-pw-reveal" aria-label={revealLabel} pressed={shown} onPressedChange={setShown} disabled={disabled}>
          {shown ? <Icons.EyeOff /> : <Icons.Eye />}</Toggle>} />
      <p id={`${id}-caps`} className="alt-pw-caps" role="status" hidden={!caps}>{caps && <><Icons.AlertTriangle size={14} />Caps Lock is on</>}</p>
      {strength && (
        <div id={`${id}-strength`} className="alt-pw-strength">
          <Meter label={<>Strength<span className="alt-pw-word" aria-hidden="true">{word ?? '—'}</span></>} value={score ?? 0} min={0} max={4} hideValue
            aria-valuetext={word ?? 'Not entered'} />
        </div>
      )}
      {requirements && (
        <ul id={`${id}-reqs`} className="alt-pw-reqs" aria-label="Requirements">
          {requirements.map((r, i) => (
            <li key={r.label} data-met={met[i] ? '' : undefined}>
              <span className="alt-pw-stamp" aria-hidden="true">{met[i] ? <Icons.Check size={12} /> : null}</span>
              {r.label}<span className="alt-sr">{met[i] ? ', met' : ', not met'}</span>
            </li>
          ))}
        </ul>
      )}
      <span className="alt-sr" aria-live="polite">{said}</span>
    </div>
  );
});
