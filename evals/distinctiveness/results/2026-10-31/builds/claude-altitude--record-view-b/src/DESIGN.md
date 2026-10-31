# Recipe page — design record

- **User goal:** read one recipe before prep or service, and correct its details when they change.
- **Audience:** cooks, sous chefs and the head chef of one restaurant kitchen.
- **Frame:** focused record page (screen layout). No sidebar; a breadcrumb back to the recipe book.
- **Lead:** the ingredients, grouped by component. They come first after the title and take the wide column.
- **Primary action:** Edit details (one, in the page header). Details and Recent changes sit beside the lead, narrower and quieter, and stack under it below 880px.
- **Consequence:** saving changes the recipe everyone in the kitchen cooks from, and adds an entry to Recent changes. It isn't destructive, so there's no confirmation step.
- **Data shape:** `RecipeDetails` (name, station, yield, prep/cook minutes, shelf life, allergens, holding notes), ingredient groups, and changes stored as before/after pairs (`src/recipe-data.ts`).
- **Patterns:** edit record (`useEditRecord`, `ErrorSummary`, `WorkflowStatus`) in a `Sheet`; the record's activity as a `Timeline` with a `DiffView` in each entry (audit-log pattern, record feed only; there's no workspace log).
- **States:** editing, invalid (inline errors plus a summary that takes focus on submit), saving (button pending, fields read-only), failed (input kept, the error in words, "Try saving again"), saved (sheet closes, the outcome is announced on the page, a new entry appears at the top of Recent changes). Cancelling with unsaved edits asks inside the sheet: Keep editing or Discard changes.
- **Validation:** checked on submit. Name is required, yield is 1 or more, and times and shelf life are 0 or more.
- **Application-owned (simulated in `src/recipe-service.ts`):** persistence; a revision check (the save is refused if the recipe changed after editing began); the identity of the current user (Amara Okafor). Add `#fail-save` to the URL to make saves fail.

## Unresolved product decisions

- **Permissions:** who may edit a recipe. Right now everyone sees Edit details.
- **Ingredient editing:** ingredients are read-only, because the task only asked for editing the details.
- **Scaling:** whether changing the yield should rescale the ingredient quantities. At the moment it doesn't.
- **Unsaved edits on reload:** these aren't kept as a draft; there's only the browser's `beforeunload` prompt. In-app navigation is blocked while the modal sheet is open. A real router must send Back through `form.requestLeave`.
- **Allergens:** they're free text. A real kitchen probably wants them taken from the 14 regulated allergens.
