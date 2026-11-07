# Screen layout

Choose a screen's frame from the person's task. The same sidebar, top bar and grid of cards or table on every screen is the most recognisable structure of a generated app, and it fits only one task: working through many similar records. Name the task first, then choose the frame that fits it.

## Inputs and ownership

Before placing anything, write down four things in the application's design record: **the task** in one sentence (who is here and what they came to do), **the lead** (the one thing the screen is about), **the primary action** (one, or none), and **what comes next** once the task is done. The application owns them; this pattern only turns them into a frame. If two leads compete, the screen is two screens, or one of them is secondary.

## States and transitions

Name the task, choose the frame from the table, build it, then check the build against what you wrote. Every stated choice must be visible on the screen: if the record says the draft leads, the draft is the first thing after the title and the largest thing in the view. If it isn't, change the screen or the record. When the task is done, say so where the lead was, with the next thing to do.

| Frame | Fits when the person came to | What leads | Built from |
| --- | --- | --- | --- |
| Records | find, compare and act on many similar records | the table, filtered | `AppShell`, `FilterBar`, `DataTable`, then a detail surface chosen below: the [app skeleton](../app-skeleton.md) demonstrates a `Sheet` |
| List and detail | triage: work through items one at a time | the open item | `ResizablePanelGroup` (it stacks when narrow), an `InboxList`, a `PropertyList` |
| Focused editor | make or change one thing | the thing being made | `Breadcrumb` back, `PageHeader` with one primary action, the editor, `SyncIndicator` or `SaveBar` |
| Guided flow | set something up in order | the current step | `Stepper` and the [review and submit](review-submit.md) contract |
| Decision | approve, choose or confirm | the choice and its consequence | the [consequential action](consequential-action.md) contract, `PlanPicker`, `Confirmation` |
| Report | read and understand | a chart with a `takeaway`, or one `Stat size="hero"` | `ChartContainer`, `Stat`, `StatGroup` for the secondary numbers ([Charts](../../Charts.md)) |

**Focused editor.** No navigation sidebar: a breadcrumb back is enough. The thing being made fills the column; details about it sit beside it, narrower and quieter. The one primary action (Publish, Send) is in the page header; saving is a status, not a second button.

**Decision.** The question is the title. The consequence, in words, and the two choices sit together straight under it, before the evidence; the evidence follows for whoever needs it. Declining asks for its reason in place. Once decided, the outcome replaces the choice and points to the next request.

**Report.** The takeaway is the heading of the chart that leads, written from the data. Secondary numbers follow, smaller and grouped, never as a row of equal cards above the chart.

## Choose the detail surface

Choose this separately from the screen's frame. Record the detail task, expected duration and information size, edit scope, comparison needs, available viewport, whether the surrounding records must remain usable, and whether this work needs a durable URL or history entry. Use the existing [edit-record](edit-record.md) contract for persistence and drafts; a single-value change usually belongs in `InlineEdit`.

| Presentation | Useful when | Boundary to evaluate | Source and layout policy |
| --- | --- | --- | --- |
| Anchored disclosure, such as `Popover` | A short read or small interaction belongs to one visible source and is quickly dismissed. | Long structured content, many fields, narrow/zoomed space, or comparing more than one record. A popover is not a durable destination. | Name the source; preserve its trigger and close path. The overlay does not reserve space or reflow the list, but can obscure neighbouring content. |
| Inline expanded detail (`DataTable renderExpanded`) or a reserved region | Reading in context benefits from visible source cells; repeated detail viewing can use space allocated before opening. | Expansion that moves subsequent rows, lost scan position, or comparison that needs several details visible. | Read-only detail stays on the ground. An expanded row changes layout; a reserved pane already occupies space. State which behaviour the task can tolerate. |
| Persistent inspector or nonmodal `Sheet` | Several fields or sustained inspection need room while the records remain operable; repeated selection updates the same named detail. | A floating panel can cover the next target; cramped panes do not provide useful comparison. | Prefer reserved ground-level space when simultaneous reading matters. A nonmodal Sheet remains level 4 and overlays space; it does not reserve it. Identify the current source and provide a keyboard path between regions. |
| Modal `Sheet` | A bounded task needs more room and temporarily suspending the surrounding records is intentional, as in the [records skeleton](../app-skeleton.md). | Repeated cross-record comparison or continued queue interaction: a modal background is unavailable. | Name the record in the Sheet, keep a stable opener and a close/focus-return strategy. Sheet is level 4, below the summit. |
| Route | Extended reading/editing, complex history, sharing/bookmarking or independent navigation needs a destination. | Losing the list query, scroll position, selected record or unsaved draft on return. | Give the route a record-specific title and URL. Preserve return context and define Back/forward behaviour; a new overlay alone cannot provide these. |

A genuine blocking decision can use a level-5 `Dialog`; it is not the default container for record details. No field count decides the surface by itself. Opening more than one detail for comparison needs an intentional comparison layout, not stacked popovers or sheets.

### Source correspondence

Bind the detail to a **stable record ID**, never a row index. Repeat a readable source name in the detail; use a visible current-item marker when the list remains usable. Keep bulk selection distinct from the one record being inspected. Use disclosure state and relationships where applicable; proximity, shadow and colour are insufficient by themselves.

Specify keyboard entry, Tab order, Escape/visible close, and return to the surviving source control. If it was filtered out, moved out of view or removed, choose a named logical fallback, such as the collection heading or the next relevant record. If the source changes, keep the ID binding and show the current name/state; never silently retarget the detail. Respect focus that has already moved to another meaningful destination. A modal must release its isolation before an application focuses the background.

At 320 CSS pixels and at zoom, choose whether to keep a readable overlay, stack reserved regions, or show a single detail view with Back. Preserve the active ID, draft and return context across the change. Test long content, scrolling to the last control, source removal and focus under sticky headers or nonmodal overlays. Reduced motion keeps names, selection and state meaningful without travel. These are review cases, not proof that one presentation is always best.

Add a short detail record alongside the task/lead record:

```text
Detail task: inspect a release's owner and deadline while scanning a queue
Presentation: anchored detail for this short read; release history has a named route
Source correspondence: current row and repeated release name, bound to release ID
Layout policy: overlay; opening does not reflow the queue, neighbouring targets remain reachable
Boundary: compare two long histories in a reserved comparison region or a route
Focus/close: enter the detail; Escape returns to the surviving source; otherwise Releases heading
Evidence: local preference favoured source connection; long-detail comparison remains unresolved
```

This chooser is a **contextual pattern**, not a deterministic aesthetic rule. The maintainer's reported short anchored-detail preference (5/5) motivates preserving source correspondence. Choosing anchored long detail at 2/5 does not approve that implementation or establish a universal popover default. Preserve absolute ratings, rejected options and uncertainty in the design record. [Research and alternatives](../../../docs/research/detail-surfaces/README.md) distinguish that preference from standards, platform practice and new engineering checks.

## Content, keyboard, focus and announcements

The title says the task's object ("Week 44 release note", "Refund €420 to Quarry Lane Vets?"). Reading order follows importance: title, lead, primary action, then the rest. Each frame keeps a keyboard path through the lead and returns focus where an action started: cancelling a decline returns to Decline, and an outcome takes focus when it replaces the control that had it. Saving and outcomes are announced as status. Every frame fits at 320px, where the side column stacks under the lead.

## Recovery and working implementation

If the task changes, re-choose the frame instead of adding a second lead. The working examples are `build/fixtures/patterns/screen-layout-editor.jsx`, `screen-layout-decision.jsx` and `screen-layout-report.jsx` (shipped under `references/build/fixtures/patterns/`), each with its design record in its first lines. They're also the Storybook previews "Patterns/ScreenLayoutEditor", "Patterns/ScreenLayoutDecision" and "Patterns/ScreenLayoutReport"; the records frame is the [app skeleton](../app-skeleton.md). [Metadata](screen-layout.json) names the verification sources.

## Rules, verification and evidence

`ALT-LAYOUT-002` covers the contextual detail-surface and source-correspondence decision, with `build/checks/app-skeleton.mjs` checking the worked example; it adds no automatic surface-choice failure. `ALT-LAYOUT-001` covers naming the task, the lead and the primary action before choosing a frame; `ALT-VISUAL-002` covers one primary action per view; `ALT-VISUAL-003` covers what must not rise. `build/checks/screen-layout-pattern.mjs` checks each example in a browser: the stated lead is first after the title and the largest region, there's at most one primary action, and its keyboard and focus behaviour. `build/checks/render-tells.mjs` reports unled equal sets and flat stacks. Structure is where generated interfaces converge most (Research, "Generated interfaces converge"); whether naming the task first moves agents away from the default is unmeasured until the distinctiveness benchmark runs with and without this pattern.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
