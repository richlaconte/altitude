# Choosing a detail surface

Research and design decision for [#616](https://github.com/richlaconte/altitude/issues/616), reviewed 7 November 2026 against `4378c0c8533ec771ccc3322fa1d7aca6c339c951` (`altitude-design@0.31.20`). The user requested research followed by an implementation PR. This is a contextual composition decision, not a new component or a change to Sheet's modal default.

## Question and evidence boundaries

How should a person inspect or edit one record while retaining a meaningful relationship to its source? “Connected” can mean spatial proximity, persistent identity, a visible current-item state, a dependable return path, or several of these. It does not require every detail surface to be anchored.

The issue reports the maintainer's November 6–7 assessments: anchored detail received 5/5 for connection to the item; the later long-detail/comparison choice was still anchored but rated 2/5. The second result is negative evidence about that implementation and an unresolved boundary, not approval. Those assessment summaries are the evidence available here; the raw studies were not independently inspected. They are one person's contextual preference, not population evidence or an accessibility requirement. No new participant study is conducted in this change.

The existing screen-layout contract chooses six frames. Its records row names Sheet; the skeleton illustrates three properties in a modal Sheet. The edit-record contract already prefers InlineEdit for a single value and a route for extended work. Sheet, Popover, DataTable expansion and ResizablePanelGroup already cover the relevant presentations. The gap is the decision and source contract at the composition entry point.

## Primary sources and implications

| Source, accessed 2026-11-07 | What it supports | Limit and application decision |
| --- | --- | --- |
| [WAI-ARIA APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Modal entry, contained Tab order, Escape, named content, visible close control and logical focus return when the invoker no longer exists. Long structured content may need initial focus near its beginning. | Informative widget guidance, not a mandate to make record details modal. Keep the existing component contract; explicitly plan a fallback. |
| [WAI-ARIA APG disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) | A disclosure has an operable button and expanded state, with an optional relationship to the revealed content. | An inline disclosure need not steal focus. Do not copy a modal's focus trap into settled inline detail. |
| [WCAG 2.2 Focus Order understanding](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) | Sequential focus must preserve meaning and operation; more than one logical sequence can be valid. | Physical closeness alone cannot establish an accessible relationship. Define reading and keyboard paths for each presentation. |
| [WCAG 2.2 Reflow understanding](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Non-excepted content must remain usable at a width equivalent to 320 CSS pixels; 1280px at 400% zoom is the stated equivalence. Data-table layout has an exception, but its individual content still matters. | Do not compress a two-pane comparison into two unreadable columns. A 320px browser check is a reflow proxy, not complete zoom or assistive-technology validation. |
| [WCAG 2.2 Focus Not Obscured understanding](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | Author-created content must not entirely hide the focused component, with specific exceptions for user-opened/movable content. | A nonmodal panel needs overlap and focus checks; “page still interactive” is not enough. Prefer reserved space when repeated comparison needs both regions. |
| [Android canonical list-detail layouts](https://developer.android.com/develop/ui/views/layout/canonical-layouts) | Wide layouts can show list and detail together; compact layouts show one at a time with Back. Selection and state survive configuration changes. | Platform practice, not a web standard or an Altitude breakpoint rule. Preserve record identity and return state if a web layout changes presentation. |
| [GOV.UK Details](https://design-system.service.gov.uk/components/details/) | Optional information can be disclosed to help scanning; information needed by most people should remain visible. The guide records discoverability and voice-assistance concerns. | Service-form guidance does not prove record popovers work. Keep essential comparison values in the source view and use understandable disclosure labels. |

WCAG's normative criteria are separate from the informative explanations above. The new rule is `contextual-pattern` / `contextual-review`; it does not turn a heuristic surface choice into a deterministic lint error.

## Alternatives considered

1. **A universal anchored-detail default.** Strong visible proximity for a short read, low navigation cost, and a direct reading of the reported preference. Rejected as a general default: long content, touch/zoom and simultaneous comparison strain the surface; the 2/5 assessment specifically leaves that case unresolved.
2. **Keep Sheet as the records default and add a short caveat.** Small documentation change and ample editing room. Rejected as the shared policy: modality prevents continued queue interaction, a temporary overlay does not supply durable navigation/history, and it conceals the criteria that choose among valid existing components.
3. **A task-based chooser plus a source-correspondence contract.** Selected. It reuses public components, keeps the skeleton's existing Sheet as a justified bounded editing example, and records when it should give way to reserved detail, a nonmodal inspector or a route. It costs a short design record and contextual review, rather than adding runtime APIs.

## Decision

The chooser weighs task duration, amount and structure of information, editing scope, comparison, viewport, background interaction, and URL/history requirements. It distinguishes reserved space from new expansion that shifts neighbouring rows. There is no field-count threshold, universal overlay ban, or requirement to reserve space for every detail.

Source correspondence is a separate invariant: bind the detail to a stable record identity, name that record visibly, distinguish a current detail from bulk selection, preserve a meaningful disclosure/entry relationship, and specify return behaviour after source reorder, rename, filtering or removal. Do not silently retarget an open detail by row index. On a compact layout, preserve selection and query/scroll state when moving to a single detail view.

The records skeleton keeps a modal level-4 Sheet because the demonstrated task edits two short properties on one customer before resuming the queue; the surrounding records do not need to remain operable during that edit. Customer name and identifier identify the detail. Opening it does not reflow the table. For sustained reading, several-record comparison or durable links, an application should evaluate a reserved inspector or a route instead. A true blocking decision uses a level-5 Dialog; Sheet is not the summit.

The example captures its stable source control before opening, keeps the component's normal focus return for surviving sources, and supplies an application-owned Customers-heading fallback after modal isolation releases if the source disappears. It does not add a Sheet API or hard-code animation timing. A newer meaningful focus destination must not be overwritten.

## Verification plan and limits

Extend the existing AppSkeleton browser check with keyboard entry/return, changing a property while retaining source identity, source DOM removal, long structured content, close reachability, narrow reflow and reduced motion. The removed-source and long-content tests are explicit DOM adversarial probes, not claims about a backend deletion or production data distribution. Keep the existing complete skeleton checks passing. Render both schemes, rebuild canonical previews, run framework schema/reference/freshness and packed installed-consumer checks, and record actual results separately in `VALIDATION.md`.

Human task effectiveness, assistive-technology behaviour across combinations, real browser zoom and the best presentation for long comparisons remain unmeasured. The chooser makes those decisions reviewable; it cannot decide them from the local preference scores.
