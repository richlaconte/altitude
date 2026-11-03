# ThreadList

Conversations with an assistant, beside the thread: new conversation, grouped by date, search, rename, delete, and for agents that run in the background, which ones are still working, which finished while you were away and which are waiting for you. It's built from `Sidebar`'s parts.

**Elevation: a record of conversations, with live rows.**
- **Rows** are destinations: flush at rest, lifting one level when pointed at; the current thread sits on the Sidebar's raised pill (`aria-current="page"`).
- **Working** isn't pending (nothing you sent is in flight), so it never hovers: a plate with a steady accent lamp says "Working". No spinner.
- **Needs you** ("Needs approval", "Has a question") is a caution plate with a lamp. A row can't lift into a card inside a nav without breaking the list, so the word carries it, and it's announced once.
- **Finished, unread** is a dot and the title in 600. **Failed** and **stopped** are plates in words.
- **Renaming** opens a field (a well) in the row. **Deleting** leaves a `RemovalReceipt` in the row's slot with Undo.
- **New conversation** is secondary: the composer's Send keeps the view's one primary.

**Accessibility.** A landmark (the Sidebar's `aria-label`, "Conversations") holding lists of links. Each row's name includes its state: "Q3 pricing comparison, Needs approval, 2 minutes ago". F2 renames the focused row (Enter saves, Escape cancels, focus returns to it); Delete deletes it; the row menu is named "More actions for Q3 pricing comparison". ⌘K / Ctrl+K focuses search when `searchable`. A background thread that starts needing you is announced politely once; finishing isn't announced.

**Parts:** `ThreadList` (`searchable`, `onSearch`, `searchLabel`); `ThreadListGroup` (`label`); `ThreadListItem` (`href`, `title`, `updatedAt`, `status`: `'idle' | 'working' | 'needs-input' | 'failed' | 'stopped'`, `needs`: `'approval' | 'question'`, `unread`, `current`, `onSelect`, `onRename`, `onDelete`, `onUndoDelete`, `onDeleted`, `onArchive`); `ThreadListNew`. Helper: `groupByDate(threads, getDate, now?, locale?)` → Today, Yesterday, Previous 7 days, Previous 30 days, then months.

**You provide:** the threads and their states, what selecting, renaming and deleting do. Keep a deleted thread until `onDeleted` (when its receipt closes), so Undo can bring it back.

```tsx
<Sidebar aria-label="Conversations">
  <SidebarHeader><ThreadListNew onClick={newThread} /></SidebarHeader>
  <SidebarContent>
    <ThreadList searchable onSearch={setQuery}>
      {groupByDate(threads, (t) => t.updatedAt).map((g) => (
        <ThreadListGroup key={g.label} label={g.label}>
          {g.threads.map((t) => <ThreadListItem key={t.id} href={`/c/${t.id}`} current={t.id === id} title={t.title} updatedAt={t.updatedAt}
            status={t.status} unread={t.unread} onRename={(name) => rename(t.id, name)} onDelete={() => remove(t.id)} onUndoDelete={() => restore(t.id)} onDeleted={() => drop(t.id)} />)}
        </ThreadListGroup>
      ))}
    </ThreadList>
  </SidebarContent>
</Sidebar>
```

- Do say every state in words; the lamp only repeats it.
- Do keep deleted threads until the receipt closes.
- Don't show a spinner or make a working row hover.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`ThreadList` as first used in its preview:

```tsx
import { ThreadList, ThreadListGroup, ThreadListItem, groupByDate } from 'altitude-design';

<ThreadList searchable onSearch={setQ}>
  {groupByDate(shown, (t) => t.at, now).map((g) => (
    <ThreadListGroup key={g.label} label={g.label}>
      {g.threads.map((t) => (
        <ThreadListItem key={t.id} href={'#/c/' + t.id} title={t.title} updatedAt={t.at} status={t.status} needs={t.needs} unread={t.unread} current={t.id === at}
          onSelect={(e) => { e.preventDefault(); setAt(t.id); set(t.id, { unread: false }); }}
          onRename={(title) => set(t.id, { title })} onDelete={() => {}} onUndoDelete={() => {}} onDeleted={() => setThreads((ts) => ts.filter((x) => x.id !== t.id))} />
      ))}
    </ThreadListGroup>
  ))}
</ThreadList>
```

The full preview, as rendered in Storybook and checked in CI (`tl`, `page` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { AppShell, Sidebar, SidebarContent, SidebarHeader, ThreadList, ThreadListGroup, ThreadListItem, ThreadListNew, groupByDate } from 'altitude-design';

const now = Date.now(), min = 60000, hour = 3600000, day = 86400000;
// Earlier threads hang off the start of today, not off now, so each stays in its group just after midnight.
const today = new Date(now).setHours(0, 0, 0, 0);
const seed = [
  { id: 'a', title: 'Q3 pricing comparison', at: now - 2 * min, status: 'needs-input', needs: 'approval' },
  { id: 'b', title: 'Refactor the billing module', at: Math.max(now - 9 * min, today), status: 'working' },
  { id: 'c', title: 'Summarise incident #4821', at: Math.max(now - 40 * min, today), unread: true },
  { id: 'd', title: 'Draft the release note', at: today - 9 * hour },
  { id: 'e', title: 'Migrate the users table', at: today - 11 * hour, status: 'failed' },
  { id: 'f', title: 'Onboarding email ideas', at: today - 3 * day - 12 * hour },
  { id: 'g', title: 'Competitor research', at: today - 11 * day - 12 * hour, status: 'stopped' },
];
export default function App() {
  const [threads, setThreads] = React.useState(seed);
  const [at, setAt] = React.useState('b');
  const [q, setQ] = React.useState('');
  const shown = threads.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
  const set = (id, patch) => setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  return (
    <div className="tl">
      <AppShell sidebar={
        <Sidebar aria-label="Conversations">
          <SidebarHeader><ThreadListNew onClick={() => { const id = String(Date.now()); setThreads((ts) => [{ id, title: 'New conversation', at: Date.now() }, ...ts]); setAt(id); }} /></SidebarHeader>
          <SidebarContent>
            <ThreadList searchable onSearch={setQ}>
              {groupByDate(shown, (t) => t.at, now).map((g) => (
                <ThreadListGroup key={g.label} label={g.label}>
                  {g.threads.map((t) => (
                    <ThreadListItem key={t.id} href={'#/c/' + t.id} title={t.title} updatedAt={t.at} status={t.status} needs={t.needs} unread={t.unread} current={t.id === at}
                      onSelect={(e) => { e.preventDefault(); setAt(t.id); set(t.id, { unread: false }); }}
                      onRename={(title) => set(t.id, { title })} onDelete={() => {}} onUndoDelete={() => {}} onDeleted={() => setThreads((ts) => ts.filter((x) => x.id !== t.id))} />
                  ))}
                </ThreadListGroup>
              ))}
            </ThreadList>
          </SidebarContent>
        </Sidebar>
      }>
        <div className="page">The conversation “{threads.find((t) => t.id === at)?.title}” is open here.</div>
      </AppShell>
    </div>
  );
}
```
<!-- /example -->
