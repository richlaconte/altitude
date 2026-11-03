# Sheet

A large panel laid over the page at level 4, anchored to an edge, for a task that needs more room than a popover and less commitment than a page.

**Why level 4.** A sheet is a whole working surface above the page: higher than menus and popovers (level 3), because it holds a task rather than one choice, and below the summit (level 5), because it doesn't demand an answer. It's drawn with `surface-overlay` and `elev-4`, the toasts' tier.

**Risen at its edge, not slid in.** Nothing in Altitude slides in from the side. A sheet appears where it's anchored: it travels 16px out of its edge as it fades in, while its shadow grows from `elev-1` to `elev-4` (`dur-travel-4`, `ease-rise`). It stands 8px clear of the edge with `radius-xl` corners, so its own edges, and the shadow it casts below them, read as height. A modal sheet recedes the page behind it, as a dialog does. Closing lifts it off: it rises 8px and grows 1% as its shadow spreads and it fades, in 70% of the time it took to arrive.

**Inside.** The sheet scrolls as one column. `SheetHeader` stays at the top and rises to `elev-2` once content passes under it; `SheetFooter` stays at the bottom, and while there's more below, its top edge curves away (`lip-bottom`), as in ScrollArea.

**Bottom sheets** have a finger pull at the top: a small recess, because everything you put something into is an opening in Altitude, and this is where your finger goes. It deepens as the pointer approaches. Drag it and the sheet follows; past a third of its height, or with a flick, it goes; otherwise it springs back. The pull is a convenience: Escape, the close button and the scrim still close it.

**Modal or not.** By default a sheet is modal (the WAI-ARIA dialog pattern): the scrim blocks the page, Tab is trapped, Escape closes it and focus returns to what opened it. `modal={false}` makes a side panel that leaves the page usable: no scrim, no receding page, no trap; focus still moves into it, and Escape closes it from inside.

| Prop | Default | |
|---|---|---|
| `side` | `right` | `right`, `left` or `bottom` |
| `size` | `md` | width: `sm` 360, `md` 440, `lg` 560px; a bottom sheet 480, 720, 960px |
| `modal` | `true` | `false`: a non-blocking panel |
| `dismissible` | `true` | `false`: only your own buttons close it |

**On a phone.** It sizes to the visible viewport, not the largest one: with the on-screen keyboard open it shrinks to the part you can see, so its footer and the focused field stay in reach.

**You provide:** `open`/`onOpenChange` or a `trigger`, and the content: `SheetHeader` with `SheetTitle` (it names the sheet) and `SheetDescription`, the body, and `SheetFooter` with the actions (cancel as ghost first, the action last).

- Do use a sheet to edit an item without leaving the list it's in, and for filters, details and settings.
- Don't open a sheet from a Dialog or the CommandPalette. A level-4 surface can't sit on the summit: if it's opened under one, it paints beneath it and leaves focus where it is. A Dialog may open from a sheet, to confirm something.
- Don't stack a sheet on a sheet; replace its content instead.

A modal Sheet shares document-scoped isolation, scroll ownership and eligible-focus containment with Dialog. Its locks remain through exit. Opening a Dialog from a Sheet suspends the Sheet, then resumes its focus and existing background policy after the Dialog closes. A Sheet requested beneath a summit cannot take its focus or `aria-modal` ownership. A stationary Dialog also removes the lower Sheet's scrim blur until it closes.

`modal={false}` keeps the page interactive and scrollable: no scrim, recession or focus trap. Closing that Sheet does not restore focus over a newer modal.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Sheet` as first used in its preview:

```tsx
import { Button, Input, Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from 'altitude-design';

<Sheet side="bottom" size="sm" trigger={<Button>Share</Button>}>
  <SheetHeader>
    <SheetTitle>Share Northwind</SheetTitle>
    <SheetDescription>
      Anyone with the link can view the latest deployment.
    </SheetDescription>
  </SheetHeader>
  <Input
    defaultValue="https://acme.dev/n/8dc01b2"
    readOnly={true}
    aria-label="Share link"
  />
  <SheetFooter><Button variant="primary">Copy link</Button></SheetFooter>
</Sheet>
```

The full preview, as rendered in Storybook and checked in CI (`page`, `row`, `grid`, `form` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Card, Checkbox, Field, Input, Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle, Switch, Textarea } from 'altitude-design';

export default function App() {
  const [edit, setEdit] = React.useState(true);
  return <div className="page">
  <div className="row">
    <Button variant="primary" onClick={() => setEdit(true)}>Edit project</Button>
    <Sheet side="bottom" size="sm" trigger={<Button>Share</Button>}>
      <SheetHeader>
        <SheetTitle>Share Northwind</SheetTitle>
        <SheetDescription>
          Anyone with the link can view the latest deployment.
        </SheetDescription>
      </SheetHeader>
      <Input
        defaultValue="https://acme.dev/n/8dc01b2"
        readOnly={true}
        aria-label="Share link"
      />
      <SheetFooter><Button variant="primary">Copy link</Button></SheetFooter>
    </Sheet>
    <Sheet
      side="left"
      size="sm"
      modal={false}
      trigger={<Button variant="ghost">Filters</Button>}
    >
      <SheetHeader>
        <SheetTitle>Filters</SheetTitle>
        <SheetDescription>The page stays usable while this is open.</SheetDescription>
      </SheetHeader>
      <Checkbox label="Production" defaultChecked={true} />
      <Checkbox label="Preview" />
      <Checkbox label="Failed builds only" />
    </Sheet>
  </div>
  <div className="grid" data-tells-ignore="LA4 placeholder page behind the overlay">
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
  </div>
  <Sheet open={edit} onOpenChange={setEdit}>
    <SheetHeader>
      <SheetTitle>Edit project</SheetTitle>
      <SheetDescription>Changes apply to every environment.</SheetDescription>
    </SheetHeader>
    <div className="form">
      <Field label="Project name"><Input defaultValue="Northwind" /></Field>
      <Field label="Description" hint="Shown on the project's card.">
        <Textarea placeholder="What is this project for?" />
      </Field>
      <Switch label="Deploy previews for every branch" defaultChecked={true} />
    </div>
    <SheetFooter>
      <Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button>
      <Button variant="primary" onClick={() => setEdit(false)}>Save changes</Button>
    </SheetFooter>
  </Sheet>
</div>;
}
```
<!-- /example -->
