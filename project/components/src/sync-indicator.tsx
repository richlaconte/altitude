import * as React from 'react';
import { cx } from './core';
import { Badge, Button } from './controls';
import { Popover } from './overlays';
import { RelativeTime } from './relative-time';

/* ───────────────────────── SyncIndicator ───────────────────────── */

export type SyncState = 'saved' | 'saving' | 'offline' | 'failed' | 'conflict';

export interface SyncIndicatorProps {
  state: SyncState;
  /** Changes not yet on the server. */
  pending?: number;
  /** Conflicts waiting to be resolved, with state="conflict". */
  conflicts?: number;
  /** When the work last reached the server ("Saved 2 min ago"). */
  lastSyncedAt?: Date | string | number;
  onRetry?: () => void;
  onOpenConflicts?: () => void;
  /** The waiting changes, shown in a Popover when the plate is pressed. Without it the plate doesn't open anything. */
  queue?: React.ReactNode;
  /** Announces "Saved" at most this often, in milliseconds; going offline and failures are announced at once. Default 5000. */
  announceEvery?: number;
  className?: string;
}
const TONE: Record<SyncState, 'positive' | 'neutral' | 'caution' | 'critical'> = { saved: 'positive', saving: 'neutral', offline: 'caution', failed: 'critical', conflict: 'caution' };

/**
 * Whether your work has reached the server, said in words on a flush Badge plate whose lamp relights when the state
 * changes: labels never lift, and a state change cross-fades rather than rises. The items it covers hover as pending
 * until they land, so the global and per-item signals agree. With a queue, the plate opens it (and lifts, because it acts).
 */
export function SyncIndicator({ state, pending = 0, conflicts = 0, lastSyncedAt, onRetry, onOpenConflicts, queue, announceEvery = 5000, className }: SyncIndicatorProps) {
  const changes = (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`;
  const words = state === 'saved' ? 'Saved' : state === 'saving' ? 'Saving…' : state === 'offline' ? `Offline${pending ? ` · ${changes(pending)} waiting` : ''}`
    : state === 'failed' ? "Couldn't sync" : `${conflicts || 1} ${(conflicts || 1) === 1 ? 'conflict' : 'conflicts'} to resolve`;
  // Said politely and without chatter: "Saved" at most every announceEvery ms (not "Saving… Saved" on every key),
  // going offline, failures and conflicts at once. "Saving" isn't said at all.
  const [said, setSaid] = React.useState('');
  const lastSaved = React.useRef(0);
  React.useEffect(() => {
    if (state === 'saving') return;
    if (state === 'saved') { const now = Date.now(); if (now - lastSaved.current < announceEvery) return; lastSaved.current = now; }
    setSaid(words);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const plate = (
    <Badge tone={TONE[state]} lamp={state === 'saving' ? 'pulse' : true} className="alt-sync-plate">
      {words}{state === 'saved' && lastSyncedAt !== undefined && <span className="alt-sync-time"> · <RelativeTime date={lastSyncedAt} tooltip={false} /></span>}
    </Badge>
  );
  return (
    <span className={cx('alt-sync', className)} data-state={state}>
      {queue
        ? <Popover aria-label="Changes waiting to sync" align="end" trigger={<button type="button" className="alt-sync-button" aria-label={`${words}. Show changes`}>{plate}</button>}>
            <div className="alt-sync-queue"><p className="alt-sync-queue-title">{pending ? `${changes(pending)} waiting` : 'Nothing waiting'}</p>{queue}</div>
          </Popover>
        : plate}
      {state === 'failed' && onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}
      {state === 'conflict' && onOpenConflicts && <Button size="sm" variant="secondary" onClick={onOpenConflicts}>Resolve</Button>}
      <span className="alt-sr" role="status" aria-live="polite">{said}</span>
    </span>
  );
}
