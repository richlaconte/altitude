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
