import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Button, HoldButton } from './controls';
import { Dialog } from './overlays';
import { SplitButton } from './split-button';
import { RelativeTime } from './relative-time';

/* ───────────────────────── Confirmation ───────────────────────── */

export type ConfirmationState = 'requested' | 'approved' | 'running' | 'done' | 'failed' | 'rejected' | 'expired';
export interface ConfirmationProps {
  state: ConfirmationState;
  /** What's proposed ("Send campaign email"). */
  title: React.ReactNode;
  /** The concrete consequence, in words ("214 Pro customers will receive “October product update”."). */
  consequence: React.ReactNode;
  /** What exactly would change: a DiffView, a list, a preview. */
  details?: React.ReactNode;
  /** The verb and outcome ("Send 214 emails"). Default "Approve". */
  approveLabel?: string;
  /** Default "Reject". */
  rejectLabel?: string;
  /** While it runs ("Sending…"). Default "Working…". */
  runningLabel?: string;
  /** Once done ("Sent"). Default "Done". */
  doneLabel?: string;
  /** When it failed ("Couldn't send"). Default "Couldn't finish". */
  failedLabel?: string;
  /** For consequential actions: approving needs a hold, or a stationary Dialog for irreversible ones. */
  escalate?: 'hold' | 'dialog';
  /** Who resolved it and when, for rejected and done ("Maya"). */
  resolvedBy?: string;
  resolvedAt?: Date | string | number;
  /** Who's asking. Default "The assistant". */
  requestedBy?: string;
  /**
   * Wider ways to approve (#280): Approve becomes a SplitButton whose face approves once and whose menu ("More ways to
   * approve") holds these. Ignored with `escalate`: an action that needs a hold or a dialog is never pre-approved.
   */
  scopes?: { value: string; label: string; description?: string }[];
  /**
   * Fields to change the proposal before approving it (#281): an Edit action opens them in place inside the card.
   * Keep `consequence` and `approveLabel` following the edited values, so Approve names what will happen.
   */
  edit?: React.ReactNode;
  /** The proposal was changed: an "Edited" plate by the title, and "edited and approved by you" once done. */
  edited?: boolean;
  /** Cancel edit or Escape in the fields: put the values back. */
  onEditCancel?: () => void;
  /** The scope it was approved with ('once', or a scope's value), named in the resolved line. */
  resolvedScope?: string;
  /** Called with the scope: 'once' from the face, or a scope's value from the menu. */
  onApprove?: (scope?: string) => void;
  onReject?: () => void;
  onRetry?: () => void;
  className?: string;
}
/**
 * Approve or reject an action an agent proposes. A proposal is raised, not pending: it's status that asks for action
 * (Alert's raised rule), naming the consequence, with Approve and Reject. Nothing has been dispatched, so it mustn't
 * hover. Once approved it becomes a pending write (hovers), then lands or drops to a trench. Rejected and expired are
 * flush and muted, kept in the record.
 */
export function Confirmation({ state, title, consequence, details, approveLabel = 'Approve', rejectLabel = 'Reject', runningLabel = 'Working…', doneLabel = 'Done',
  failedLabel = "Couldn't finish", escalate, resolvedBy, resolvedAt, requestedBy = 'The assistant', scopes, resolvedScope, edit, edited, onEditCancel, onApprove, onReject, onRetry, className }: ConfirmationProps) {
  // How widely it was approved, in words: "allowed for this session".
  const scoped = resolvedScope && resolvedScope !== 'once' ? (resolvedScope === 'session' ? 'allowed for this session' : resolvedScope === 'always' ? 'always allowed' : `allowed: ${scopes?.find((x) => x.value === resolvedScope)?.label ?? resolvedScope}`) : null;
  const id = React.useId();
  const [asking, setAsking] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const fields = React.useRef<HTMLDivElement>(null);
  const editBtn = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => { if (editing) fields.current?.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]:not([tabindex="-1"])')?.focus(); }, [editing]);
  React.useEffect(() => { if (state !== 'requested') setEditing(false); }, [state]);
  const closeEdit = (cancel: boolean) => { if (cancel) onEditCancel?.(); setEditing(false); requestAnimationFrame(() => editBtn.current?.focus()); };
  const status = state === 'approved' || state === 'running' ? 'pending' : state === 'done' ? 'committed' : state === 'failed' ? 'failed' : undefined;
  const { style, ...depth } = useDepth({ status });
  const [said, setSaid] = React.useState('');
  const last = React.useRef(state);
  React.useEffect(() => {
    if (last.current !== state) {
      const name = typeof title === 'string' ? title : 'Action';
      setSaid(state === 'done' ? `${name}: ${doneLabel}.` : state === 'failed' ? `${name}: ${failedLabel}.` : state === 'rejected' ? `${name}: rejected.` : state === 'running' || state === 'approved' ? `${name}: ${scoped ?? 'approved'}. ${runningLabel}` : '');
    }
    last.current = state;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const when = resolvedAt !== undefined ? <> · <RelativeTime date={resolvedAt} /></> : null;
  const line = state === 'requested' ? <><Icons.AlertCircle size={14} aria-hidden="true" />Approval needed</>
    : status === 'pending' ? runningLabel
    : state === 'done' ? <><Icons.CircleCheck size={14} aria-hidden="true" />{doneLabel}{scoped ? ` · ${edited ? 'edited and ' : ''}${scoped}${resolvedBy ? ` by ${resolvedBy}` : ''}` : edited ? ` · edited and approved${resolvedBy ? ` by ${resolvedBy}` : ''}` : resolvedBy && ` · approved by ${resolvedBy}`}{when}</>
    : state === 'failed' ? <><Icons.AlertCircle size={14} aria-hidden="true" />{failedLabel}</>
    : state === 'rejected' ? <>Rejected{resolvedBy && ` by ${resolvedBy}`}{when}</>
    : 'No longer needed';
  const approve = escalate === 'hold'
    ? <HoldButton size="sm" variant="primary" onConfirm={() => onApprove?.()} holdingLabel="Keep holding…">{approveLabel}</HoldButton>
    : !escalate && scopes?.length
      ? <SplitButton size="sm" variant="primary" label={approveLabel} onClick={() => onApprove?.('once')} menuLabel="More ways to approve"
        items={scopes.map((x) => ({ label: <span className="alt-confirm-scope"><span>{x.label}</span>{x.description && <span className="alt-confirm-scope-desc">{x.description}</span>}</span>, onSelect: () => onApprove?.(x.value) }))} />
      : <Button size="sm" variant="primary" onClick={() => (escalate === 'dialog' ? setAsking(true) : onApprove?.())}>{approveLabel}</Button>;
  return (
    <section className={cx('alt-confirm', className)} data-state={state} aria-labelledby={`${id}-t`} aria-describedby={`${id}-c`} {...depth} style={style}>
      <p className="alt-confirm-line" data-tone={state === 'failed' ? 'critical' : state === 'requested' ? 'accent' : undefined}>{line}</p>
      <h3 className="alt-confirm-title" id={`${id}-t`}>{title}{edited && state === 'requested' && <span className="alt-confirm-edited">Edited</span>}</h3>
      <p className="alt-confirm-consequence" id={`${id}-c`}>{consequence}</p>
      {details && state === 'requested' && !editing && <div className="alt-confirm-details">{details}</div>}
      {edit && state === 'requested' && editing && (
        <div ref={fields} className="alt-confirm-edit" role="group" aria-label={`Edit: ${typeof title === 'string' ? title : 'the proposal'}`}
          onKeyDown={(e) => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); closeEdit(true); } }}>
          {edit}
          <div className="alt-confirm-edit-actions">
            <Button size="sm" variant="ghost" onClick={() => closeEdit(true)}>Cancel edit</Button>
            <Button size="sm" variant="secondary" onClick={() => closeEdit(false)}>Done editing</Button>
          </div>
        </div>
      )}
      {state === 'requested' && (
        <div className="alt-confirm-actions">
          <span className="alt-confirm-who">{requestedBy} is asking</span>
          {edit && !editing && <Button ref={editBtn} size="sm" variant="ghost" onClick={() => setEditing(true)}><Icons.Pencil size={13} aria-hidden="true" />Edit</Button>}
          <Button size="sm" variant="secondary" onClick={onReject}>{rejectLabel}</Button>
          {approve}
        </div>
      )}
      {state === 'failed' && onRetry && <div className="alt-confirm-actions"><Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button></div>}
      {escalate === 'dialog' && (
        <Dialog open={asking} onOpenChange={setAsking} title={title} description={consequence} background="stationary" size="sm" initialFocus="title"
          footer={<><Button variant="secondary" onClick={() => setAsking(false)}>Cancel</Button><Button variant="danger" onClick={() => { setAsking(false); onApprove?.(); }}>{approveLabel}</Button></>}>
          {details}
        </Dialog>
      )}
      <span className="alt-sr" role="status">{said}</span>
    </section>
  );
}
