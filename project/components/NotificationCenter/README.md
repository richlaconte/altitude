# NotificationCenter and NotificationList

An inbox of what happened: mentions, assignments, approvals waiting, failed jobs, billing notices. A bell with a count opens the list, grouped by day, with Mark all as read, actions on each item, and a link to preferences.

**Elevation.**
- **The bell** is live: a ghost button. **Only its count floats** (`Badge variant="count"`), because a count wants you.
- **The panel** floats at level 3 (a `Popover`), or at level 4 as a bottom `Sheet` on narrow screens.
- **The list in it** lies on the ground: it's a record of what happened.
- **Unread is a mark, not a height**: an `accent` dot, weight 600, and "Unread" in the item's name. Keeping unread items raised or tinted would make height mean "unread", which breaks "tiers carry meaning" (see Elevation, "States that don't rise").
- **A new notification** arrives lifted and settles, as anything new does. An item that links lifts when pointed at. Mark all as read removes the dots with a cross-fade, and nothing travels.

**Toasts are momentary; this is the record.** Use `toast` for "Saved". Use the notification center for things that wait for someone.

**Accessibility.** The bell's name includes the unread count ("Notifications, 2 unread"). New notifications are announced politely and batched ("2 new notifications"), whether or not the panel is open. Mark all as read comes first in the panel. Items that link are links, and opening one marks it read and closes the panel. Item actions are buttons, and an unread item without a link gets "Mark as read". Under forced colours the dot keeps its colour (`forced-color-adjust: none`), and the word carries it too.

**Props.** `NotificationCenter`: `items` (`{ id, title, body?, createdAt, read, href?, actions? }[]`), `onMarkRead(ids)`, `onMarkAllRead`, `preferencesHref`, `groupBy` (`'day' | 'none'`), `onOpen`, `mobileBreakpoint` (default 640). `NotificationList` is the same list without the bell, for a page of its own.

**You provide:** the notifications and whether each is read, and what reading one does.

```tsx
<NotificationCenter items={notifications} onMarkRead={(ids) => markRead(ids)} onMarkAllRead={markAllRead}
  preferencesHref="/settings/notifications" />
```

- Do let each notification lead to its subject (`href`).
- Do keep an action on the item when it's waiting for someone ("Approve").
- Don't raise or tint unread items.
- Don't put momentary confirmations here; that's a toast.
