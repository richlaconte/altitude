# Screen layout

Choose a screen's frame from the person's task. The same sidebar, top bar and grid of cards or table on every screen is the most recognisable structure of a generated app, and it fits only one task: working through many similar records. Name the task first, then choose the frame that fits it.

## Inputs and ownership

Before placing anything, write down four things in the application's design record: **the task** in one sentence (who is here and what they came to do), **the lead** (the one thing the screen is about), **the primary action** (one, or none), and **what comes next** once the task is done. The application owns them; this pattern only turns them into a frame. If two leads compete, the screen is two screens, or one of them is secondary.

### Recognition plan

Also name what someone needs to recognize before reading the whole view. Select a small set of cues that answer that question: identity, type, status, grouping, selection, content previews or direct data labels. [Distinctiveness](../../Distinctiveness.md#recognition-alongside-quiet-content) compares useful cues with redundant decoration. A cue can be a stable position, a word or a group, not necessarily an icon. Its prominence serves the task; the application owns the vocabulary and the audience's familiarity with it.

```text
Recognition question: which ticket is on hold, who sent it, and which one is open?
Cues: status plate with words; subject and requester in stable row slots;
      selected row paired with the same subject in the detail heading
Quiet content: previews and settled status stay on ground; controls retain their tiers
Meaning without color/depth: named status, full preview description, aria-selected
Evidence: existing public-component behavior; contextual maintainer preference for
          compact rows and useful visual references, not a measured recognition gain
Negative evidence: a selected 1/5 dashboard was still disliked, not approved
Uncertainty: audience interpretation of status vocabulary; assessment order unknown
Review: same records/task at desktop and 320px, forced colors and reduced motion
```

Keep the evidence source/version, task and alternatives, displayed order if known, absolute ratings, comparative choice, reasons, rejected options and uncertainty. A relative winner does not erase a low score or “both disliked”; an unavailable or broken stimulus is not negative preference evidence. Distinguish observation, personal preference and design inference. Do not promote one person's taste into a universal aesthetic or accessibility rule.

Preserve visible words and programmatic relationships when cues collapse or reflow. Status must not depend on color; an unfamiliar icon must not replace its readable label. Decorative image alternatives can be empty when adjacent text already gives the meaning, while meaningful content previews need equivalent information. Use existing component contrast and forced-color treatments; keep the question answerable when motion is reduced. A screen-reader-only name does not repair an unclear visible icon for a sighted person.

The existing [Support inbox](../../../examples/apps/support-inbox/app.tsx) demonstrates this plan with matching seed content: find “Invoice for March” in All, identify “On hold” and its requester, open the same ticket, then distinguish conversation from internal notes. Its existing `InboxList`, `Badge`, headings and named presence are the cues. Presence means someone is viewing/replying, not that they own the ticket. The [review record](../../../docs/research/recognition-cues.md) keeps engineering observations separate from unrun participant evaluation.

## States and transitions

Name the task, choose the frame from the table, build it, then check the build against what you wrote. Every stated choice must be visible on the screen: if the record says the draft leads, the draft is the first thing after the title and the largest thing in the view. If it isn't, change the screen or the record. When the task is done, say so where the lead was, with the next thing to do.

| Frame | Fits when the person came to | What leads | Built from |
| --- | --- | --- | --- |
| Records | find, compare and act on many similar records | the table, filtered | `AppShell`, `FilterBar`, `DataTable`, `Sheet`: the [app skeleton](../app-skeleton.md) |
| List and detail | triage: work through items one at a time | the open item | `ResizablePanelGroup` (it stacks when narrow), an `InboxList`, a `PropertyList` |
| Focused editor | make or change one thing | the thing being made | `Breadcrumb` back, `PageHeader` with one primary action, the editor, `SyncIndicator` or `SaveBar` |
| Guided flow | set something up in order | the current step | `Stepper` and the [review and submit](review-submit.md) contract |
| Decision | approve, choose or confirm | the choice and its consequence | the [consequential action](consequential-action.md) contract, `PlanPicker`, `Confirmation` |
| Report | read and understand | a chart with a `takeaway`, or one `Stat size="hero"` | `ChartContainer`, `Stat`, `StatGroup` for the secondary numbers ([Charts](../../Charts.md)) |

**Focused editor.** No navigation sidebar: a breadcrumb back is enough. The thing being made fills the column; details about it sit beside it, narrower and quieter. The one primary action (Publish, Send) is in the page header; saving is a status, not a second button.

**Decision.** The question is the title. The consequence, in words, and the two choices sit together straight under it, before the evidence; the evidence follows for whoever needs it. Declining asks for its reason in place. Once decided, the outcome replaces the choice and points to the next request.

**Report.** The takeaway is the heading of the chart that leads, written from the data. Secondary numbers follow, smaller and grouped, never as a row of equal cards above the chart.

## Content, keyboard, focus and announcements

The title says the task's object ("Week 44 release note", "Refund €420 to Quarry Lane Vets?"). Reading order follows importance: title, lead, primary action, then the rest. Each frame keeps a keyboard path through the lead and returns focus where an action started: cancelling a decline returns to Decline, and an outcome takes focus when it replaces the control that had it. Saving and outcomes are announced as status. Every frame fits at 320px, where the side column stacks under the lead.

## Recovery and working implementation

If the task changes, re-choose the frame instead of adding a second lead. The working examples are `build/fixtures/patterns/screen-layout-editor.jsx`, `screen-layout-decision.jsx` and `screen-layout-report.jsx` (shipped under `references/build/fixtures/patterns/`), each with its design record in its first lines. They're also the Storybook previews "Patterns/ScreenLayoutEditor", "Patterns/ScreenLayoutDecision" and "Patterns/ScreenLayoutReport"; the records frame is the [app skeleton](../app-skeleton.md). [Metadata](screen-layout.json) names the verification sources.

## Rules, verification and evidence

`ALT-LAYOUT-001` covers naming the task, the lead and the primary action before choosing a frame; `ALT-LAYOUT-003` covers the recognition plan and scoped evidence as contextual review; `ALT-VISUAL-002` covers one primary action per view; `ALT-VISUAL-003` covers what must not rise. `build/checks/screen-layout-pattern.mjs` checks each example in a browser: the stated lead is first after the title and the largest region, there's at most one primary action, and its keyboard and focus behaviour. `build/checks/example-support-inbox.mjs` checks the worked recognition task's labels, relationships and narrow/desktop presentation. Those observations do not measure human recognition or satisfaction. `build/checks/render-tells.mjs` reports unled equal sets and flat stacks. Structure is where generated interfaces converge most (Research, "Generated interfaces converge"); whether naming the task first moves agents away from the default is unmeasured until the distinctiveness benchmark runs with and without this pattern.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
