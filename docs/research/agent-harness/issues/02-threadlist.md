<!--
title: New: ThreadList — conversations with an assistant, with the ones still working said in words
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

Every harness has a list of past conversations (or sessions, or agent tasks) beside the thread: new chat, today / yesterday / earlier, rename, delete, search, and, for agents that run in the background, which ones are still working, which finished while you were away, and which are stuck waiting for you. `Sidebar` lists destinations but has no idea of a conversation's state, and apps that build this by hand reach for spinners and pulsing dots.

**Closest existing components:** `Sidebar` / `SidebarMenu` (destinations, a count badge, the current pill), `NotificationCenter` (unread as a mark), `ItemGroup` (rename and remove in place).
**Name:** `ThreadList`, `ThreadListItem`, `ThreadListGroup`, `ThreadListNew` (assistant-ui's names).

## Elevation story

**What it is:** settled (the list is a record of conversations), with live rows
**Signal it carries:** "Where you are" (the current thread on the raised pill) and a new row for a conversation's state
**Relatives it borrows from:** rows and the gliding pill are `SidebarMenuButton`'s; unread is `NotificationCenter`'s mark; rename is `InlineEdit`; delete leaves a `RemovalReceipt` in the row's slot; status plates are `Badge`s with lamps.

A thread that's generating is **not pending**: `Conversation` already says a streaming answer isn't a write in flight. So a working thread doesn't hover; it says "Working" with a steady lamp. A thread waiting on the person (an approval, a question) is status that asks for action, but a row can't lift into a card inside a nav without breaking the list, so it's a `caution` plate and a word, and the row's name carries it.

| Part / state | Tier | Level | Surface · shadow | Non-height cue (word, icon, ARIA state or border) |
|---|---|---|---|---|
| Row at rest | Ground | 0 | `surface-ground` · none | title, `RelativeTime` |
| Row, pointed at | Raised | +1 | as `SidebarMenuButton` | — |
| Current thread | Raised | 1 | the `Sidebar` pill · `elev-1` | `aria-current="page"` |
| Working | Ground | 0 | `Badge` plate, steady `accent` lamp | "Working" in the row and its name; no spinner |
| Needs you | Ground | 0 | `Badge` plate on `caution-soft`, `caution` lamp | "Needs approval" / "Has a question" |
| Finished, unread | Ground | 0 | none | a dot, weight 600, "Unread" in its name |
| Failed or stopped | Ground | 0 | `Badge` plate on `critical-soft` | "Couldn't finish" / "Stopped" |
| Renaming | Sunk | −1 | `InlineEdit` well · `well` | the field's label "Conversation name" |
| Deleted | Ground | 0 | `RemovalReceipt` in the slot | "Deleted 'Q3 pricing'. Undo" |
| Group heading | Ground | 0 | none | "Today", "Yesterday", "Previous 7 days" |
| New conversation | Raised | 1 | `Button variant="secondary"` · `elev-1`, `wall-1` | "New conversation"; the composer's Send keeps the view's one primary |
| Row menu (rename, archive, delete) | Floating | 3 | `DropdownMenu` · `elev-3` | "More actions for Q3 pricing" |

## Motion

The pill glides between rows (`ease-glide`, as `Sidebar`). A thread that moves to the top of "Today" because it got a new message is carried there (as `CommandPalette`'s ranking), not reshuffled; under reduced motion it appears in place. A status plate's lamp relights once when the state changes (`Badge`). A new thread arrives lifted and settles (`dur-settle`), within the attention budget. Nothing pulses while working.

## Accessibility

**WAI-ARIA pattern:** a `nav` landmark ("Conversations") containing lists of links ([landmarks](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)); row menus use the [menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) pattern.
**Keyboard:** Tab through rows (or one tab stop with arrows inside a group, matching `Sidebar`); F2 renames the focused row; Delete opens its removal; ⌘K / Ctrl+K focuses search when `searchable`.
**Screen reader:** each row's name includes its state ("Q3 pricing, needs approval, 2 minutes ago"). When a background thread starts needing you, it's announced politely once ("Q3 pricing needs your approval"); finishing is not announced.
**Forced colours:** the pill has a 1px border (as `Sidebar`); plates have borders and keep their words.
**`contrast="more"`:** pill gets a 2px slab; plate borders `line-control`.

## API sketch

```tsx
<Sidebar aria-label="Conversations">
  <SidebarHeader><ThreadListNew onClick={newThread} /></SidebarHeader>
  <SidebarContent>
    <ThreadList searchable onSearch={setQuery}>
      {groups.map((g) => (
        <ThreadListGroup key={g.label} label={g.label}>
          {g.threads.map((t) => (
            <ThreadListItem key={t.id} href={`/c/${t.id}`} current={t.id === id}
              title={t.title} updatedAt={t.updatedAt} status={t.status /* 'idle' | 'working' | 'needs-input' | 'failed' | 'stopped' */}
              unread={t.unread} onRename={(name) => rename(t.id, name)} onDelete={() => remove(t.id)} onUndoDelete={() => restore(t.id)} />
          ))}
        </ThreadListGroup>
      ))}
    </ThreadList>
  </SidebarContent>
</Sidebar>
```

`groupByDate(threads, now)` is exported as a helper. Collapsed to a rail, rows keep their state in the tooltip and in a lamp on the rail icon.

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/ThreadList/README.md` in the existing format (what it is, elevation, props, "You provide", do and don't)
- [ ] A section in `build/previews.txt` with an honest `@dsCard` group and subtitle
- [ ] A row in the signals table in `Elevation.md`; new choreography in `Motion.md`; sources and a prototype review in `Research.md`
- [ ] `tsc` clean; `shoot.mjs` renders it in all four schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`
- [ ] Keyboard paths checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed (CI fails otherwise)

## Open questions (optional)

- Is "Working" better as a plate or as text only? A plate per working row could be noisy when ten agents run at once; a lamp on the row with the word in its name might be enough.

Part of the agent harness research pass (`docs/research/agent-harness/`).
