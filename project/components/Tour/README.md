# Tour

A few steps pointing at parts of the interface, for onboarding or a feature launch: "Projects moved here", "New: filter by owner". Keep it short and skippable.

**Elevation: a note in the air, not a summit.**
- **One step at a time floats at level 3**, a `Popover`-built card beside its target, with "Step 2 of 4", a heading, the body, progress dots, Skip tour, Back and Next (Done on the last step).
- **The target takes a 2px `accent-ink` ring**, as `DataGrid`'s active cell does. It's a ring, not a lift, because the target may not be something you press.
- **It never dims the page.** Dimming means the page is receding, which is the summit's privilege (level 5, and only one thing sits there). Tours that dim with a cut-out spotlight block the very thing they point at.
- **It isn't modal**: the target stays usable.

**Motion.** Each step rises at its target on `ease-rise`. Moving on lifts the step off and the next one rises at its own target, so nothing flies across the screen. Under reduced motion the steps cross-fade.

**Accessibility.** A non-modal [dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) (`role="dialog"`, `aria-modal="false"`) named by the step's heading. The target is `aria-describedby` the step's body while it shows. Focus moves to the step when it opens. Tab reaches the target and back. Escape ends the tour. When the tour ends, focus returns to where it was. A target that's off screen is scrolled into view. Under forced colours the card has a 2px border and the ring is `Highlight`. Under `contrast="more"` the card gets a hard slab.

**Props:** `steps` (`{ target, title, body? }[]`, where `target` is a selector or an element); `open`, `defaultOpen`, `onOpenChange`; `onFinish(how)` (`'done'` or `'skipped'`); `onStepChange`.

**You provide:** the steps, when to start it, and remembering it's been seen (in `onFinish`).

```tsx
<Tour open={!seen} onOpenChange={…} onFinish={markSeen} steps={[
  { target: '#nav-projects', title: 'Projects moved here', body: 'All your projects are now in the sidebar.' },
  { target: '[data-tour=filter-owner]', title: 'Filter by owner', body: 'Type a name to see only their projects.' },
]} />
```

- Do keep a tour to a few steps, and always let people skip it.
- Do remember when it's been finished or skipped.
- Don't dim the page or block the target.
- Don't use a tour to explain an interface that should explain itself.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Tour` as first used in its preview:

```tsx
import { Tour } from 'altitude-design';

<Tour open={open} onOpenChange={setOpen} onFinish={(how) => setSaid(how === 'done' ? 'Tour finished.' : 'Tour skipped.')} steps={[
  { target: '#tour-projects', title: 'Projects moved here', body: 'All your projects now live in one place.' },
  { target: '[data-tour="owner"]', title: 'Filter by owner', body: 'Type a name to see only their projects.' },
  { target: '[data-tour="new"]', title: 'Start something new', body: 'Projects can start from a template.' },
]} />
```

The full preview, as rendered in Storybook and checked in CI (`tr`, `bar`, `row`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Input, Tour } from 'altitude-design';

export default function App() {
  const [open, setOpen] = React.useState(false);
  const [said, setSaid] = React.useState('');
  return (
    <div className="tr">
      <div className="bar">
        <Button variant="ghost" id="tour-projects">Projects</Button>
        <Input size="sm" placeholder="Filter by owner" aria-label="Filter by owner" data-tour="owner" style={{ maxWidth: 220 }} />
        <span style={{ marginLeft: 'auto' }}><Button variant="primary" data-tour="new">New project</Button></span>
      </div>
      <div className="row"><Button onClick={() => setOpen(true)}>Take the tour</Button></div>
      <p className="cap">{said || 'The tour points at one thing at a time with a ring. The page isn\'t dimmed and stays usable: try typing in the filter while it\'s on that step.'}</p>
      <Tour open={open} onOpenChange={setOpen} onFinish={(how) => setSaid(how === 'done' ? 'Tour finished.' : 'Tour skipped.')} steps={[
        { target: '#tour-projects', title: 'Projects moved here', body: 'All your projects now live in one place.' },
        { target: '[data-tour="owner"]', title: 'Filter by owner', body: 'Type a name to see only their projects.' },
        { target: '[data-tour="new"]', title: 'Start something new', body: 'Projects can start from a template.' },
      ]} />
    </div>
  );
}
```
<!-- /example -->
