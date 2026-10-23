# Altitude Actions in place specifications

This package specifies the library work needed to turn the revised Hover State direction into reusable Altitude behavior. The goal is to finish small tasks where they begin, offer real recovery for reversible actions, and reserve a focused dialog for decisions that need one.

**Delivery scope:** one new component (`InlineEdit`), two optional Dialog props plus shared modal fixes, two executable interaction recipes, and four required demo experiences. The behavior should be predictable without teaching users a new workflow.

**Status:** specifications complete; implementation tasks remain open. The earlier [Files prototype](https://altitude-rehearsal-rl.pakjones.chatgpt.site) illustrates the direction but does not implement these proposed library APIs. This package does not file upstream issues, change the library, or publish a package.

**Baseline:** `altitude-design` 0.2.1 at [`a7bd408f97c874c517b9139aa8a35b88b685cff0`](https://github.com/richlaconte/altitude/tree/a7bd408f97c874c517b9139aa8a35b88b685cff0), also remote `main` when checked on 23 October 2026. Paths inside the specifications are relative to the Altitude repository; this folder is a portable handoff package.

## Work to complete

| Spec | Deliverable | Required evidence |
|---|---|---|
| [ALT-01 Dialog foundation](01-dialog-foundation.md) | Per-dialog stationary background, isolation, lifecycle and focus recovery; existing defaults preserved | MOD criteria, regression coverage and D2 |
| [ALT-02 InlineEdit](02-inline-edit.md) | Reusable single-line editing with validation, async save, conflicts, keyboard and focus behavior | IE criteria; task-title and table-cell consumers in D1; reuse in D4 |
| [ALT-03 Act and recover](03-act-and-recover.md) | Application-owned archive/restore recipe using existing feedback components | REC criteria, real inverse operation, failures/conflicts, D3/D4 |
| [ALT-04 Confirmation](04-confirmation.md) | Copyable targeted confirmation with asynchronous lifecycle and safe focus recovery | CON criteria, exact-target and pending-close cases, D2/D4 |
| [ALT-05 Demonstrations and validation](05-demos-validation.md) | Canonical preview/Storybook demos, fixtures, accessibility checks and formative evaluation | DEM criteria and recorded accept/revise decision |
| [ALT-06 Delivery plan](06-delivery-plan.md) | Sequenced implementation tasks, file map, commands, integration and completion gates | T01–T10 complete with linked evidence |

The [task backlog](backlog.csv) provides the same work as importable rows with dependencies, owner roles, acceptance IDs and demo obligations. Roles are suggested responsibilities, not assignments to people.

## What should ship

1. **InlineEdit** owns temporary editing behavior. Applications own committed values, validation policy and persistence. Its exact proposed API and asynchronous result contract are in ALT-02.
2. **Dialog improvements** make modal behavior reliable and expose `background="stationary"` plus a lazy `returnFocus` fallback. A still background remains inert; visual quietness never changes modality.
3. **Act-and-recover and confirmation recipes** compose existing Altitude components. The application decides whether an operation is reversible and provides a real inverse operation. No public Undo or confirmation framework is needed for this first delivery.
4. **Documentation and demos** ship with the implementation. An interaction is not complete while its intended value can only be understood from a source file or this specification.

The shared design rule belongs in the proposed `project/ActionsInPlace.md` guide. Existing `Surface`, `Field`, `Input`, `Button`, `Alert`, `Toaster`, `Dialog` and depth tokens retain their meanings. Editing is not a pending write; pending begins only after persistence is dispatched. All behavior continues to work when motion or shadows are absent.

## Demonstrations that explain the value

| Experience | What the person does | What it must make clear |
|---|---|---|
| D1 Inline edit | Rename a task title and a table-cell value | The value stays where it lives; one shared component handles cancellation, saving and retained errors |
| D2 Dialog context | Delete an archived item using default and stationary presentation | Keeping the page visually still can preserve context while the dialog remains fully modal |
| D3 Recovery | Archive, Undo, then restore later from Archived | Confirmation can be omitted because recovery actually works and stays discoverable |
| D4 Integrated Files | Rename, archive, recover and permanently delete | The pieces form one ordinary application without new user-facing stages |

Three canonical preview sections deliver these four experiences; D3 and D4 share the ActionsInPlace example. The source is `build/previews.txt`, which already generates Altitude previews and Storybook. Fixture controls are separate from the product scene. Slow, failed, conflicting and uncertain saves are required test cases, not extra modes the product’s user must understand.

## Sequence and completion bar

Start T01, then implement the modal foundation and InlineEdit in parallel. Develop the recovery recipe alongside them. The confirmation recipe follows the Dialog changes; the integrated demo follows both components and recipes. Complete automated and manual checks before formative evaluation.

Every implementation package includes source, maintained declarations where relevant, documentation, generated artifacts, regression checks and its assigned demo. All acceptance checkboxes begin unchecked. Link evidence as work is completed; record missing access testing or unresolved observations as gaps. Specs are decisions for implementation, not evidence that the resulting design has already been validated.

The delivery plan targets a maintainer-ready change. Actual upstream issue creation, versioning and publication follow the repository’s normal process when requested.

## Deferred candidates

- **EditRegion:** consider only after at least two real multi-field consumers show common behavior not served by existing composition.
- **ConfirmAction:** consider only after multiple applications repeat the same confirmation contract; initially provide the recipe.
- **Shared action hook:** consider only after repeated async behavior warrants extraction; it must not infer risk, reversibility or persistence.
- **Universal action/draft workflow:** outside this scope. No preview stage, history workspace or review queue is introduced.

## Design and research references

The specifications follow [Altitude’s design guide](https://github.com/richlaconte/altitude/blob/a7bd408f97c874c517b9139aa8a35b88b685cff0/project/README.md), [Elevation](https://github.com/richlaconte/altitude/blob/a7bd408f97c874c517b9139aa8a35b88b685cff0/project/Elevation.md) and [Motion](https://github.com/richlaconte/altitude/blob/a7bd408f97c874c517b9139aa8a35b88b685cff0/project/Motion.md). The dialog and recovery choices are informed by [W3C APG modal guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [Apple Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts) and [Carbon Dialogs](https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs). These support the design choices; the required demos and evaluation determine whether the implementation works for its users.
