import * as React from 'react';
import { cx, Icons, useApproach, useKeyFocus } from './core';
import { Button, Checkbox, HoldButton } from './controls';
import { CopyButton } from './copy-button';
import { Toggle } from './toggle';

/* ───────────────────────── SecretField ───────────────────────── */

export interface SecretFieldProps {
  /** What the secret is ("Secret key"). It names the field. */
  label: string;
  /** The word used in the buttons and the warning: "Copy key", "Show key", "Revoke key". Default "key". */
  noun?: string;
  /** A secret just created: shown in full, once. */
  value?: string;
  /** With value: the secret is shown only now. It stays an opening until onAcknowledge, then masks. */
  once?: boolean;
  /** Called when the person confirms they've saved the secret. Gate closing on it. */
  onAcknowledge?: () => void;
  /** The confirmation's words. Default "I've saved this {noun}". */
  acknowledgeLabel?: string;
  /** The warning while the secret is new. Default "You won't see this {noun} again. Store it somewhere safe." */
  warning?: React.ReactNode;
  /** A stored secret: the part shown before the mask ("sk_live_"). */
  prefix?: string;
  /** A stored secret: its last characters ("4f2a"). */
  maskedTail?: string;
  /** A stored secret that may be shown again: returns it (it may be a promise). Without it there's no reveal. */
  onReveal?: () => string | Promise<string>;
  onRotate?: () => void;
  /** Revoking is held, not clicked (HoldButton). */
  onRevoke?: () => void;
  className?: string;
}
/**
 * A key or token: shown once when created, masked afterwards. A new secret is an opening, something to take away: a
 * sunk well with copy beside it and a warning, until you say you've saved it; then it fills flush and masks. A stored
 * secret is settled: flush, masked to its tail, with reveal (if allowed), rotate and a held revoke.
 */
export function SecretField({ label, noun = 'key', value, once, onAcknowledge, acknowledgeLabel, warning, prefix = '', maskedTail, onReveal, onRotate, onRevoke, className }: SecretFieldProps) {
  useApproach();
  useKeyFocus();
  const id = React.useId();
  const [saved, setSaved] = React.useState(false);
  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const fresh = !!(once && value && !saved);
  const tail = maskedTail ?? value?.slice(-4) ?? '';
  // A new secret's own prefix ("sk_live_") stays readable once it's masked.
  const head = prefix || value?.match(/^[a-z]+(?:_[a-z]+)*_/i)?.[0] || '';
  // The confirmation leaves when it's checked, so focus moves to the words that replace it.
  const savedNote = React.useRef<HTMLParagraphElement>(null);
  React.useEffect(() => { if (saved) savedNote.current?.focus(); }, [saved]);
  const full = fresh ? value! : revealed;

  const reveal = async (on: boolean) => {
    if (!on) { setRevealed(null); return; }
    if (!onReveal) return;
    setLoading(true);
    try { setRevealed(await onReveal()); } finally { setLoading(false); }
  };

  return (
    <div className={cx('alt-secret', className)} role="group" aria-labelledby={`${id}-l`}>
      <span id={`${id}-l`} className="alt-field-label">{label}</span>
      <div className="alt-secret-row">
        <div className="alt-input alt-secret-field" data-approach="56" data-open={fresh ? '' : undefined} data-filled={fresh ? undefined : ''}>
          {full != null
            ? <input className="alt-secret-value" readOnly aria-readonly="true" value={full} aria-labelledby={`${id}-l`} aria-describedby={fresh ? `${id}-w` : undefined}
                spellCheck={false} onFocus={(e) => e.currentTarget.select()} />
            : <span className="alt-secret-value" data-masked="">
                <span aria-hidden="true">{head}<span className="alt-secret-dots">••••</span>{tail}</span>
                <span className="alt-sr">{label}, ending in {tail}</span>
              </span>}
        </div>
        {full != null && <CopyButton variant={fresh ? 'secondary' : 'ghost'} value={full} label={`Copy ${noun}`}>{fresh ? `Copy ${noun}` : undefined}</CopyButton>}
        {!fresh && onReveal && <Toggle square aria-label={`Show ${noun}`} pressed={revealed != null} onPressedChange={reveal} loading={loading}>
          {revealed != null ? <Icons.EyeOff /> : <Icons.Eye />}</Toggle>}
      </div>
      {fresh && <>
        <p id={`${id}-w`} className="alt-secret-warning"><Icons.AlertTriangle size={14} />{warning ?? `You won't see this ${noun} again. Store it somewhere safe.`}</p>
        <Checkbox label={acknowledgeLabel ?? `I've saved this ${noun}`} checked={false} onCheckedChange={(c) => { if (c) { setSaved(true); onAcknowledge?.(); } }} />
      </>}
      {once && saved && <p ref={savedNote} tabIndex={-1} className="alt-field-hint alt-secret-saved" role="status">Saved. Only its last four characters are shown from now on.</p>}
      {!fresh && (onRotate || onRevoke) && (
        <div className="alt-secret-actions">
          {onRotate && <Button size="sm" variant="secondary" onClick={onRotate}>Rotate {noun}</Button>}
          {onRevoke && <HoldButton size="sm" onConfirm={onRevoke} holdingLabel="Keep holding…" doneLabel={`${noun[0].toUpperCase()}${noun.slice(1)} revoked`}>Hold to revoke {noun}</HoldButton>}
        </div>
      )}
    </div>
  );
}
