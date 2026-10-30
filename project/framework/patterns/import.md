# Import

Help someone bring records in from a file: upload it, map its columns to fields, see and fix the rows with problems, review what will happen, and import it as a job with a receipt of what was imported, skipped and why. It composes [Review and submit](review-submit.md) for the review and receipt; the steps use `Stepper`.

## Inputs and ownership

Supply the accepted file types and size limit, a parser that returns columns and rows (with line numbers), the target fields and which are required, validation per field, the duplicate rule, an import job adapter that reports progress and supports cancellation where the service can, and a way to download the rows that weren't imported. The application owns parsing, encoding detection, validation on the server (the interface's checks are a preview), duplicate detection, the import itself and what a cancelled import leaves behind.

## States and transitions

Steps: **upload → map → fix → review → import**, shown in a `Stepper`; completed steps can be revisited until the import starts.

- **Upload** follows the DropZone queue: uploading with progress, processing, done (move to mapping) or failed with the reason and Retry.
- **Map**: one `Select` per source column, labelled with the column's header and a sample value. An unmapped Select is an opening that **fills when mapped** (the Completeness signal), so what's left is visible. Required fields still unmapped are listed in words ("Map these required fields: Name, Email.") and Continue waits for them. "Don't import" is an explicit choice.
- **Fix** happens in a `DataGrid` with `showInvalid`: **invalid cells lie in a trench on critical-soft** (the Validity signal) and each cell's description says its problem, so the work left shows at a glance. Editing a cell revalidates it. The problem count is said as it changes ("2 problems left in 2 rows"). "Only rows with problems" narrows the grid. Rows still with problems are skipped, and the page says so.
- **Review** is one sentence of consequences ("5 contacts will be imported. 3 rows will be skipped: 1 duplicate and 2 with problems.") and a button that names the outcome ("Import 5 contacts").
- **Import** is a job: `Progress` with the count in words ("Importing 3 of 5"), cancellable where the service supports it (and the cancelled state says what was already imported), then a receipt of imported, skipped and failed counts with the skipped rows downloadable, and an entry in the activity log.

## Content, keyboard, focus and announcements

Each step change moves focus to its heading. The grid follows spreadsheet keys (arrows, Enter to edit, Escape to discard); each cell's name includes its row ("Email, row 3"). Counts are announced politely when they change, never per keystroke. The mapping grid reflows to one column on narrow screens; the data grid scrolls horizontally. Verify forced colors (invalid cells keep a dashed outline), reduced motion, zoom and RTL.

## Recovery and working implementation

A failed upload offers Retry. Leaving the fix step keeps the edits. A failed import says how many rows were imported before it stopped and offers to continue. The working example in `build/fixtures/patterns/import.jsx` (shipped as `references/build/fixtures/patterns/import.jsx`) composes the five steps with a sample file, mapping, invalid cells to fix, a review, a cancellable import and a receipt. It is also the Storybook preview "Patterns/ImportPattern". [Metadata](import.json) names the runtime and verification sources.

## Rules, verification and evidence

`ALT-IMPORT-001` covers mapping as completeness, invalid cells as trenches with their problem, and the job with its receipt; `ALT-REVIEW-001` covers review and receipt; `ALT-STATUS-001` covers announcements. `build/checks/import-pattern.mjs` checks the example in a browser, including DataGrid's `showInvalid`. See [rules](../rules.json). How people handle large files with many problems still needs evaluation with representative users and real data.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
