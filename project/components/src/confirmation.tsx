import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Button, HoldButton } from './controls';
import { Dialog } from './overlays';
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
  onApprove?: () => void;
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
  failedLabel = "Couldn't finish", escalate, resolvedBy, resolvedAt, requestedBy = 'The assistant', onApprove, onReject, onRetry, className }: ConfirmationProps) {
  const id = React.useId();
  const [asking, setAsking] = React.useState(false);
  const status = state === 'approved' || state === 'running' ? 'pending' : state === 'done' ? 'committed' : state === 'failed' ? 'failed' : undefined;
  const { style, ...depth } = useDepth({ status });
  const [said, setSaid] = React.useState('');
  const last = React.useRef(state);
  React.useEffect(() => {
    if (last.current !== state) {
      const name = typeof title === 'string' ? title : 'Action';
      setSaid(state === 'done' ? `${name}: ${doneLabel}.` : state === 'failed' ? `${name}: ${failedLabel}.` : state === 'rejected' ? `${name}: rejected.` : state === 'running' || state === 'approved' ? `${name}: approved. ${runningLabel}` : '');
    }
    last.current = state;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const when = resolvedAt !== undefined ? <> · <RelativeTime date={resolvedAt} /></> : null;
  const line = state === 'requested' ? <><Icons.AlertCircle size={14} aria-hidden="true" />Approval needed</>
    : status === 'pending' ? runningLabel
    : state === 'done' ? <><Icons.CircleCheck size={14} aria-hidden="true" />{doneLabel}{resolvedBy && ` · approved by ${resolvedBy}`}{when}</>
    : state === 'failed' ? <><Icons.AlertCircle size={14} aria-hidden="true" />{failedLabel}</>
    : state === 'rejected' ? <>Rejected{resolvedBy && ` by ${resolvedBy}`}{when}</>
    : 'No longer needed';
  const approve = escalate === 'hold'
    ? <HoldButton size="sm" variant="primary" onConfirm={() => onApprove?.()} holdingLabel="Keep holding…">{approveLabel}</HoldButton>
    : <Button size="sm" variant="primary" onClick={() => (escalate === 'dialog' ? setAsking(true) : onApprove?.())}>{approveLabel}</Button>;
  return (
    <section className={cx('alt-confirm', className)} data-state={state} aria-labelledby={`${id}-t`} aria-describedby={`${id}-c`} {...depth} style={style}>
      <p className="alt-confirm-line" data-tone={state === 'failed' ? 'critical' : state === 'requested' ? 'accent' : undefined}>{line}</p>
      <h3 className="alt-confirm-title" id={`${id}-t`}>{title}</h3>
      <p className="alt-confirm-consequence" id={`${id}-c`}>{consequence}</p>
      {details && state === 'requested' && <div className="alt-confirm-details">{details}</div>}
      {state === 'requested' && (
        <div className="alt-confirm-actions">
          <span className="alt-confirm-who">{requestedBy} is asking</span>
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
