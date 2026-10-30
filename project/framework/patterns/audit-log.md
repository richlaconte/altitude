# Audit log

Help someone find out who did what, to which resource, when and from where: a workspace audit log that can be filtered, paged, expanded to the change and exported, and a lighter activity feed on each record. It composes [Async collection](async-collection.md) for loading, filtering and paging.

## Inputs and ownership

Supply events with an actor, an action, a resource, a time with its exact value, the origin (IP address or client), and the before and after of what changed; a server query that filters and pages them; an export job adapter that reports progress and a download; and the retention period. The application owns event capture and integrity (an audit log the interface can edit is not an audit log), retention, access control (who may read the log), and the export's contents.

## States and transitions

**Entries are the record**: flush rows on the ground, never raised and never cards. Each entry reads as one sentence ("Theo Marsh changed Ines Duarte's role from Member to Admin") with its actor, time (`RelativeTime`, exact value on demand) and origin in columns. Only an entry that links somewhere lifts when pointed at. The **workspace log** is a `DataTable` with a `FilterBar` (actor, action, resource, date range) and server pagination; changing a filter returns to the first page and announces the result count; turning a page holds the current rows at half strength until the next page arrives. An entry **expands** to its change as a `DiffView` (properties before and after). A **record's activity** is a `Timeline` on the record, with details behind a disclosure; don't mix the record feed and the workspace log.

**Export** is a job, a task under way: `Progress` with its percentage and the words ("Preparing export, 40%"), then a toast with the download, and the export itself appears in the log. Other states: loading (imprinted rows), empty for a new workspace (say what will appear here), no results for a filter (say so and how to widen it), live arrivals (new events land with the afterglow, announced politely and throttled), and retention ("kept for 90 days on the Pro plan") said in words near the log.

## Content, keyboard, focus and announcements

Write entries as sentences in the past tense with real names, not codes. The disclosure that expands an entry is named by the entry. The filter bar is one Tab stop with arrow keys inside it; results are announced after each change. Pagination keeps focus on the control used. The table keeps a minimum width and scrolls horizontally on narrow screens. Verify forced colors (disclosures and diff markers stay visible), reduced motion (no afterglow movement), zoom and RTL.

## Recovery and working implementation

A failed page load keeps the previous rows and offers to try again. A failed export says so in the toast and offers to retry; nothing partial is offered for download. The working example in `build/fixtures/patterns/audit-log.jsx` (shipped as `references/build/fixtures/patterns/audit-log.jsx`) composes a filtered, paged log with expandable changes, an export job and a record's activity. It is also the Storybook preview "Patterns/AuditLogPattern". [Metadata](audit-log.json) names the runtime and verification sources.

## Rules, verification and evidence

`ALT-AUDIT-001` covers flush sentence entries, the change on expansion and export as a job; `ALT-COLLECTION-001` covers loading, filtering and paging; `ALT-STATUS-001` covers announcements; `ALT-VISUAL-003` covers states that don't rise. `build/checks/audit-log-pattern.mjs` checks the example in a browser. See [rules](../rules.json). Whether people find what they're looking for still needs evaluation with representative users and real logs.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
