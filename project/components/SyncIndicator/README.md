# SyncIndicator

One honest answer to "is my work saved?", for autosaving editors, optimistic UIs and local-first apps: "Saved", "Saving…", "Offline · 3 changes waiting", "Couldn't sync", "1 conflict to resolve". Write-ups on local-first apps name showing unsynced edits as saved as the most common failure.

**Elevation.** A status plate is a label, and labels never lift. It's a flush `Badge` plate whose lamp relights when the state changes: positive when saved (with "· 2 minutes ago"), pulsing while saving, caution when offline or in conflict, critical when a sync failed. A change of state cross-fades rather than rising, because "things that merely changed state cross-fade". The *items* it covers carry `status="pending"` and hover until they land, so the per-item and the global signals agree. With a `queue`, pressing the plate opens the waiting changes in a `Popover`. The plate then lifts when pointed at, because it acts.

**When it fails.** `failed` shows Retry (`onRetry`). `conflict` shows Resolve (`onOpenConflicts`). The patterns around it (offline queues, conflicts, session expiry) are a framework pattern of their own.

**Accessibility.** The words are a polite status region, said without chatter. "Saved" is said at most every `announceEvery` ms (default 5s), not "Saving… Saved" on every key. "Saving" isn't said. Going offline, failures and conflicts are said at once. With a queue, the plate is a button named by its state ("Offline · 2 changes waiting. Show changes"). Under forced colours the words and the lamp carry it. Under `contrast="more"` the plate gets a `line-control` edge. Under reduced motion the lamp doesn't pulse; the word says "Saving…".

**Props:** `state` (`'saved' | 'saving' | 'offline' | 'failed' | 'conflict'`); `pending`; `conflicts`; `lastSyncedAt`; `onRetry`; `onOpenConflicts`; `queue`; `announceEvery`.

**You provide:** the true state of your sync. Only say "Saved" once the server has acknowledged the change.

```tsx
<SyncIndicator state={sync.state} pending={sync.queue.length} lastSyncedAt={sync.at}
  onRetry={sync.retry} onOpenConflicts={openConflicts}
  queue={sync.queue.map((c) => <Surface key={c.id} status="pending">{c.label}</Surface>)} />
```

- Do show "Saved" only after the server confirms.
- Do count what's waiting when offline.
- Don't put a spinner beside it; the pulsing lamp and the word say it.
- Don't raise the plate to get attention when a sync fails; the lamp and the words change.
