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
