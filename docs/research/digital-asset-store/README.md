# Ikta and the digital-store framework

Status: proposed milestone scope, reviewed on 2026-11-07. This document proposes work; it does not announce implemented components, patterns, a store, or a certified integration.


Milestone: [Digital asset store: components, patterns and complete example](https://github.com/richlaconte/altitude/milestone/6). Umbrella: [#629](https://github.com/richlaconte/altitude/issues/629). Documentation scope: [#630](https://github.com/richlaconte/altitude/issues/630). Implementation issues remain `needs-design`; filing this plan does not approve new public APIs.

## Purpose and evidence

Give Ikta a complete Altitude foundation for discovering, acquiring and using digital goods, and demonstrate that foundation in a coherent general digital-store example. Altitude owns reusable interaction contracts and UI; Ikta owns the real Next.js product, API, assets, commerce and Injin integration.

This review inspected Altitude at [`a7dafc73c9126b6404df749d00eb12be82b8030c`](https://github.com/richlaconte/altitude/tree/a7dafc73c9126b6404df749d00eb12be82b8030c) and Ikta at [`7a750a2e8c2bae296167fa065f2242e7027ca57a`](https://github.com/richlaconte/ikta/tree/7a750a2e8c2bae296167fa065f2242e7027ca57a). No runtime or accessibility test was run for this scope review.

The baseline is Altitude's [contribution lifecycle](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/CONTRIBUTING.md), [elevation model](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/project/Elevation.md), [framework entry](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/project/framework/README.md) and [complete-example architecture](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/examples/apps/README.md).

Ikta's [roadmap](https://github.com/richlaconte/ikta/blob/7a750a2e8c2bae296167fa065f2242e7027ca57a/docs/roadmap.md), [UI guide](https://github.com/richlaconte/ikta/blob/7a750a2e8c2bae296167fa065f2242e7027ca57a/docs/design-system.md), [API contract](https://github.com/richlaconte/ikta/blob/7a750a2e8c2bae296167fa065f2242e7027ca57a/docs/api-contract.md) and [Injin contract](https://github.com/richlaconte/ikta/blob/7a750a2e8c2bae296167fa065f2242e7027ca57a/docs/injin-integration.md) provide the consumer requirements. Their features are also proposals.

## Scope and ownership

- Add two reusable components: **FacetFilter** and **MediaGallery**, subject to design review. Compose existing primitives for everything else.
- Add three focused patterns: catalog discovery/detail/comparison, digital-goods acquisition, and asset delivery/import handoff.
- Build one complete example, `examples/apps/digital-store`, in eight reviewable slices over one simulated service.
- Qualify the example and a separately packed Next.js consumer; publish the integration guidance and evidence limits.
- Keep the example useful for models/textures and ordinary digital downloads such as audio or document templates. Engine compatibility and import appear only for products that support them.
- Demonstrate a cart for general digital commerce without making a multi-item cart a new Ikta launch prerequisite.
- Exclude production hosting, real payment processing, tax/legal decisions, asset scanning/conversion, storage delivery, credential issuance and Injin execution from Altitude's implementation. Ikta's operating decisions remain in [#1](https://github.com/richlaconte/ikta/issues/1).

## Ikta coverage and traceability

| Ikta requirement and source issues | Altitude coverage | Example proof / application obligation |
| --- | --- | --- |
| Next.js and Altitude foundation — [#3](https://github.com/richlaconte/ikta/issues/3), [#4](https://github.com/richlaconte/ikta/issues/4) | Public exports, provider/styles and packed Next.js guide — [#645](https://github.com/richlaconte/altitude/issues/645) | Production build, hydration and service-state UI; no source aliases or duplicate provider. |
| Immutable versions and safe ingest — [#2](https://github.com/richlaconte/ikta/issues/2), [#7](https://github.com/richlaconte/ikta/issues/7), [#8](https://github.com/richlaconte/ikta/issues/8) | Metadata, version and processing compositions — [#636](https://github.com/richlaconte/altitude/issues/636), [#641](https://github.com/richlaconte/altitude/issues/641), [#642](https://github.com/richlaconte/altitude/issues/642) | Show declared versus measured facts; Ikta supplies immutable identity, validation and provenance. |
| Structured discovery and relevance — [#9](https://github.com/richlaconte/ikta/issues/9), [#26](https://github.com/richlaconte/ikta/issues/26) | FacetFilter + catalog pattern — [#631](https://github.com/richlaconte/altitude/issues/631), [#633](https://github.com/richlaconte/altitude/issues/633), [#637](https://github.com/richlaconte/altitude/issues/637) | Counts, query history, stale/empty/error states; service owns ranking/count semantics and visibility. |
| Detail, preview and recommendation — [#10](https://github.com/richlaconte/ikta/issues/10) | MediaGallery + detail/comparison composition — [#632](https://github.com/richlaconte/altitude/issues/632), [#637](https://github.com/richlaconte/altitude/issues/637) | Durable product/version links, license, price, dimensions and compatibility evidence. |
| Node clients and scoped identity — [#11](https://github.com/richlaconte/ikta/issues/11), [#12](https://github.com/richlaconte/ikta/issues/12), optional [#25](https://github.com/richlaconte/ikta/issues/25) | Credential and agent-action compositions — [#640](https://github.com/richlaconte/altitude/issues/640) | Fake scoped credentials and representative tool outcomes; no Node SDK in browser or game runtime. |
| Exact resolution and protected delivery — [#13](https://github.com/richlaconte/ikta/issues/13), [#14](https://github.com/richlaconte/ikta/issues/14) | Delivery/import pattern — [#635](https://github.com/richlaconte/altitude/issues/635), [#639](https://github.com/richlaconte/altitude/issues/639) | Plan, dependencies, required grants, expiry and reauthorization; service supplies the authoritative result. |
| Pinned integration and recoverable engine import — [#6](https://github.com/richlaconte/ikta/issues/6), [#15](https://github.com/richlaconte/ikta/issues/15), [#16](https://github.com/richlaconte/ikta/issues/16), [#28](https://github.com/richlaconte/ikta/issues/28) | Local-tool handoff and receipt composition — [#635](https://github.com/richlaconte/altitude/issues/635), [#639](https://github.com/richlaconte/altitude/issues/639), [#645](https://github.com/richlaconte/altitude/issues/645) | Simulated file conflicts/recovery; actual native validation and filesystem transactions remain Ikta tests. |
| Policy and paid acquisition — [#5](https://github.com/richlaconte/ikta/issues/5), [#17](https://github.com/richlaconte/ikta/issues/17), [#18](https://github.com/richlaconte/ikta/issues/18) | Acquisition pattern, review and consequential actions — [#634](https://github.com/richlaconte/altitude/issues/634), [#638](https://github.com/richlaconte/altitude/issues/638) | Exact quote/terms, explicit commitment, expiry, cancellation; no inferred spending authority. |
| Paid access and buyer library — [#19](https://github.com/richlaconte/ikta/issues/19), [#20](https://github.com/richlaconte/ikta/issues/20) | Orders, receipts and library composition — [#638](https://github.com/richlaconte/altitude/issues/638), [#639](https://github.com/richlaconte/altitude/issues/639), [#643](https://github.com/richlaconte/altitude/issues/643) | Delayed/duplicate events, lost response, refund and grant changes remain consistent across views. |
| Creator submission and moderation — [#21](https://github.com/richlaconte/ikta/issues/21), [#22](https://github.com/richlaconte/ikta/issues/22) | Edit/review/upload and triage compositions — [#641](https://github.com/richlaconte/altitude/issues/641), [#642](https://github.com/richlaconte/altitude/issues/642) | Retained drafts, quarantine, rejection, resubmission and reviewer permissions. |
| Revenue and payout — [#23](https://github.com/richlaconte/ikta/issues/23) | Statements, audit and recovery composition — [#643](https://github.com/richlaconte/altitude/issues/643) | Reconciled sale/refund/dispute/payout records; no made-up success totals or financial policy. |
| Updates, deprecation and notifications — [#24](https://github.com/richlaconte/ikta/issues/24) | Version review, library status and activity — [#639](https://github.com/richlaconte/altitude/issues/639), [#642](https://github.com/richlaconte/altitude/issues/642) | Exact version changes, changed licenses/dependencies, withdrawal and preservation of edited files. |
| Operations and launch evidence — [#27](https://github.com/richlaconte/ikta/issues/27), [#29](https://github.com/richlaconte/ikta/issues/29) | Complete-example qualification and manual-review record — [#644](https://github.com/richlaconte/altitude/issues/644), [#643](https://github.com/richlaconte/altitude/issues/643) | UI outcomes and accessibility evidence only; no claim of production security, recovery or commerce certification. |

## Reuse inventory

Use public `altitude-design` imports and the existing declarations rather than copying component internals.

| Need | Existing building blocks / focused contracts | Boundary to preserve |
| --- | --- | --- |
| Search, query chips and results | Field, Input, FilterBar, Pagination, useAsyncCollection, EmptyState | FilterBar's query tokens are not a server-counted multi-select facet UI. |
| Product tiles and details | Card, Badge, PropertyList, Tabs, Breadcrumb, PageHeader, FormattedNumber | No ProductCard or Price clone; currency/offer policy stays application-owned. |
| Comparison | Semantic table or DataTable plus selected-item controls | Comparable attributes, units and missing data are application decisions. |
| Acquisition and receipt | useReviewSubmit, ErrorSummary, WorkflowStatus, Dialog, Button | PlanPicker selects subscriptions; FeatureGate gates plans. Neither models arbitrary asset entitlements. |
| Upload and publishing | DropZone, useEditRecord, Field, useReviewSubmit | DropZone completion means uploaded, not scanned, approved or published. |
| Delivery and recovery | Progress, WorkflowStatus, Alert, Timeline, PropertyList | Stepper may summarize linear progress but cannot represent recovery_required by itself. |
| Delegation and secrets | SecretField, Confirmation, Trace, AILabel, consequential-action and developer-settings patterns | App owns permissions, secrets, execution, real undo and audit. |
| Review and operations | DataTable, PermissionMatrix, Timeline, Badge, consequential-action pattern | Hiding a button does not enforce reviewer, publisher or financial permissions. |

Component behavior is defined in the pinned [public declarations](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/project/components/index.d.ts) and [component source tree](https://github.com/richlaconte/altitude/tree/a7dafc73c9126b6404df749d00eb12be82b8030c/project/components). Preserve their existing defaults and meanings.

## Proposed components

### FacetFilter

A controlled, server-counted multi-select filter group for catalog facets. Supply stable option IDs, labels, selected values, result counts and loading/error/availability state; expose deliberate selection changes without fetching data itself.

- Define whether a count is exact, approximate, unknown or stale, and which query it describes. Do not compute counts from the current result page or treat an absent count as zero.
- Keep selected values visible and removable when a refreshed response omits them or returns zero matches. Preserve selection across request races; service/query adapters own cancellation and latest-response handling.
- Use Checkbox/label semantics for independent draft selection, a named group, visible clear action and a bounded expandable list where needed. The example applies the draft with an explicit Apply filters action; count semantics belong to the current applied query. The host retains labels for selected IDs omitted by a refreshed response. Responsive placement belongs to the app.
- Reuse sunk choice tracks and raised marks from Checkbox; counts/labels remain settled on the ground. Selection, pending counts and errors have words/semantics independent of color or height.
- Verify keyboard, long labels, zero/unknown/stale counts, retained selections, loading/error recovery, both schemes, forced colors and reduced motion. This is an additive component, not a FilterBar replacement.

### MediaGallery

A renderer-neutral preview shell with controlled selected-item identity, named thumbnail/navigation controls, captions, loading/error/unsupported states and optional bounded inspection. It composes preview renderers supplied by the application.

- Support image, video, audio and custom/3D slots without bundling a model renderer, media transcoder or remote-fetch policy into Altitude.
- The app supplies trusted URLs, rights, alternative text/transcripts, poster data, media lifecycle and error results. Selection changes must not leave hidden audio/video playing accidentally.
- Propose a labelled list of ordinary thumbnail buttons: Tab reaches them, Enter/Space selects, and aria-current identifies the displayed preview without adding persistent height. Restore focus without capturing keys needed by the embedded renderer. Avoid nested interactive cards or simultaneous modal summits.
- The preview record remains ground; navigation follows existing control tiers; an optional modal uses the existing Dialog contract. No elevation encodes quality, price or preference.
- Verify stable selection during reordered items, failed/unavailable media, touch, zoom, screen-reader names, reduced motion and forced colors. Do not invent autoplay or imply a successful download from a visible preview.

Each component needs source, public declarations, README, preview, interaction checks and the required package version bump. Exact APIs remain design proposals until the issue is agreed.

## Three proposed workflow patterns

### Catalog discovery, detail and comparison

Combine async collection with facets, previews, stable product/version identity, meaningful empty states, durable detail routes and comparison of explicit attributes. Preserve query, selection, return position and Back/forward context. Unknown compatibility differs from verified compatibility; unavailable products and inaccessible private records follow application policy.

The application owns search/ranking, counts, visibility, price/access evidence and URL serialization. The pattern must explain first load versus refresh, late responses, partial/stale counts, removed selections, missing comparison data and one primary action per view.

### Digital-goods acquisition

Compose free claim, existing access, optional cart, quote review, human-confirmed checkout, order reconciliation and durable receipt. Distinguish quote, payment, entitlement and fulfillment; a checkout redirect is not proof of any of them. State exact total, currency, seller and applicable license beside commitment.

The application owns pricing/tax, acceptance evidence, eligibility, idempotency, providers and refund policy. Cover stale prices, expired quotes, unavailable items, failed/canceled/pending payment, lost responses, duplicate activation, refund/dispute states and changes to access. Do not reuse subscription selection as asset checkout.

### Asset delivery and import handoff

Compose the selected immutable version, dependency/access checks, dry-run plan, authorized delivery, verification, local-tool handoff and a durable result. General digital products can end at a download receipt; engine assets continue only through an explicitly supported local adapter.

This differs from the existing [CSV record-import pattern](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/project/framework/patterns/import.md). No column mapping or invented linear success ladder applies to package installation.

Keep independent state axes: publication/availability; compatibility evidence; principal access; order/payment; transfer/verification; installation/recovery. An asset can be owned yet incompatible, downloaded yet uninstalled, or refunded yet already installed. Model `refused`, `rolled_back` and `recovery_required` explicitly; elapsed time and a completed Stepper do not establish success.

The application owns signed grants, checksums, native tooling, file conflicts, transaction recovery, offline-use policy and real cancellation/undo. A remote page never assumes filesystem access. Preserve local edits and explain the next safe action from adapter evidence.

For each pattern, author canonical Markdown/JSON in `project/framework/patterns`, update its routing/rule metadata, add an executable fixture and positive/negative checks, regenerate distributed guidance, and verify packed consumers. Reuse existing rules before adding new ones; distinguish deterministic checks from contextual review and application obligations.

## Complete example: eight slices

The example is a fictional but connected digital-goods store, not eight disconnected mockups. Actors share records so creator publication changes buyer discovery, acquisition changes the library, refunds affect grants/statements, and credential revocation affects agent execution.

| Slice | Proposed example modules | Reviewable outcome |
| --- | --- | --- |
| Foundation | main.tsx, app.tsx, app.json, app.css, routes.ts, model.ts, service/, fixtures.tsx | Design record; shared deterministic store; identity/permissions; route shell; fixture controls and reset outside the product main. |
| Catalog/detail/comparison | catalog.tsx, product.tsx, compare.tsx | Search/facets, renderer-neutral previews, exact version evidence, comparison and return context, including adverse collection states. |
| Cart/checkout/orders | cart.tsx, checkout.tsx, orders.tsx | Free claim and explicit paid review; changed/expired quotes; retained cart; authoritative order/grant reconciliation and durable receipts. |
| Library/delivery/import | library.tsx, install.tsx | Owned versions, updates, expired grants and simulated import plans/conflicts/recovery; ordinary downloads avoid engine-specific steps. |
| Agent/credentials | agent.tsx, credentials.tsx | Recommendation and proposal trace tied to products; scoped display-once fake credentials; expiry/revoke changes outcomes; approval is separate from execution. |
| Publisher | creator.tsx, submission.tsx | Creator onboarding states, retained drafts, upload/processing/validation, review submission, rejected correction and immutable release updates. |
| Moderation | moderation.tsx | Authorized review queue, evidence, approve/reject/takedown/appeal handoff and visible downstream effects, with immutable actor/reason history. |
| Commerce operations/support | operations.tsx, statements.tsx | Refund/dispute handling, order support, sale/fee/refund/payout records, held/failed payout and reconciliation; creator/admin access boundaries. |

Foundation precedes the other slices. Catalog enables cart and recommendation; acquisition enables the library; publisher enables moderation; order and creator records enable statements/support. Each slice adds its own handler and browser evidence; qualification combines the journeys.

## Route and recovery contract

- Use durable routes for catalog queries, product/version detail, comparison, orders, imports, creator submissions, moderation records and statements. Static example hosting may use `#/...`; the packed Next.js consumer proves actual framework integration separately.
- Test direct entry, reload, invalid/removed IDs, permissions, Back/forward, query restoration and logical focus. Do not copy replace-only navigation where users need history.
- Reload during an interrupted simulated apply preserves operation identity, prior/new file-map and lockfile revisions, and recovery state in demo persistence. Reconcile before retry, offer only supported recovery, and record one final receipt without losing simulated user edits. This is not a real filesystem journal.
- Preserve drafts and corrections through recoverable failures. Clear protected data on identity/permission changes; retaining public catalog context must not retain another user's library.
- Keep public discovery, creator editing and administrative triage appropriate to their tasks instead of forcing every view into a single dashboard layout.

## Simulator integrity and limits

Use the existing [service](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/examples/apps/shared/service.ts) and [React frame](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/examples/apps/shared/react.tsx). The fixture drawer visibly states that the service is simulated and stays outside the product's main landmark.

- Handlers own simulated outcomes and enforce principal, role, scope and record boundaries. `endSession()` only denies writes in the shared harness; protected reads need explicit application checks.
- `DemoResource` retains previous data on refresh failure. Do not reuse that behavior unchanged for unauthorized responses or account switches; invalidate protected data and pending requests by principal.
- Lost-response mode commits then rejects. Consequential handlers need idempotency and authoritative read-back; UI code must not infer truth from the selected fixture mode or a delay.
- Use operation-specific failure modes, deterministic external events and the manual clock to reach stale prices, changed grants, concurrent edits, moderation changes and credential expiry.
- Fake credentials are visibly fake. Store only masked metadata after issuance; no full secret in URLs, logs, receipts or persisted list records. The example is not a credential security boundary.
- Simulated uploads, provider events, downloads and imports update records/file maps only. They send no money, publish no assets, execute no agent or engine, and write no developer game files.
- A refund/revocation changes future simulated delivery according to stated fixture policy; it does not pretend to erase previously downloaded content. Installed assets and access grants remain distinct records.
- A timer-backed service proves UI behavior against that model, not production persistence, payment correctness, authorization security, concurrency or recovery.

## Qualification: complete example

Add focused checks such as `build/checks/example-digital-store-{service,buyer,agent,creator,operations}.mjs`; the current [CI manifest](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/build/checks/ci.json) discovers new check files. Keep handler invariants under a manual clock and browser tests tied to visible outcomes and simulated canonical records.

Register the app in [.storybook/examples/Examples.stories.tsx](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/.storybook/examples/Examples.stories.tsx) using ExampleContent and one host provider. The [example builder](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/scripts/build-examples.mjs) discovers the standalone app; update the example README and verify gallery visibility.

Run typechecking, example build, the new checks, Storybook build/example checks and affected site checks. Exercise both schemes, 320 CSS px, zoom, long content, keyboard/focus, forced colors, reduced motion and applicable RTL layouts. Record manual assistive-technology coverage and limitations; an automated scan does not certify accessibility or usability.

The final journey suite includes free/owned/paid/unavailable/incompatible products, delayed and lost order results, refunds, exact-version updates, plan conflicts/recovery, revoked credentials, rejected publication, takedown, unauthorized reads, failed payouts and support reconciliation. Every shown success follows a service result; every offered recovery has a modeled operation.

## Qualification: packed Next.js consumer

Create an isolated consumer fixture that installs an actual `npm pack` tarball, with pinned supported Next.js/React/Node versions and a lockfile. Do not resolve `altitude-design` to repository source, import private files, or copy framework implementations.

Prove an App Router layout with the public no-fonts stylesheet, a client provider boundary, one provider/toaster where used, server-rendered catalog content and client facet/gallery/acquisition interactions. Keep server-only data access and credentials outside client bundles; treat the demonstration service as a replaceable adapter.

Run production build/start and browser checks for rendering/hydration, navigation/focus, CSS/token availability, both schemes and a failed/reconciled operation. Check the browser graph for Node CLI/guidance/server modules. The guide must name application-owned query/route/auth/commerce/import responsibilities and exact commands with observed results.

Extend the existing [packed-package consumer approach](https://github.com/richlaconte/altitude/blob/a7dafc73c9126b6404df749d00eb12be82b8030c/build/checks/package-consumer.mjs) rather than treating the repository's source-aliased example build as package evidence. Recheck the selected versions during implementation; source main and npm latest need not match.

## Milestone closure and sequencing

The milestone has an umbrella, this research/scope decision, two component issues, three pattern issues, eight example slices and two qualification issues. The research decision records agreed APIs/boundaries before component implementation; component/pattern work can proceed independently where explicitly unblocked.

Close only when the reusable APIs/guidance are shipped with required versioning, the connected example and packed consumer pass their checks, the coverage matrix has evidence, and remaining application obligations are explicit. Native Injin, real-money, security and operational launch gates remain in Ikta; Altitude's milestone cannot close those issues by proxy.

## GitHub delivery index

The milestone and native sub-issue/blocking relationships are the work queue. This table is an initial index, not a separate live status tracker. No dates or assignees were inferred.

| Deliverable | Issue | Initial prerequisites |
| --- | --- | --- |
| Docs: map Ikta requirements to the digital-store milestone | [#630](https://github.com/richlaconte/altitude/issues/630) | None |
| New: FacetFilter — narrow a collection with counted choices | [#631](https://github.com/richlaconte/altitude/issues/631) | [#630](https://github.com/richlaconte/altitude/issues/630) |
| New: MediaGallery — inspect images and playable product previews | [#632](https://github.com/richlaconte/altitude/issues/632) | [#630](https://github.com/richlaconte/altitude/issues/630) |
| Framework: catalog discovery, product detail and comparison patterns | [#633](https://github.com/richlaconte/altitude/issues/633) | [#630](https://github.com/richlaconte/altitude/issues/630), [#631](https://github.com/richlaconte/altitude/issues/631), [#632](https://github.com/richlaconte/altitude/issues/632) |
| Framework: acquire digital goods with quotes, access and receipts | [#634](https://github.com/richlaconte/altitude/issues/634) | [#630](https://github.com/richlaconte/altitude/issues/630) |
| Framework: review asset delivery and local import outcomes | [#635](https://github.com/richlaconte/altitude/issues/635) | [#630](https://github.com/richlaconte/altitude/issues/630) |
| Examples: establish digital-store records, routes and fixture boundaries | [#636](https://github.com/richlaconte/altitude/issues/636) | [#630](https://github.com/richlaconte/altitude/issues/630) |
| Examples: browse, inspect and compare digital-store products | [#637](https://github.com/richlaconte/altitude/issues/637) | [#636](https://github.com/richlaconte/altitude/issues/636), [#631](https://github.com/richlaconte/altitude/issues/631), [#632](https://github.com/richlaconte/altitude/issues/632), [#633](https://github.com/richlaconte/altitude/issues/633) |
| Examples: connect free claims, cart, checkout and durable orders | [#638](https://github.com/richlaconte/altitude/issues/638) | [#636](https://github.com/richlaconte/altitude/issues/636), [#637](https://github.com/richlaconte/altitude/issues/637), [#634](https://github.com/richlaconte/altitude/issues/634) |
| Examples: connect the owned library to downloads and import recovery | [#639](https://github.com/richlaconte/altitude/issues/639) | [#636](https://github.com/richlaconte/altitude/issues/636), [#638](https://github.com/richlaconte/altitude/issues/638), [#635](https://github.com/richlaconte/altitude/issues/635) |
| Examples: connect agent recommendations, scoped credentials and activity | [#640](https://github.com/richlaconte/altitude/issues/640) | [#636](https://github.com/richlaconte/altitude/issues/636), [#639](https://github.com/richlaconte/altitude/issues/639) |
| Examples: create publisher drafts and validated release submissions | [#641](https://github.com/richlaconte/altitude/issues/641) | [#636](https://github.com/richlaconte/altitude/issues/636), [#632](https://github.com/richlaconte/altitude/issues/632) |
| Examples: moderate releases and show withdrawal consequences | [#642](https://github.com/richlaconte/altitude/issues/642) | [#637](https://github.com/richlaconte/altitude/issues/637), [#641](https://github.com/richlaconte/altitude/issues/641) |
| Examples: reconcile store refunds, creator statements and payouts | [#643](https://github.com/richlaconte/altitude/issues/643) | [#638](https://github.com/richlaconte/altitude/issues/638), [#642](https://github.com/richlaconte/altitude/issues/642) |
| Examples: publish and qualify the complete digital asset store | [#644](https://github.com/richlaconte/altitude/issues/644) | [#637](https://github.com/richlaconte/altitude/issues/637), [#638](https://github.com/richlaconte/altitude/issues/638), [#639](https://github.com/richlaconte/altitude/issues/639), [#640](https://github.com/richlaconte/altitude/issues/640), [#641](https://github.com/richlaconte/altitude/issues/641), [#642](https://github.com/richlaconte/altitude/issues/642), [#643](https://github.com/richlaconte/altitude/issues/643), [#633](https://github.com/richlaconte/altitude/issues/633), [#634](https://github.com/richlaconte/altitude/issues/634), [#635](https://github.com/richlaconte/altitude/issues/635) |
| Package: verify the store composition in a packed Next.js consumer | [#645](https://github.com/richlaconte/altitude/issues/645) | [#631](https://github.com/richlaconte/altitude/issues/631), [#632](https://github.com/richlaconte/altitude/issues/632), [#633](https://github.com/richlaconte/altitude/issues/633), [#634](https://github.com/richlaconte/altitude/issues/634), [#635](https://github.com/richlaconte/altitude/issues/635), [#637](https://github.com/richlaconte/altitude/issues/637), [#639](https://github.com/richlaconte/altitude/issues/639) |
