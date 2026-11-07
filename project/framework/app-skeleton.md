# App skeleton

Start from the task: [screen layout](patterns/screen-layout.md) chooses a screen's frame from what the person came to do. This skeleton is the records frame, for finding, comparing and acting on many similar records; a focused editor, a decision or a report is laid out differently.

A starting point for a records app, with Altitude's parts composed the way they're meant to be: copy it, then replace the data and the services. It's the Storybook preview "Patterns/AppSkeleton", and its source is `build/fixtures/patterns/app-skeleton.jsx` in the repository, type-checked against the public declarations.

## What it composes

- **The frame**: `AppShell` with a `Sidebar` of destinations (the current one on a raised pill) and a top bar with search. The shell is on the ground; nothing in it rises except what's pointed at.
- **A list page**: `PageHeader` with the view's one primary action ("Add customer") and a secondary one; a `FilterBar`; a `DataTable` with selection (a counted action for the selected rows) and server pagination. Follow the [async collection](patterns/async-collection.md) contract for loading, empty and failure states.
- **A record**: the customer name opens a modal `Sheet` with a `PropertyList` whose values are edited in place. This is a bounded edit of Plan or Seats, after which scanning resumes; the surrounding list need not remain operable during it. This choice follows the [detail-surface chooser](patterns/screen-layout.md#choose-the-detail-surface), not a records-app default. Closing returns focus to the surviving source button; if it disappears, focus goes to the Customers heading after modal isolation releases.
- **Settings**: `SettingsSection` and `SettingsRow`, fields saved together with the `SaveBar`, and a switch that applies immediately. See the [settings](patterns/settings.md) contract.
- **An empty view**: an `EmptyState` with its one action.

## Rules it keeps

One primary action per view (`ALT-VISUAL-002`); the single summit (Dialog and CommandPalette are level 5; Sheet is level 4, below it); states that don't rise (`ALT-VISUAL-003`). `build/checks/app-skeleton.mjs` checks the composition in a browser: one primary per view, keyboard navigation through the sidebar, filtering, paging, selection, the sheet and its focus return, and the SaveBar. Replace its demo services with yours and keep those behaviours.

## Detail design record

- **Task and surface:** edit one customer's Plan or Seats, then resume the same filtered/paged queue. A modal Sheet gives these bounded fields room without making the list reflow; it intentionally pauses list interaction.
- **Source identity:** the stable customer ID binds the Sheet and its name/identifier name the record. Bulk-selected rows remain a separate action set. Renaming or updating a record must not retarget its detail by array position.
- **Layout policy:** the Sheet overlays the queue, rather than allocating a new table row. It can cover the queue; this is acceptable for this serial edit, not simultaneous comparison.
- **Long-content boundary:** the fixture checks scrolling and close reachability with injected long content. That does not make a long history or several-record comparison suitable for this Sheet: evaluate reserved detail or a route, with query/scroll return and durable URL where needed.
- **Focus and close:** keyboard entry starts from the named customer button. Escape and Close use Sheet's existing return contract. When the opener is disconnected, the application waits for isolation to release and focuses the Customers heading, unless focus has already moved to another meaningful destination. It does not guess an animation delay.
- **Evidence and uncertainty:** engineering checks cover this bounded example, including a removed-source DOM probe, a changed property and 320px/reduced-motion cases. They do not establish human comprehension, real service deletion behaviour, complete accessibility or the best long-detail presentation. The reported 2/5 anchored long-detail choice remains negative evidence about that example.

The fixture's opening design record and [validation record](../../docs/research/detail-surfaces/VALIDATION.md) state the same scope. Replace the simulated service and review the actual product's source removal, permissions, drafts and history policy.
