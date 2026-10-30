# App skeleton

A starting point for a new SaaS app, with Altitude's parts composed the way they're meant to be: copy it, then replace the data and the services. It's the Storybook preview "Patterns/AppSkeleton", and its source is `build/fixtures/patterns/app-skeleton.jsx` in the repository, type-checked against the public declarations.

## What it composes

- **The frame**: `AppShell` with a `Sidebar` of destinations (the current one on a raised pill) and a top bar with search. The shell is on the ground; nothing in it rises except what's pointed at.
- **A list page**: `PageHeader` with the view's one primary action ("Add customer") and a secondary one; a `FilterBar`; a `DataTable` with selection (a counted action for the selected rows) and server pagination. Follow the [async collection](patterns/async-collection.md) contract for loading, empty and failure states.
- **A record**: clicking a row opens it in a `Sheet` with a `PropertyList` whose values are edited in place. Closing the sheet returns focus to the row.
- **Settings**: `SettingsSection` and `SettingsRow`, fields saved together with the `SaveBar`, and a switch that applies immediately. See the [settings](patterns/settings.md) contract.
- **An empty view**: an `EmptyState` with its one action.

## Rules it keeps

One primary action per view (`ALT-VISUAL-002`); the single summit (only a dialog or sheet reaches the top level, one at a time); states that don't rise (`ALT-VISUAL-003`). `build/checks/app-skeleton.mjs` checks the composition in a browser: one primary per view, keyboard navigation through the sidebar, filtering, paging, selection, the sheet and its focus return, and the SaveBar. Replace its demo services with yours and keep those behaviours.
