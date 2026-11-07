# A first impression built for a hand

7 November 2026 · promotional-site strategy and implementation specification

## Decision

At the compact breakpoint (640 CSS px and below), replace the desktop workbench with three short, tap-first tasks: **Book**, **Tune**, and **Edit**. Lead with choosing a time. Show the selected time in a bottom sheet, let the visitor confirm it, and leave a visible local receipt. Keep the existing planning, writing, and agent-review workbench on wider screens.

The point is to demonstrate Altitude's distinctive behavior in a space where the action and its consequence can be seen together. This is a hypothesis about first impressions, not a measured conversion improvement.

## What we examined

The starting point is `4c4a3df` on `main`, package version 0.32.1. The published homepage inspected during research displayed 0.32.0. Sources within the repository are the root README, the design guide, Elevation, Mobile, Motion, Distinctiveness, the earlier [mobile research](../mobile/README.md), framework guidance, component implementations, and the site build.

The [competitive audit](competitive-audit.md) records primary-source comparisons, narrow-screen observations, source links, and limitations. The earlier October mobile audit is historical evidence, not a list of current defects: many of its fixes are now implemented. No private analytics, visitor interviews, or device lab results were available for this pass.

The [validation record](validation.md) includes the implementation checks, screenshots, bundle impact, and remaining physical-device and human evaluation.

## The current experience

`site/main.tsx` puts `Workbench` immediately after the introduction. `site/workbench.tsx` initially selects the planning scene. It uses the real Board, BoardColumn, BoardCard, and Avatar components, with local pending/committed states and a visible move button. The secondary scenes demonstrate InlineEdit recovery and Confirmation with DiffView.

The board is not incapable of touch. It supports touch pickup, and the site's move buttons provide a tap path. Its composition is the mismatch: `site/workbench.css` retains three columns, each about 240px wide. At a 390px viewport the first lane fills most of the available frame and the destination is outside the visible area. A visitor must explore horizontal space before seeing the outcome. The theme action also occupies a separate row, adding height before the task.

The framework's own [Mobile guide](../../../project/Mobile.md) says content should change form when space runs out, page scrolling should remain vertical, and touch should not depend on hover. Replacing the phone's first task follows that policy without changing Board's general contract.

## What should be distinctive

Altitude is both a component foundation and guidance for reliable product workflows. Its strongest visual proof is the transition between an opening, an intentional choice, a live action, and a settled record. Its strongest behavioral proof is that a failed save keeps the person's draft. A phone can demonstrate both with ordinary taps.

| Candidate | Phone fit | What it proves | Decision |
| --- | --- | --- | --- |
| TimeSlotPicker + Sheet + Button | Large, labelled choices; a short vertical task | A well fills; review rises; the accepted result becomes a record | Lead scene |
| RadioGroup + Switch | Immediate, reversible taps; no typing | One raised radio thumb, filled switch trench, state reflected in useful copy | Second scene |
| InlineEdit + failure control | One field, with optional typing | Draft, pending write, failed write, recovery and accepted value | Third scene |
| Confirmation + DiffView | Good for short changes, but more reading | Human approval and actual resulting content | Keep in desktop workbench and linked agent demo |
| Board / DataGrid / week Schedule | Valuable spatial tools; more discovery at narrow widths | Dense coordination and comparison | Keep in their existing desktop/example contexts |
| Small charts or ornamental phone mockups | Easy to make attractive, harder to inspect | Mostly appearance unless carefully tied to a task | Defer; no evidence they serve this first action better |

## Alternatives considered

1. **Three short tasks, recommended.** Uses components already shipped, shows different kinds of depth, and connects each action to an observable result. It adds a small site-only composition and a responsive routing boundary.
2. **Adapt the board into a one-column task list.** Lowest content change, but still sells project management and repeats a familiar list. It hides much of what makes the Board interesting and does not broaden the mobile component set.
3. **A gallery or auto-playing carousel of mobile controls.** Shows breadth quickly, but disconnected controls make it harder to understand what the system protects. Auto-advance competes with reading and input. We use explicit tabs and one task at a time instead.

## Experience specification

### Book: choose, review, confirm

Use a fictional Fieldwork Studio session with a clearly named sample day, duration, and local-only scope. Show six times, including a booked state. Nothing is selected initially. Choosing a free time fills its well and enables **Review time**. The review opens a real `Sheet side="bottom"`, named by its title, with the chosen time and session details, a visible cancel path, and **Confirm demo booking**. Confirmation creates a local receipt; it never calls a booking service, requests permissions, collects contact details, or implies a real reservation. The sheet closes, focus has an eligible destination, and the visitor can choose another time or reset.

The first choice should be visible in the initial 390×844 viewport. At 320px or short landscape heights, ordinary vertical scrolling remains acceptable; do not shrink controls to force everything above the fold.

### Tune: choices with an immediate result

Show a short reminder preference task using `RadioGroup` and `Switch`. The radio choice changes a visible summary or preview; the switch determines whether that reminder is included. Make the setting's local demo scope explicit. No browser-notification permission, subscription, or external side effect. A visible result is essential: controls that change only themselves would be a component sampler, not a workflow.

### Edit: keep the draft through failure

Reuse the existing `WritingScene` behavior, with a more compact composition if necessary. The note title edits in place. **Fail next save** deliberately refuses one local save. The field keeps its draft and error; a second save accepts the edited value. Keep the recovery control visible and labelled. Async waits must resolve as cancelled on reset or unmount, so old work cannot overwrite a new demo.

### Navigation, scheme, and state

Use the compact width for content selection, independently of pointer capability; a narrow desktop window also benefits. Use media queries for hover/coarse-pointer styling, never user-agent sniffing. Keep exactly one AltitudeProvider. Only one showcase family is mounted, avoiding hidden live regions and portalled overlays escaping a CSS-hidden demo.

Within the mobile showcase, preserve each scene's state when switching tabs. Reset clears all scene state deliberately. A switch across the compact breakpoint starts the other showcase fresh and cancels outgoing local operations; note this in the demo's scope text or accessible status. If focus belonged to the outgoing showcase or its sheet, move it to the new showcase's stable labelled container; do not steal focus from unrelated page content. Scheme switching keeps the active task and state.

## Elevation contract

| Part/state | Tier and level | Surface / shadow | Meaning without height |
| --- | --- | --- | --- |
| Intro, frame, task details, receipt | Ground 0 | `surface-ground` / `elev-0` | Headings, labelled details, confirmation text |
| Free time | Sunk −1 | `surface-well` / `well` | Radio role, time label, unchecked state |
| Chosen time | Existing picker selection treatment | Accent fill + raised check | `aria-checked`, check mark |
| Radio / switch | Existing choice treatment | Trench plus raised thumb | Label and checked state |
| Main action | Raised 2 | Existing primary Button tokens | Verb and outcome |
| Review sheet | Floating 4 | `surface-overlay` / `elev-4` | Named dialog, visible close and cancel |
| Note draft / pending / failure | Existing InlineEdit treatments | Raised / lifted / critical trench | Editable field, saving text, inline error |

No new surface colors, shadows, spring library, stock imagery, decorative chart, or bespoke gesture engine. Site CSS owns composition; Altitude owns component states and motion. Keep reduced motion and forced colors inherited from the components.

## Implementation boundaries

The change belongs to `site/`, the site's build/check integration, and this research folder. It does not change public component APIs, token meanings, package contents, or require a package version bump. The existing desktop board remains the wide-screen default. Example-app links, install instructions, the agent page, and repository navigation remain available.

The existing build inlines the homepage script, styles, and gallery previews. Mounting only one showcase reduces active work, but does **not** eliminate the unused family's download bytes. Record before/after script size and keep additional code small; code-splitting the portable site artifact is a separate architectural change.

## Acceptance and follow-up

- Exercise 320, 375, 390, 430, 640, 641, 768, and desktop widths. No sideways page scrolling; booking choices and tab controls remain operable.
- Check daylight/nightfall, reduced motion, forced colors, touch, and keyboard. Touch targets use Altitude's ≥44px policy, distinct from WCAG 2.5.8's 24px minimum and spacing exceptions.
- The time picker's direct `TimeSlot` children keep its keyboard model intact: arrows/Home/End move focus without selecting, Space selects, and Enter selects outside a form (inside one it submits).
- Book, cancel, rebook, reset, change tabs, and change scheme. Confirm that the visible result names the chosen time and never promises a real booking.
- Fail a title save, verify the draft survives, retry successfully, and reset during a pending save. No late status or focus theft.
- Resize with focus in a control and while a sheet is open; verify teardown, scroll unlock, no orphaned dialog, and deliberate focus recovery. Resize with focus elsewhere; keep it there.
- Retest the desktop board move button, desktop writing and review scenes, example links, and installation section.
- Run type checks, the site build, repository tells lint, existing state tests, and the focused browser suite. Automated checks do not establish complete accessibility or physical-device behavior.

Before claiming a better mobile conversion rate, run a small observed usability comparison: can visitors explain what changed, complete a booking, recover a failed save, and find installation? Record first-action time, task completion, recovery success, accidental actions, and component/docs click-through. If analytics are later added, define events and consent/data handling separately; this PR adds no tracking. Physical iOS Safari/Android keyboard behavior, VoiceOver/TalkBack, and real thumb comfort remain manual validation tasks.
