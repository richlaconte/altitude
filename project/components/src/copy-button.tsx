import * as React from 'react';
import { cssMs, cx, Icons } from './core';
import { Button, ButtonProps } from './controls';
import { Tooltip } from './overlays';

/* ───────────────────────── CopyButton ───────────────────────── */

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** The Clipboard API where it's allowed; otherwise a selected, hidden textarea and the copy command. */
async function writeText(text: string) {
  if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return; }
  const area = document.createElement('textarea');
  area.value = text; area.setAttribute('readonly', ''); area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  const focused = document.activeElement as HTMLElement | null;
  document.body.append(area); area.select();
  const ok = document.execCommand('copy');
  area.remove(); focused?.focus();
  if (!ok) throw new Error('Copy command failed');
}

export interface CopyButtonProps extends Omit<ButtonProps, 'value' | 'onCopy' | 'onError' | 'square' | 'loading' | 'leading'> {
  /** What's copied, or a function that returns it (it may return a promise). */
  value: string | (() => string | Promise<string>);
  /** The button's name: its aria-label and Tooltip when it's icon-only, and kept as its name while it says "Copied". Default "Copy". */
  label?: string;
  /** Shown for dur-linger once copied. Default "Copied". */
  copiedLabel?: string;
  /** Shown for dur-linger when copying fails. Default "Couldn't copy". */
  failedLabel?: string;
  onCopy?: (value: string) => void;
  onError?: (error: unknown) => void;
}
/**
 * Copies a value and says so in words: pressed to the ground with a check and "Copied" for dur-linger, announced
 * politely while the button keeps its name. No rise and no afterglow: nothing new arrived on the page.
 */
export const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  { value, label = 'Copy', copiedLabel = 'Copied', failedLabel = "Couldn't copy", onCopy, onError, variant = 'ghost', className, children, onClick, ...rest }, ref) {
  const [state, setState] = React.useState<'idle' | 'copied' | 'failed'>('idle');
  const [said, setSaid] = React.useState('');
  const timer = React.useRef<number | undefined>(undefined);
  const self = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const iconOnly = children == null;

  const settle = (next: 'copied' | 'failed', words: string) => {
    setState(next);
    // Cleared first, so saying the same thing twice in a row is announced twice.
    setSaid(''); requestAnimationFrame(() => setSaid(words));
    window.clearTimeout(timer.current);
    const linger = cssMs(self.current ? getComputedStyle(self.current) : null, '--dur-linger', 2000);
    timer.current = window.setTimeout(() => { setState('idle'); setSaid(''); }, linger);
  };
  const copy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    try {
      const text = typeof value === 'function' ? await value() : value;
      await writeText(text);
      settle('copied', copiedLabel);
      onCopy?.(text);
    } catch (err) {
      settle('failed', `${failedLabel}. Select the text and press ${isMac() ? '⌘C' : 'Ctrl+C'}.`);
      onError?.(err);
    }
  };

  const icon = (
    <span className="alt-copy-icons" aria-hidden="true">
      <Icons.Copy data-shown={state === 'idle' ? '' : undefined} />
      <Icons.Check data-shown={state === 'copied' ? '' : undefined} />
      <Icons.AlertCircle data-shown={state === 'failed' ? '' : undefined} />
    </span>
  );
  // Every label shares one cell, so saying "Copied" never changes the button's width (as HoldButton, #116).
  const words = !iconOnly && (
    <span className="alt-copy-words">
      {([['idle', children], ['copied', copiedLabel], ['failed', failedLabel]] as const).map(([k, l]) =>
        <span key={k} data-shown={k === state ? '' : undefined} aria-hidden={k === 'idle' ? undefined : true}>{l}</span>)}
    </span>
  );
  const button = (
    <Button {...rest} ref={(el) => { self.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; }}
      variant={variant} square={iconOnly} className={cx('alt-copy', className)} data-copy={state}
      aria-label={iconOnly ? label : rest['aria-label']} leading={icon} onClick={copy}>{words}</Button>
  );
  return <>
    {iconOnly ? <Tooltip content={label}>{button}</Tooltip> : button}
    <span className="alt-sr" role="status" aria-live="polite">{said}</span>
  </>;
});
