# Settings

Help someone review and change how a workspace, account or product behaves: sections of settings, some applied the moment they change and some saved together, with destructive actions kept apart. It composes [Edit record](edit-record.md) for fields saved together and [Consequential action](consequential-action.md) for the danger zone; this contract says which applies where. Use a route per settings area; don't put settings in a dialog.

## Inputs and ownership

Supply the current settings, which person may change which section, a save adapter for each record saved together, a write adapter for each apply-now preference, and the consequence and execute adapter for each destructive action. The application owns authorization (read-only sections must also be rejected by the server), persistence, concurrency between two people editing the same settings, and navigation guards. A switch that appears saved is not saved until its write is acknowledged.

## States and transitions

Decide each section's mode before building it, and never mix the two inside one section:

- **Apply now**: a preference that stands alone (a notification, a theme, a toggle for one feature). `Switch`, `RadioGroup` or `Select` changes it immediately and the row reports the write through `SettingsRow status`: pending hovers (after the grace period, so fast writes never flicker), committed lands with "Saved", failed drops into a trench with the reason, and the control returns to its last saved value.
- **Save together**: fields that form one record (workspace name and URL, a billing address). They join one draft, follow the edit-record states (editing, invalid, submitting, saved, failed) and are saved or discarded once with `SaveBar`, which appears when the draft has changed. Navigation away with unsaved changes asks before discarding.

Other applicable states: loading (each section's card stays up with its body as an imprint), read-only (`SettingsSection readOnlyReason` disables the rows and says why in words, for example "Only workspace owners can change billing details"), save failure (the draft is kept and the bar says what failed), and a concurrent change by someone else (show the newer value and who changed it; don't overwrite it silently).

## Layout, keyboard, focus and announcements

Lay out sections as `SettingsSection` cards, each with a heading that names its region, navigated by in-page links, `Tabs` or a sidebar for long pages. Each setting is a `SettingsRow`: label and description on the start side, the control on the end side, stacked on narrow screens; the row's label names the control and its description describes it. Put destructive actions last, in a section titled "Danger zone" (`tone="critical"`): the same height as every other section, a critical rim, and each action named by its outcome ("Delete workspace") with its consequence in words. Delete, transfer and similar actions follow the consequential-action contract: a typed confirmation in a stationary `Dialog`, or a `HoldButton`, and success reported only after the service confirms it.

Tab follows the visual order; every control is reachable and named. An invalid save moves focus to the error summary; an apply-now write announces its result politely beside the control without moving focus. Long labels and values wrap; at 320px rows stack. Verify forced colors (the critical rim stays visible), reduced motion (a pending row holds still, raised), zoom and RTL.

## Recovery and working implementation

A failed apply-now write puts the control back and says why; trying again is the same change. A failed save keeps the draft; retry resubmits it. A failed destructive action says nothing was removed and offers to try again. The working example in `build/fixtures/patterns/settings.jsx` (shipped as `references/build/fixtures/patterns/settings.jsx`) composes general fields saved together, apply-now notification switches, a read-only billing section and a typed-confirmation delete, with a demo service that can fail. It is also the Storybook preview "Patterns/SettingsPattern". [Metadata](settings.json) names the runtime and verification sources.

## Rules, verification and evidence

`ALT-SETTINGS-001` covers the mode decision and the danger zone; `ALT-EDIT-001` and `ALT-EDIT-002` cover the draft saved together; `ALT-ACTION-001` covers destructive actions; `ALT-STATUS-001` covers announcements; `ALT-VISUAL-003` covers what must not rise. `build/checks/settings-pattern.mjs` checks the example in a browser: named regions, labelled rows, the apply-now write's three states, the read-only reason, the danger zone's height and rim, the SaveBar draft and the typed confirmation. See [rules](../rules.json) for source authority and applicability. Whether people understand which settings apply immediately still needs evaluation with representative users.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
