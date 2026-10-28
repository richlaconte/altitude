import * as React from 'react';
import { useIsoLayoutEffect } from './core';
import { useEditRecord } from './pattern-edit-record';
import type { FieldErrors } from './pattern-edit-record';
export type ReviewSubmitResult<T, R> = { ok: true; receipt: R } | { ok: false; error: string; errors?: FieldErrors<T> };
export interface ReviewSubmitOptions<T extends object, R> {
  /** Supply any recovered draft here. Durable storage, step dependencies and cross-session resume are application responsibilities. */
  initialValue: T;
  validate: (draft: T) => FieldErrors<T>;
  submit: (draft: T) => ReviewSubmitResult<T, R> | Promise<ReviewSubmitResult<T, R>>;
  isEqual?: (a: T, b: T) => boolean;
  messages?: Partial<{ submitting: string; complete: string; failed: string; invalid: string }>;
}
/** Review/correct/submit composition with a persistent application-provided receipt. No automatic persistence or fabricated resume.
 * See altitude-design/guidance/patterns/review-submit.md. Mount a new workflow to start a distinct transaction after completion. */
export function useReviewSubmit<T extends object, R>(options: ReviewSubmitOptions<T, R>) {
  const [stage, setStage] = React.useState<'editing' | 'review' | 'submitting' | 'complete'>('editing');
  const [receipt, setReceipt] = React.useState<R>();
  const current = React.useRef(stage), mounted = React.useRef(false), accepted = React.useRef<R | undefined>(undefined);
  useIsoLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const messages = { submitting: 'Sending your answers', complete: 'Your answers were received', failed: 'We couldn’t send your answers. Try again.', invalid: 'Check the highlighted fields.', ...options.messages };
  const form = useEditRecord({ initialValue: options.initialValue, validate: options.validate, validationMode: 'submit', isEqual: options.isEqual,
    messages: { saving: messages.submitting, saved: messages.complete, failed: messages.failed, invalid: messages.invalid },
    save: async draft => {
      const result = await options.submit(draft);
      if (result?.ok === true && result.receipt !== undefined && result.receipt !== null) { accepted.current = result.receipt; return { ok: true, value: draft }; }
      if (result?.ok === false) return result;
      return { ok: false, error: messages.failed };
    } });
  const move = (next: typeof stage) => { current.current = next; if (mounted.current) setStage(next); };
  const editable = () => current.current === 'editing';
  return { draft: form.draft, errors: form.errors, error: form.error, status: form.status, submitCount: form.submitCount,
    dirty: form.dirty, phase: stage, receipt,
    setDraft: (value: T) => { if (editable()) form.setDraft(value); },
    setField: <K extends keyof T>(key: K, value: T[K]) => { if (editable()) form.setField(key, value); },
    review: () => { if (editable() && form.validateAll()) move('review'); },
    correct: () => { if (current.current === 'review') move('editing'); },
    submit: async () => {
      if (current.current !== 'review') return;
      move('submitting');
      const result = await form.submit();
      if (!mounted.current) return;
      if (result?.ok) { setReceipt(accepted.current); move('complete'); }
      else move('review');
    },
    requestLeave: form.requestLeave };
}
