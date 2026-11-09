# Catalog discovery

Help someone find a product in a public catalog, judge whether it suits them from real evidence, and inspect or compare products without losing their search. It applies the [Async collection](async-collection.md) contract (phases, stale responses, retry, reset) to a remote search with counted facets, and adds what a catalog needs: an applied query in the URL, one link per result, exact compatibility evidence, and a comparison table. Choose the frame with [Screen layout](screen-layout.md): the results lead, and a public catalog usually has no primary action.

## Inputs and ownership

Supply a search adapter that takes the whole applied query `{ q, facets, sort, page or cursor }` and returns the authorized result set for the person, the total and per-facet counts **for that applied query**, and whether counts are exact, approximate or unknown. Supply each product's public facts (exact version, release date, formats, size, license, price with currency, publisher) and its compatibility evidence. Supply the signed-in person's own state (what they own, at which version) separately. The application owns ranking, count semantics, visibility and permission filtering, price and access evidence, URL serialization and history. The interface never infers that a featured or expensive product is more relevant.

## States and transitions

**Draft, then applied.** `FacetFilter` and the search field edit a draft. "Apply filters" (a secondary button: the view's one primary, if any, belongs to the page header) or submitting the search applies it. Only the applied query is written to the URL (`?q=stone&type=texture&sort=newest`), and writing it creates a history entry, so Back and Forward restore it and a link reproduces it. Changing sort or page applies at once. Any change to the query other than choosing a page returns to the first page, so a narrower result set never opens on an empty page 2. Applied filters are listed as removable tags above the results ("Remove Textures"); removing one applies at once, because it's a single deliberate act, and focus moves to the next tag's remove button, or to the results heading when none is left. A draft that differs from the applied query says so ("You have changes that aren't applied yet").

**Latest response wins.** Each request carries a sequence number and a response for an older query is dropped. While a new query loads, the previous results stay, the list is `aria-busy`, the status says "Updating results…" and `FacetFilter` takes `counts="refreshing"`. A failed refresh keeps the previous results with an `Alert` that says they belong to the previous search and offers "Retry search"; the facets take `counts="stale"`. A first-load failure is an `EmptyState` with Retry. Zero results is an `EmptyState` that names the search and each applied filter, with a clear action named for what it clears ("Clear search", "Clear all filters", "Clear search and filters"); it never offers unrelated "featured" products in their place.

**Remote search returns a new authorized result set.** It never dims "misses": a record the person may not see must not appear at all, dimmed or otherwise. `FilterBar` with relevance-in-place suits a local collection the person may fully see; a remote catalog uses this pattern.

**Results.** Each result has exactly one link, its title, to the product's URL. Nothing else in the card is interactive except a comparison `Checkbox` labelled with the product's name, outside the link. No whole-card click target holds nested controls. Sort labels name their basis: "Relevance", "Newest", "Price: low to high", "Price: high to low". A paid placement is labelled "Sponsored" in words and is never folded into "Relevance".

**Return position.** Before following a result's link, store the scroll offset and the product's id against the catalog URL (`sessionStorage`). On Back, once the results settle, restore the offset and focus that product's link; if it's no longer there, focus the results heading. A "Back to results" link goes back through history only when the previous entry is the catalog; after a deep link, a version link or the comparison it follows its href to the last catalog URL instead.

**Product detail** (`/product/:id?v=1.2.0`) shows a `MediaGallery`, a `PropertyList` of exact facts, links to other versions, and compatibility as one of three values, each in words with its evidence:

- **Verified**: the engine and version, the package digest, the date tested and any limitations.
- **Incompatible**: the same evidence and the reason.
- **Not tested**: said plainly ("It may or may not work"), never shown as compatible.

Compatibility doesn't apply to an ordinary download (a document template, an audio pack) and says so. The person's own state ("You own 1.2.0 · Version 1.3.0 is available") is stated apart from public facts. A missing fact says "Not stated by publisher", never a blank or "No".

**Comparison** holds a small number of products (four in the example: an application choice that keeps columns readable). It's a semantic `Table`: attributes are row headers (`th scope="row"`), products are column headers with links. A missing value says "Not stated by publisher"; a value that can't apply says "Doesn't apply" (an engine pin on an audio pack). Differences are words ("differs"), not colour alone. On a narrow screen the table scrolls sideways inside its own frame, never the page.

## Content, keyboard, focus and announcements

Label search and facets by their actual scope ("Counts for your applied search"). Announce settled result counts through one polite status region, not per keystroke. Focus stays in the control the person used while results update; it never jumps into the results. Opening a product or the comparison moves focus to its heading; Back returns it to the product's link. Prices are formatted currency with their code where it's ambiguous, and "Free" for zero. Verify keyboard, both schemes, 320 CSS px, 200% zoom, reduced motion, forced colours and `contrast="more"`. Settled results, prices and evidence sit on the ground; a sponsored or recommended product never gains height.

## Recovery and working implementation

The working example in `build/fixtures/patterns/catalog-discovery.jsx` (shipped as `references/build/fixtures/patterns/catalog-discovery.jsx`) searches a simulated service that can be made slow or fail once: draft facets, Apply, the URL and history, a late response dropped, a failed refresh retained with Retry, zero results, return position, product detail with three-valued compatibility and owned state, and a comparison table. It is also the Storybook preview "Patterns/CatalogDiscoveryPattern". [Metadata](catalog-discovery.json) names its sources and verification. A response that lands in the example proves nothing about a real search service.

## Rules, verification and evidence

`ALT-CATALOG-001` covers the applied query in the URL, counts from the applied query, one link per result, and compatibility that is never shown as verified without evidence. `ALT-COLLECTION-001` covers phases, stale responses and retry; `ALT-STATUS-001` the status region; `ALT-VISUAL-003` what must not rise. `build/checks/catalog-discovery-pattern.mjs` checks these deterministically in a browser: a draft never touches the URL, Apply does, Back and Forward restore it, a late response is dropped, a failed refresh keeps results, each result has one link, return focus, the three compatibility values and the comparison table at 320px. Contextual review remains: whether ranking and count semantics are honest, whether visibility rules hold on the real service, and whether people find and judge products correctly, which needs representative users. See [rules](../rules.json).

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
