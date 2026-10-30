import * as React from 'react';

/** What a turn is doing. 'interrupted' is an unfinished answer found after a reload; 'awaiting-input' is a Confirmation or Question open. */
export type AssistantTurnState = 'ready' | 'submitted' | 'streaming' | 'complete' | 'stopped' | 'failed' | 'interrupted' | 'awaiting-input';
export type AssistantErrorKind = 'offline' | 'rate-limited' | 'context-full' | 'refused' | 'outage' | 'unknown';
/** Throw this from `stream` to say what went wrong; anything else is 'unknown' (or 'offline' when the browser is offline). */
export class AssistantError extends Error {
  kind: AssistantErrorKind;
  /** For 'rate-limited': when it can be tried again. */
  retryAt?: Date | number;
  constructor(kind: AssistantErrorKind, message?: string, retryAt?: Date | number) { super(message ?? kind); this.kind = kind; this.retryAt = retryAt; }
}
export interface AssistantTurnError { kind: AssistantErrorKind; retryAt?: Date | number; message?: string }

export interface AssistantTurnOptions<I> {
  /** Starts the answer: yield text as it arrives; resolve when the stream says it's complete. Abort on `signal`. */
  stream: (input: I, signal: AbortSignal) => AsyncIterable<string>;
  /** An answer restored after a reload. If it wasn't complete it's 'interrupted', never shown as complete. */
  restored?: { input: I; text: string; complete: boolean };
  locale?: string;
}
export interface AssistantTurn<I> {
  state: AssistantTurnState;
  /** The answer so far: kept when stopped, failed or interrupted. */
  text: string;
  /** What was sent, kept until it's answered: put it back in the composer when sending fails. */
  input: I | undefined;
  error: AssistantTurnError | null;
  /** The error in words, with what to do: "You've reached this hour's limit. Try again at 3:40 PM." */
  errorText: string;
  /** Map onto the components. */
  promptStatus: 'ready' | 'submitted' | 'streaming' | 'error';
  messageStatus: 'streaming' | 'complete' | 'stopped' | 'error' | undefined;
  /** Sends unless a turn is already in flight (a double Enter sends once). Returns whether it started. */
  submit: (input: I) => boolean;
  stop: () => void;
  /** Sends the last input again (after a failure, a stop or an interruption). */
  retry: () => boolean;
  /** A Confirmation or Question is open (true) or answered (false): the turn waits for the person. */
  awaitInput: (waiting: boolean) => void;
}

const classify = (e: unknown): AssistantTurnError => {
  if (e instanceof AssistantError) return { kind: e.kind, retryAt: e.retryAt, message: e.message };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { kind: 'offline' };
  return { kind: 'unknown', message: e instanceof Error ? e.message : undefined };
};
/** Each error kind in words, with what to do. */
export function assistantErrorText(error: AssistantTurnError | null, locale?: string): string {
  if (!error) return '';
  switch (error.kind) {
    case 'offline': return "We can't reach the assistant. Your message is kept; try again when you're back online.";
    case 'rate-limited': {
      const at = error.retryAt !== undefined ? new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(error.retryAt)) : null;
      return `You've reached this hour's limit.${at ? ` Try again at ${at}.` : ' Try again later.'}`;
    }
    case 'context-full': return 'This conversation is too long to continue. Start a new one with a summary.';
    case 'refused': return error.message && error.message !== 'refused' ? error.message : "The assistant can't help with that request.";
    case 'outage': return 'The assistant is unavailable right now. Your message is kept; try again in a few minutes.';
    default: return "The answer couldn't finish. Your message is kept; try again.";
  }
}

/**
 * The assistant-conversation contract's turn (project/framework/patterns/assistant-conversation.md, #285): a send that
 * can't happen twice, a stream whose late events from a superseded turn are ignored, Stop that keeps the partial
 * answer, completion only when the stream says so, an unfinished answer after a reload shown as interrupted, and each
 * error kind in words. Map `promptStatus` to PromptInput and `messageStatus` to the answer's Message.
 */
export function useAssistantTurn<I>({ stream, restored, locale }: AssistantTurnOptions<I>): AssistantTurn<I> {
  const [state, setState] = React.useState<AssistantTurnState>(restored ? (restored.complete ? 'complete' : 'interrupted') : 'ready');
  const [text, setText] = React.useState(restored?.text ?? '');
  const [input, setInput] = React.useState<I | undefined>(restored?.input);
  const [error, setError] = React.useState<AssistantTurnError | null>(null);
  const turn = React.useRef(0), abort = React.useRef<AbortController | null>(null), live = React.useRef(state);
  const opts = React.useRef(stream); opts.current = stream;
  const set = (s: AssistantTurnState) => { live.current = s; setState(s); };
  React.useEffect(() => () => { abort.current?.abort(); turn.current++; }, []);
  const run = (value: I) => {
    // A turn in flight, or waiting on the person, can't be sent over.
    if (live.current === 'submitted' || live.current === 'streaming' || live.current === 'awaiting-input') return false;
    const id = ++turn.current;
    abort.current?.abort();
    const ac = new AbortController(); abort.current = ac;
    setInput(value); setText(''); setError(null); set('submitted');
    (async () => {
      try {
        let acc = '';
        for await (const chunk of opts.current(value, ac.signal)) {
          if (id !== turn.current || ac.signal.aborted) return; // superseded or stopped: drop it
          acc += chunk; setText(acc);
          if (live.current === 'submitted') set('streaming');
        }
        if (id !== turn.current || ac.signal.aborted) return;
        set('complete');
      } catch (e) {
        if (id !== turn.current || ac.signal.aborted) return;
        setError(classify(e)); set('failed');
      }
    })();
    return true;
  };
  const stop = () => {
    if (live.current !== 'submitted' && live.current !== 'streaming') return;
    turn.current++; abort.current?.abort(); set('stopped');
  };
  const awaitInput = (waiting: boolean) => {
    if (waiting && (live.current === 'streaming' || live.current === 'submitted')) set('awaiting-input');
    else if (!waiting && live.current === 'awaiting-input') set('streaming');
  };
  const busy = state === 'submitted' || state === 'streaming' || state === 'awaiting-input';
  return {
    state, text, input, error, errorText: assistantErrorText(error, locale),
    promptStatus: state === 'submitted' ? 'submitted' : busy ? 'streaming' : state === 'failed' ? 'error' : 'ready',
    messageStatus: state === 'streaming' || state === 'awaiting-input' || state === 'submitted' ? 'streaming' : state === 'complete' ? 'complete' : state === 'stopped' ? 'stopped' : state === 'failed' || state === 'interrupted' ? 'error' : undefined,
    submit: run, stop, retry: () => (input !== undefined ? run(input) : false), awaitInput,
  };
}
