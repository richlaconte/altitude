import * as React from 'react';
import { useIsoLayoutEffect } from './core';
export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string };
export type UndoResult = { ok: true } | { ok: false; error: string };
export type ConsequentialPhase = 'idle' | 'confirming' | 'pending' | 'failed' | 'succeeded' | 'undoing' | 'undone';
interface ActionBase<T> {
  /** Render target and consequence alongside the trigger and in any confirmation. */
  target: string;
  consequence: string;
  execute: () => ActionResult<T> | Promise<ActionResult<T>>;
  /** Connected, visible next logical destination when the original trigger disappears. */
  focusFallback?: () => HTMLElement | null;
  messages?: Partial<{ pending: string; succeeded: string; failed: string; undoing: string; undone: string }>;
}
export type ConsequentialActionOptions<T> = ActionBase<T> & (
  { requiresConfirmation: true; undo?: (result: T) => UndoResult | Promise<UndoResult> } |
  { requiresConfirmation: false; undo: (result: T) => UndoResult | Promise<UndoResult> }
);
const focusable = (element: HTMLElement | null | undefined): element is HTMLElement => !!element?.isConnected &&
  !element.closest('[inert]') && !element.matches(':disabled,[aria-disabled="true"]') && element.getClientRects().length > 0 &&
  getComputedStyle(element).visibility !== 'hidden';
/** Confirmation records intent; only execute success records completion. Undo is offered only with an application-supplied inverse.
 * Compose Dialog/Alert/Button with the returned content and states. See altitude-design/guidance/patterns/consequential-action.md. */
export function useConsequentialAction<T>(options: ConsequentialActionOptions<T>) {
  const [state, setState] = React.useState({ phase: 'idle' as ConsequentialPhase, error: '', status: '', result: undefined as T | undefined });
  const current = React.useRef(state), mounted = React.useRef(false), trigger = React.useRef<HTMLElement | null>(null);
  const active = React.useRef(options);
  const returnFocus = React.useRef(false);
  const failedOperation = React.useRef<'execute' | 'undo'>('execute');
  const messages = { pending: 'Completing action', succeeded: 'Action completed', failed: 'We couldn’t complete the action. Try again.',
    undoing: 'Undoing action', undone: 'Action undone', ...options.messages };
  useIsoLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const publish = (patch: Partial<typeof state>) => { current.current = { ...current.current, ...patch }; if (mounted.current) setState(current.current); };
  const restoreFocus = () => {
    // Don't steal focus when the person deliberately moved elsewhere during a pending operation.
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused !== trigger.current && !focused.closest('[role="dialog"],[role="alertdialog"]')) return;
    const target = focusable(trigger.current) ? trigger.current : active.current.focusFallback?.();
    if (focusable(target)) target.focus();
  };
  const execute = async () => {
    if (!mounted.current || !['idle', 'confirming', 'failed', 'undone'].includes(current.current.phase)) return;
    failedOperation.current = 'execute'; publish({ phase: 'pending', error: '', status: messages.pending });
    let result: ActionResult<T>;
    try { result = await active.current.execute(); } catch { result = { ok: false, error: messages.failed }; }
    if (!mounted.current) return;
    if (!result || typeof result !== 'object' || (result.ok === true ? !('value' in result) : result.ok !== false || !result.error || typeof result.error !== 'string')) result = { ok: false, error: messages.failed };
    if (!result.ok) publish({ phase: 'failed', error: result.error, status: result.error });
    else { returnFocus.current = true; publish({ phase: 'succeeded', result: result.value, status: messages.succeeded }); }
  };
  const undo = async () => {
    if (!active.current.undo || !mounted.current || !(current.current.phase === 'succeeded' || (current.current.phase === 'failed' && failedOperation.current === 'undo'))) return;
    failedOperation.current = 'undo'; publish({ phase: 'undoing', error: '', status: messages.undoing });
    let result: UndoResult;
    try { result = await active.current.undo!(current.current.result as T); } catch { result = { ok: false, error: messages.failed }; }
    if (!mounted.current) return;
    if (!result || typeof result !== 'object' || (result.ok !== true && (result.ok !== false || typeof result.error !== 'string' || !result.error))) result = { ok: false, error: messages.failed };
    if (!result.ok) publish({ phase: 'failed', error: result.error, status: result.error });
    else { returnFocus.current = true; publish({ phase: 'undone', status: messages.undone }); }
  };
  useIsoLayoutEffect(() => { if (returnFocus.current) { returnFocus.current = false; restoreFocus(); } }, [state.phase]);
  const content = state.phase === 'idle' || state.phase === 'undone' ? options : active.current;
  return { ...state, target: content.target, consequence: content.consequence,
    canUndo: !!active.current.undo && (state.phase === 'succeeded' || (state.phase === 'failed' && failedOperation.current === 'undo')),
    request: () => {
      if (!['idle', 'undone'].includes(current.current.phase)) return;
      active.current = options;
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (options.requiresConfirmation) publish({ phase: 'confirming', error: '', status: '' }); else void execute();
    },
    confirm: () => { if (current.current.phase === 'confirming') void execute(); },
    cancel: () => { if (current.current.phase === 'confirming' || (current.current.phase === 'failed' && failedOperation.current === 'execute')) {
      returnFocus.current = true; publish({ phase: 'idle', error: '', status: '' });
    } },
    retry: () => { if (current.current.phase === 'failed') return failedOperation.current === 'undo' ? undo() : execute(); },
    undo: active.current.undo ? undo : undefined };
}
