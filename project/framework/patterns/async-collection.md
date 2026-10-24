# Async collection

Help someone find and act on records while the data changes. Use asynchronous collections for search, filtering and browsing. A known local static list may need no loading state. Large service-backed datasets may need pagination or virtualization chosen by the application; this hook does not fetch every page or invent total counts.

## Inputs and ownership

Supply a `load` adapter, query, stable `getKey` and explicit selection policy. IDs must identify entities across sorting and refresh; array indexes do not. The app owns permission filtering, query parsing, pagination/cursors, URL/history, caching and whether reset means all records or an initial query. Never show an authorization failure as an empty dataset. Confirm which search fields and scopes the service supports.

## States and transitions

Runtime phases are `loading`, `populated`, `refreshing`, `empty`, `no-results` and `failed`. Distinguish initial loading, populated, refreshing with retained content, first-use empty, filtered no-results and failure. First-use empty invites the relevant next action; no-results offers query correction/reset. A failed refresh retains prior results and identifies their staleness. A new query invalidates an older response. Retry repeats the current request; reset returns to the initial query. Selection either clears on query changes or is explicitly preserved; explain selected items outside the visible result set and reconcile removal by stable ID. Do not imply selection means permission to act.

## Content, keyboard, focus and announcements

Label search and filters by their actual scope. Announce concise settled result counts, loading completion and failure through `WorkflowStatus`, avoiding noisy per-keystroke announcements. Use real links for record navigation, named buttons for actions, and native checkboxes for selection. Preserve focus in the search/filter control after updates; removal needs a deliberate next focus target. Use a semantic table for tabular relationships and a list for simple records; do not add grid keyboard behavior accidentally.

At narrow widths retain names, selection state and actions; wrap long text or supply an equivalent accessible detail view. Keep reading order logical in RTL. Test long queries, translated status, zoom, forced colors and reduced motion. A skeleton alone does not communicate loading to assistive technology.

## Recovery and working implementation

Use `useAsyncCollection` with application-supplied loading and stable keys. Render every applicable `phase`, call `refresh` for retry, `reset` for query reset, and `toggleSelection` according to the chosen policy. Import the runtime from the main package export. The complete working composition, including controlled delay/rejection/recovery, is `build/fixtures/pattern-workflows.tsx`; its installed snapshot is under `references/build/fixtures/pattern-workflows.tsx`. Source and fixture paths are indexed in [metadata](async-collection.json). It demonstrates actual result state, not a decorative loading timer.

The application must connect query changes to its URL/history policy and verify Back/forward, deep links and reload where supported. Pagination must retain the correct query and selection semantics; a stale page response must not restore a prior filter. Cached data can remain usable on failure only when permission and freshness policies allow it.

## Rules, verification and evidence

`ALT-COLLECTION-001` is an application integration obligation: test all applicable states, delayed responses, query changes, stable selection and reset against service fixtures. `ALT-STATUS-001` checks feedback semantics; `ALT-VISUAL-001` requires contextual visual review. See [metadata](async-collection.json) and [rules](../rules.json) for sources, exceptions and linked checks. This is a provisional contextual pattern, not a standard mandating every listed state in every product. Test actual search success and comprehension with representative people; engineering checks cannot determine appropriate information architecture.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
