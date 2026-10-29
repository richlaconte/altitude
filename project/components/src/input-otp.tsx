import * as React from 'react';
import { cx, useControllable, useKeyFocus } from './core';

/* ───────────────────────── InputOTP ───────────────────────── */

type OTPCtxT = { chars: string[]; active: number; mask: boolean; invalid?: boolean; disabled?: boolean };
const OTPCtx = React.createContext<OTPCtxT | null>(null);

const PATTERNS = { digits: /^\d$/, alphanumeric: /^[a-zA-Z0-9]$/ };

export interface InputOTPProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'pattern' | 'children'> {
  /** How many characters the code has. */
  maxLength: number;
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  /** Called when the last character lands, and again whenever a full code changes. */
  onComplete?: (code: string) => void;
  /** Which characters it takes. Default 'digits'. Anything else typed or pasted is dropped. */
  pattern?: 'digits' | 'alphanumeric' | RegExp;
  /** Show • instead of the characters. */
  mask?: boolean;
  invalid?: boolean;
  /** The code is being checked: aria-busy, and nothing more can be typed. */
  verifying?: boolean;
  /** InputOTPGroup, InputOTPSlot and InputOTPSeparator. Default: one group of maxLength slots. */
  children?: React.ReactNode;
  className?: string;
}
/**
 * A one-time code as a row of openings that fill. One real input (inputmode numeric, autocomplete one-time-code) drives
 * the slots, so autofill, paste and screen readers see one field; each slot is a well whose floor rises flush as its
 * character lands, and a rejected code drops the whole row to a trench.
 */
export const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(function InputOTP(
  { maxLength, value, defaultValue = '', onChange, onComplete, pattern = 'digits', mask = false, invalid, verifying, disabled, className, children,
    onKeyUp, onSelect, onFocus, onBlur, 'aria-describedby': describedBy, ...rest }, ref) {
  useKeyFocus();
  const [code, setCode] = useControllable(value, defaultValue, onChange);
  const [caret, setCaret] = React.useState(code.length);
  const [focused, setFocused] = React.useState(false);
  const [burst, setBurst] = React.useState(false);
  const input = React.useRef<HTMLInputElement | null>(null);
  const hintId = React.useId();
  const test = typeof pattern === 'string' ? PATTERNS[pattern] : pattern;

  const readCaret = () => { const el = input.current; if (el) setCaret(Math.min(el.selectionStart ?? el.value.length, maxLength - 1)); };
  const change = (raw: string) => {
    const next = [...raw].filter((c) => test.test(c)).join('').slice(0, maxLength);
    // Several characters at once (a paste or an autofill) fill left to right, staggered.
    if (next.length - code.length > 1) { setBurst(true); window.setTimeout(() => setBurst(false), 500); }
    setCode(next);
    if (next.length === maxLength && next !== code) onComplete?.(next);
  };
  React.useEffect(() => { readCaret(); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const chars = Array.from({ length: maxLength }, (_, i) => code[i] ?? '');
  const ctx: OTPCtxT = { chars, active: focused ? Math.min(caret, maxLength - 1) : -1, mask, invalid, disabled };
  return (
    <OTPCtx.Provider value={ctx}>
      <div className={cx('alt-otp', className)} data-burst={burst ? '' : undefined} data-invalid={invalid ? '' : undefined} data-disabled={disabled ? '' : undefined} aria-busy={verifying || undefined}>
        <input ref={(el) => { input.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; }}
          className="alt-otp-input" type={mask ? 'password' : 'text'} inputMode={pattern === 'digits' ? 'numeric' : 'text'} autoComplete="one-time-code"
          maxLength={maxLength} spellCheck={false} disabled={disabled} readOnly={verifying} aria-invalid={invalid || undefined}
          aria-describedby={[describedBy, hintId].filter(Boolean).join(' ')} value={code} {...rest}
          onChange={(e) => change(e.target.value)}
          onFocus={(e) => { setFocused(true); const el = e.currentTarget; requestAnimationFrame(() => { el.setSelectionRange(el.value.length, el.value.length); readCaret(); }); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          onSelect={(e) => { readCaret(); onSelect?.(e); }} onKeyUp={(e) => { readCaret(); onKeyUp?.(e); }} />
        <span id={hintId} className="alt-sr">{maxLength} {pattern === 'digits' ? 'digits' : 'characters'}</span>
        {children ?? <InputOTPGroup>{chars.map((_, i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>}
      </div>
    </OTPCtx.Provider>
  );
});

/** Slots that sit together, parted from the next group by an InputOTPSeparator. */
export function InputOTPGroup({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('alt-otp-group', className)} aria-hidden="true" {...rest} />;
}

/** One character's opening: a well whose floor rises flush when its character lands. */
export function InputOTPSlot({ index, className }: { index: number; className?: string }) {
  const c = React.useContext(OTPCtx)!;
  const ch = c.chars[index];
  const active = c.active === index;
  return (
    <div className={cx('alt-input', 'alt-otp-slot', className)} data-filled={ch ? '' : undefined} data-active={active ? '' : undefined}
      data-invalid={c.invalid ? '' : undefined} data-disabled={c.disabled ? '' : undefined} style={{ ['--i' as any]: index }}>
      <span className="alt-otp-char">{ch ? (c.mask ? '•' : ch) : ''}</span>
      {active && !ch && <span className="alt-otp-caret" />}
    </div>
  );
}

/** A decorative dash between groups. */
export function InputOTPSeparator({ className }: { className?: string }) {
  return <span className={cx('alt-otp-sep', className)} aria-hidden="true" />;
}
