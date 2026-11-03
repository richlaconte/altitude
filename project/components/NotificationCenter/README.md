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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`NotificationCenter` as first used in its preview:

```tsx
import { NotificationCenter } from 'altitude-design';

<NotificationCenter items={items} onMarkRead={markRead} onMarkAllRead={() => setItems((xs) => xs.map((x) => ({ ...x, read: true })))} preferencesHref="#/settings/notifications" />
```

The full preview, as rendered in Storybook and checked in CI (`col`, `nc`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, NotificationCenter } from 'altitude-design';

const ago = (m) => new Date(Date.now() - m * 60000);
export default function App() {
  const [items, setItems] = React.useState([
    { id: 'n1', title: 'Maya mentioned you in Q4 planning', body: '“@you can you take the pricing section?”', createdAt: ago(5), read: false, href: '#/docs/q4' },
    { id: 'n2', title: 'Theo asked to approve an expense', body: '€1,240 · Conference travel', createdAt: ago(48), read: false, actions: <Button size="sm" variant="secondary">Approve</Button> },
    { id: 'n3', title: 'Export of 812 invoices is ready', createdAt: ago(60 * 3), read: true, href: '#/exports/7' },
    { id: 'n4', title: 'Nightly sync failed for Salesforce', body: 'The token expired. Reconnect to resume.', createdAt: ago(60 * 27), read: true, href: '#/integrations' },
  ]);
  const markRead = (ids) => setItems((xs) => xs.map((x) => (ids.includes(x.id) ? { ...x, read: true } : x)));
  return (
    <div className="col">
      <div className="nc">
        <Button size="sm" variant="secondary" onClick={() => setItems((xs) => [{ id: 'n' + Date.now(), title: 'Ada assigned you “Billing page”', createdAt: new Date(), read: false, href: '#/issues/212' }, ...xs])}>Simulate a new notification</Button>
        <NotificationCenter items={items} onMarkRead={markRead} onMarkAllRead={() => setItems((xs) => xs.map((x) => ({ ...x, read: true })))} preferencesHref="#/settings/notifications" />
      </div>
      <p className="cap">Unread is a dot and a bolder title, never a height. A new notification arrives lifted and settles, and is announced even while the panel is closed.</p>
    </div>
  );
}
```
<!-- /example -->
