# InboxList

The list in a list-and-detail frame: a queue you work through one item at a time (support tickets, messages, requests, reviews), opening one into the detail beside it. Each row says what it's about, who it's from, its status in words, how recent it is and whether you've read it. New items arrive while you work, and they never move the row under your pointer or your focus.

Use `DataTable` to act on many rows at once (its checkboxes mean "many chosen", not "the one open"), `ThreadList` for conversations with an assistant (its states are an agent's), and `ItemGroup` to edit, add, reorder and remove records in place.

**Elevation: the record, in rows, with one open.**
- **Rows** lie flush on the pane, with a 1px `line` between them. Pointing at a row lifts it one level (`surface-raised`, `elev-1`), because it opens.
- **The open row** is selected: tinted `accent-soft` and raised one level, like Table's selected row, with `aria-selected`. Only one row is raised for being open.
- **Unread** is a dot, the title in weight 600, and "Unread" first in the row's name. It's never a height.
- **Status** is a `Badge` plate set flush, in words. **Someone else viewing** is a small `Avatar` in their presence ring, and "Maya is viewing" (or "Maya is replying") in the row's name.
- **A new row** arrives tinted and lifted, then settles over `dur-settle` (the afterglow), up to four at once. A bigger batch arrives settled, and one message gives the count.
- **Nothing moves under you.** When rows are inserted above the focused row, or the row under the pointer, the list keeps that row where it was on screen by scrolling with the insertion. It does this itself, because Safari has no scroll anchoring, and it turns the browser's own anchoring off on the list.

**Accessibility.** A listbox, single select, where selection doesn't follow focus: one tab stop (the open row, else the first); ↑ and ↓ move focus, Home and End go to the first and last rows, Enter, Space or a click opens, and a letter jumps to the next row whose title starts with it. `onSelectedChange` fires only when a row is opened, so moving through the list doesn't load every item. Each row is named from its parts in a fixed order, whatever their visual order: "Unread. Refund for order 4471 from Priya Natarajan Open 4 minutes ago Maya Chen is viewing." The preview line is its description, read after a pause. Arrivals are announced politely ("New: Discount code not working, from Aiyana Redcloud.") and never move focus. Rows hold nothing focusable, because a listbox option can't contain a control: put actions on the item in the detail pane, a `ContextMenu`, or the `CommandPalette`. Pass `RelativeTime` `tooltip={false}`, since its tooltip makes it focusable. In development the list warns if a row holds something focusable. Forced colours: the open row is `Highlight` with a 1px border, and the unread dot and the dividers are `CanvasText`. `contrast="more"` draws the dividers in `ink` and rims the open row.

**Parts:** `InboxList` (`items`, `getKey`, `renderItem`, `selected`/`defaultSelected`/`onSelectedChange`, `announceArrivals` (default true), `aria-label` or `aria-labelledby`; a ref has `focusItem(key)`); `InboxItem` (`title`, `from`, `preview`, `time`, `status`, `unread`, `viewers`: `{ name, presence?, replying? }[]`).

**You provide:** the items in your order (newest first is usual), what opening one does, and marking it read. At phone width show the list or the detail, not both (`ResizablePanelGroup` stacks), and when the detail closes, return focus with `ref.current.focusItem(key)`. Put the list in a pane that scrolls (`overflow-y: auto` and a height), so the row you're on can be kept in place. Up to about 500 rows render as they are; page beyond that.

```tsx
const list = React.useRef<InboxListHandle>(null);

<InboxList<Ticket>
  ref={list}
  aria-label="Tickets: Mine"
  items={tickets}
  getKey={(t) => t.id}
  selected={openId} onSelectedChange={(id) => { setOpenId(id); markRead(id); }}
  renderItem={(t) => (
    <InboxItem title={t.subject} from={t.requester} preview={t.lastMessage} unread={t.unread} viewers={t.viewers}
      time={<RelativeTime date={t.updatedAt} tooltip={false} />}
      status={<Badge tone={toneOf(t.status)}>{t.status}</Badge>} />
  )}
/>
```

- Do say every status in words; the Badge's lamp only repeats it.
- Do open on Enter and click only; let the arrow keys browse.
- Don't put buttons, links or a focusable RelativeTime in a row.
- Don't raise unread rows: unread is a mark.
- Don't use it to pick many items; that's `DataTable`.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`InboxList` as first used in its preview:

```tsx
import { Badge, InboxItem, InboxList, RelativeTime } from 'altitude-design';

<InboxList aria-label="Tickets: Mine" items={tickets} getKey={x => x.id} selected={open} onSelectedChange={choose}
  renderItem={x => <InboxItem title={x.subject} from={x.from} preview={x.preview} unread={x.unread} viewers={x.viewers}
    time={<RelativeTime date={x.at} tooltip={false} />}
    status={<Badge tone={IBX_TONE[x.status]}>{x.status}</Badge>} />} />
```

The full preview, as rendered in Storybook and checked in CI (`col`, `ibx`, `ibx-list`, `ibx-detail`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Badge, Button, InboxItem, InboxList, RelativeTime } from 'altitude-design';

const IBX_NOW = Date.now();
const ibxAgo = m => IBX_NOW - m * 60000;
const IBX_SEED = [
  { id: "t1", subject: "Refund for order 4471", from: "Priya Natarajan", status: "Open", at: ibxAgo(4), unread: true, preview: "The blender arrived with a cracked jug, so I'd like a refund rather than a replacement.", viewers: [{ name: "Maya Chen", presence: 2 }] },
  { id: "t2", subject: "Can't sign in after the update", from: "Tomás Ruiz", status: "Open", at: ibxAgo(18), unread: true, preview: "Since this morning the app says my password is wrong, but it works on the website." },
  { id: "t3", subject: "Change the delivery address", from: "Hana Kobayashi", status: "Pending", at: ibxAgo(52), preview: "Thanks, I've sent the new address. It's the flat above the bakery." },
  { id: "t4", subject: "Invoice for March", from: "Oluwaseun Bello", status: "On hold", at: ibxAgo(130), preview: "Our finance team needs the VAT number on the invoice before they can pay it." },
  { id: "t5", subject: "Wrong size sent", from: "Lea Hoffmann", status: "Solved", at: ibxAgo(300), preview: "Got the right ones today, thank you for sorting it out so quickly." },
  { id: "t6", subject: "Gift message missing", from: "Sam Okafor", status: "Solved", at: ibxAgo(1440), preview: "The card wasn't in the parcel. Not a big deal, just letting you know." }
];
const IBX_TONE = { Open: "caution", Pending: "neutral", "On hold": "neutral", Solved: "positive" };
const IBX_NEW = [
  { subject: "Discount code not working", from: "Aiyana Redcloud", preview: "SPRING20 says it has expired, but the email says it runs until Sunday." },
  { subject: "Order arrived damaged", from: "Kofi Mensah", preview: "The box was crushed and two of the glasses are broken." },
  { subject: "Where is my parcel?", from: "Ines Duarte", preview: "Tracking hasn't moved since Tuesday." }
];
export default function App() {
  const [tickets, setTickets] = React.useState(IBX_SEED);
  const [open, setOpen] = React.useState("t3");
  const n = React.useRef(0);
  const deliver = () => {
    const t = IBX_NEW[n.current % IBX_NEW.length], id = "n" + ++n.current;
    setTickets(ts => [{ id, ...t, status: "Open", at: Date.now(), unread: true }, ...ts]);
  };
  const choose = id => { setOpen(id); setTickets(ts => ts.map(t => t.id === id ? { ...t, unread: false } : t)); };
  const t = tickets.find(x => x.id === open);
  return <div className="col" style={{ gap: 8 }}>
    <div className="ibx">
      <div className="ibx-list">
        <InboxList aria-label="Tickets: Mine" items={tickets} getKey={x => x.id} selected={open} onSelectedChange={choose}
          renderItem={x => <InboxItem title={x.subject} from={x.from} preview={x.preview} unread={x.unread} viewers={x.viewers}
            time={<RelativeTime date={x.at} tooltip={false} />}
            status={<Badge tone={IBX_TONE[x.status]}>{x.status}</Badge>} />} />
      </div>
      <section className="ibx-detail" aria-label="Open ticket">
        {t ? <><h2>{t.subject}</h2><p className="cap">{t.from} · {t.status}</p><p>{t.preview}</p></> : <p className="cap">Choose a ticket.</p>}
      </section>
    </div>
    <p className="cap">↑ and ↓ move, Enter opens, a letter jumps to the next ticket starting with it. A new ticket arrives at the top without moving the one you're on.</p>
    <details className="preview-fixtures"><summary>Example fixtures</summary>
      <Button size="sm" variant="secondary" onClick={deliver}>Deliver a new ticket</Button>
    </details>
  </div>;
}
```
<!-- /example -->
