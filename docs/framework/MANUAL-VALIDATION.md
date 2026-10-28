# Manual validation and application obligations

The deterministic suite checks specific contracts, not complete WCAG conformance or usability. Patterns remain experimental. No participant study or screen-reader review was performed by this implementation task.

## Manual release matrix

Record tester, date, OS/browser/AT versions, scheme, input method, steps, observed result and defects. Use the four Patterns stories, then repeat in the consuming application's real processes.

| Journey | Keyboard | Screen reader | Visual settings |
| --- | --- | --- | --- |
| Edit record | Empty submit → summary → linked field → correction → delayed failed save → retry; Tab through pending; Cancel/Back retain and discard | Names, required state, one useful error announcement, status after persistence; no false “saved” for newer edits | 320 CSS px, 200% text zoom, long localized labels, RTL, reduced motion, forced colors |
| Async collection | Search → no results → reset; failed refresh → retry; selection across filter/refresh | Loading versus refresh; result count; old results explicitly identified while refreshing; selection policy understood | Same modes; long names, touch targets, scroll and reading order |
| Consequential action | Confirm target; Cancel does nothing; failure → retry; removed trigger focus fallback; real Undo | Name and consequence; busy and error; logical destination after removal; restoration matches data | Same modes; lengthy consequence copy and no motion-dependent progress |
| Review and submit | Review → correct → retained answers → failed send → retry → persistent receipt | Process position, error navigation, actual receipt, repeated send prevented | Same modes; long answers and translated button labels |

Recommended manual environments: Safari + VoiceOver on macOS, Firefox + NVDA and Chrome/Edge + JAWS on Windows, and iOS Safari + VoiceOver for touch. These combinations are proposed coverage, not asserted support evidence. Record any unavailable environment as not run.

## Application review

- Define the actual user task, important consequences and appropriate alternative (inline edit, dialog, route, review process).
- Supply business validation and meaningful labels; confirm validation timing fits the task.
- Integrate save/query adapters with real persistence, version conflicts, permissions, pagination and durable receipts where needed. The framework cannot verify a lying success callback.
- Route cancel, Back and internal navigation through the dirty-leave decision; use an application-owned beforeunload policy if reload/close protection is appropriate. A hook cannot intercept every router.
- Define selection across pages, filters and removed identities. Never turn denied or failed data into an empty-success state.
- Supply a genuine inverse operation before offering Undo. A confirmation is only intent; an operation still needs its own result.
- Test lost connectivity, interrupted sessions and retries against backend idempotency policies. Durable draft recovery and cross-session storage belong to the application.
- Validate terminology, comprehension and task success with representative people, including disabled participants. Use observed defects to prioritize pattern changes.

## Evidence format

Every finding should include rule ID, classification (`deterministic`, `integration`, `contextual`), observed evidence, expected behavior and concrete repair. Contextual heuristics and experimental elevation hypotheses do not automatically fail CI. Suppressions need a reason, scope, owner and review date. Successful axe scans mean only that the executed rules found no violations in the tested states.
