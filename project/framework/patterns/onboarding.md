# Onboarding

Help someone new reach value quickly: a setup checklist for the few things a workspace needs, empty states that lead to the first record, a short tour only for changes to an interface they already know, and a "What's new" for launches. Prefer empty states over tours and carousels.

## Inputs and ownership

Supply the setup tasks with what each does and where it's done, events from the application when each task actually happens, whether onboarding was dismissed (stored per person), the empty regions with their one next step, any tour's steps with the elements they point at, and the list of changes with which ones this person has seen. The application owns task detection (a task is done when the thing happened, not when someone clicked the item), where dismissal is remembered, and when a tour may be offered.

## States and transitions

**Setup checklist.** A read-only list of tasks: each is **stamped done by the application when the task actually happens**, wherever it happens, never by clicking the item; an unfinished task offers one button that goes to where it's done. Progress is a **`Meter`** ("2 of 4"), because completeness is a reading, not a task under way: never `Progress`. The checklist never blocks the app. It can be skipped while unfinished ("Skip for now") and hidden once finished ("Hide setup guide"); either way it can be found again from Help, and the page says so. (The editable `Checklist` is for lists people write; a setup list is read-only, so it's a plain list with Done plates.)

**Empty states before tours.** Each empty region is an `EmptyState` that says what's empty, what will appear, and opens with its one action ("Connect a data source"). Doing it fills the region and stamps the matching setup task.

**Tours** (`Tour`) only for changes to an interface someone already uses, at most a few steps, never dimming the page and **never starting on their own on every visit**: offer them ("Show me what changed in the sidebar"), and let Escape or Skip end them.

**What's new** is a `Popover` or `Sheet` listing changes as a `Timeline` (newest first), with a count `Badge` only for unseen items; opening it marks them seen and the count goes.

## Content, keyboard, focus and announcements

Write tasks as outcomes ("Invite your team") with one line on why. Stamped tasks keep their text readable (muted, not struck through). Hiding the guide announces where to find it. The tour's cards are non-modal dialogs that take focus and return it; What's new is reachable by keyboard and closes with Escape. Everything fits at 320px. Verify forced colors (Done plates and the meter stay visible), reduced motion, zoom and RTL.

## Recovery and working implementation

Onboarding is optional: dismissing it never loses anything, and every surface can be reopened. If task detection fails, the task stays unstamped and its button still works. The working example in `build/fixtures/patterns/onboarding.jsx` (shipped as `references/build/fixtures/patterns/onboarding.jsx`) composes a stamped setup checklist with a Meter, an empty state whose action stamps a task, an opt-in tour, and What's new with an unseen count. It is also the Storybook preview "Patterns/OnboardingPattern". [Metadata](onboarding.json) names the runtime and verification sources.

## Rules, verification and evidence

`ALT-ONBOARD-001` covers stamped tasks, progress as a reading, empty states before tours, opt-in tours and dismissible, re-findable surfaces; `ALT-STATUS-001` covers announcements; `ALT-VISUAL-003` covers what must not rise. `build/checks/onboarding-pattern.mjs` checks the example in a browser. See [rules](../rules.json). Which tasks belong on a setup list still needs evaluation with representative users.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
