# Example apps

Fictional but complete products built with Altitude, each on a simulated backend (#399). They have two jobs: testing components together in real state (slow, failed, lost, conflicting, offline), and showing what Altitude is for in products people recognise.

They aren't part of the package. Each app imports `altitude-design` by name, as a consumer would, and is type-checked against the public declarations (`project/components/index.d.ts`), so no app becomes a second source for component code.

## The apps

| App | Folder | What it shows |
|---|---|---|
| Team notes | `hello/` | the smallest app on the service: pending, landed, failed, reconciled, arrived |
| Fenwick Tools admin console | `admin-console/` | settings, members, billing, API keys, security and the audit log on one workspace: every change is logged, conflicts come from other admins (#401) |
| Sprint 24 planning | `planning-board/` | a board, table, schedule and epics over one record: moves that hover until they land and go back with a reason when the server refuses (#402). Its Assistant toggle adds a scripted assistant whose proposed changes show on the cards until a person accepts them (#408) |
| Book an appointment | `booking/` | a phone-first booking flow from treatment to paid booking: a real held time that says when it ends, a text code, review with every charge, and cancelling as easily as booking (#403) |
| Storefront health | `service-health/` | an on-call report on eight services: a takeaway written by a burn-rate rule from the error budget, never the all-clear when a panel failed or a service went quiet; live charts that pause; one panel failing while the rest load; stale data that says so; declaring an incident that names who it pages and can't happen twice (#406) |
| Travel policy editor | `docs-editor/` | the whole sync pattern in one editor: sections that save as you type and hover until they land, offline edits that wait and go in order, a conflict with someone else's save shown as both versions, a session that ends mid-save with nothing lost, details saved deliberately with EditRegion, and a review round with comments, suggested changes decided one by one, and a Publish that can't happen twice (#405) |
| October expenses | `expense-reports/` | one report between two people, switched in the drawer: the employee imports card transactions (two bad rows fixed or skipped before anything is imported), edits cells by keyboard, attaches receipts through a Sheet, and submits once even when the response is lost; the manager approves, or returns it with a reason asked in place, and the employee sees why even mid-edit (#407) |

## Running them

```sh
node scripts/build-examples.mjs                 # → site-dist/examples/<slug>.html, one self-contained page each
npm run build-site                              # the same, as part of the landing page build
cd build && node checks/example-service.mjs     # the service's unit checks, and Team notes driven in a browser
cd build && node checks/example-admin-console.mjs   # the admin console driven through #401's fixtures
cd build && node checks/example-planning-board.mjs  # the planning board driven through #402's fixtures
cd build && node checks/example-agent-operations.mjs  # the assistant on the planning board, through #408's fixtures
cd build && node checks/example-booking.mjs         # the booking flow driven through #403's fixtures, at phone width
cd build && node checks/example-service-health.mjs  # the health report's rules as units, then #406's fixtures in a browser
cd build && node checks/example-docs-editor.mjs     # the docs editor driven through #405's fixtures: no text lost, nothing written twice
cd build && node checks/example-expense-reports.mjs  # both people through #407's fixtures: import, receipts, submit once, return and approve
```

`npm run typecheck` type-checks the apps along with the components.

## Adding an app

A folder in `examples/apps/<slug>/` with:

- `main.tsx`: mounts the app into `#example`, inside `ExampleFrame`;
- `app.tsx`: the app, starting with its design record (task, lead, primary action, next; see [screen layout](../../project/framework/patterns/screen-layout.md));
- `app.json`: `{ "title": "…", "description": "…" }` for the page;
- `app.css`: optional, tokens only.

`hello/` (Team notes) is the smallest complete one. Copy it.

## The simulated service

`shared/service.ts` holds the store in memory (and optionally `localStorage`), and answers `request(op, input)` after a latency, shaped by the mode chosen in the fixtures drawer.

```ts
const service = createDemoService({
  name: 'notes',                         // the log's name and the storage key's prefix
  seed: () => ({ notes: [] }),           // fresh data; Reset calls it again
  persist: true,                         // keep a copy in localStorage
  handlers: {
    'notes.list': { read: (s) => s.notes },
    'notes.add': {
      write: (s, note) => ({ state: { notes: [note, ...s.notes] }, result: note }),
      current: (s) => s.notes,           // what a conflict hands back
    },
  },
});
await service.request('notes.add', note, { signal });
```

A handler can `reject('invalid', 'Write the note first.', { field: 'text' })` as a server would (`invalid`, `not-found`, `conflict` or `unauthorized`). Failures reject with a `DemoError` whose `kind` is one of `failed`, `offline`, `conflict`, `rate-limited`, `lost-response`, `invalid`, `not-found` or `unauthorized`.

| Mode | What happens | What it proves the app does |
|---|---|---|
| Succeed | answers after 300–450 ms | the pending state is brief and lands |
| Slow | answers after six times that | pending is visible and the app stays usable |
| Fail | rejects; nothing saved | the person's input is kept, with a way to try again |
| Lose the response | a write saves, then rejects 1.1 s later with `committed: true`; reads answer | the app reads back to reconcile before retrying, and a retry can't duplicate |
| Conflict | rejects writes with the current version; reads answer | the app shows both versions instead of overwriting |
| Offline | rejects at once | the app says so and keeps the input |
| Rate limited | rejects with `retryAfter: 30000` | the app says when to try again |

"Only the next request" applies a mode once, then returns to Succeed.

**One operation, not all of them.** `setMode('fail', { ops: ['metrics.errors'] })` applies the mode to those operations (handler names, listed in `service.ops`) and lets every other request succeed: one panel fails while the rest load, autosave fails while Publish works. With `once`, it's the next of those operations. The drawer's "Applies to" picks one, and the log records the mode each request actually got.

**A session that ends.** `endSession()` refuses every write as `unauthorized` (reads still answer) until the app calls `signIn()`: the app keeps the person's work and asks them to sign in again. Give `ExampleFrame` `session` to offer "End the session" in the drawer. Reset signs back in.

**Connectivity.** `service.onConnectivity((online) => …)` stands in for `window`'s `online` and `offline` events, and `service.isOnline()` for `navigator.onLine`: false when every request starts failing as offline, true when they stop (a once-only offline ends after its request). An offline mode limited to some operations isn't a lost connection, so it doesn't fire. An app's offline queue listens to this, never to the drawer's mode, which a real app couldn't read.

`service.external(label, change)` changes the store as someone else would; apps refetch when `externalRevision` moves. `reset()` reseeds and moves `resetRevision`.

In React, `useDemoQuery(service, op, input)` reads through the service: it runs on mount, again when `externalRevision` or `resetRevision` moves, and on `reload()`; it keeps the last answer while a refresh is in flight or after one fails, ignores answers to superseded requests, and offers `setData` for an optimistic write. `DemoResource` renders a query's states around its content: an imprint while the first answer is on its way, the failure with Try again, and a note when a refresh fails after an answer.

Jitter is seeded and a clock can be injected (`createManualClock`), so a check gets the same timings every run.

**What it doesn't prove.** A timer standing in for a server proves nothing about real persistence, permissions, concurrency or recovery. An app that handles every mode here still needs its real service's behaviour verified.

## The frame and the drawer

`ExampleFrame` renders the one `AltitudeProvider`, the app, and then `FixturesDrawer` below it, outside the app's `main`: the server's mode (and which operations it applies to), events from elsewhere, the page's scheme, accent, reduced motion and contrast, the request log and Reset. It's collapsed by default and says the service is simulated.

An app's own fixtures that are state rather than events, like whose view it is or whether live data is on, go in `controls`, a "This example" section above "Elsewhere": `<ExampleFrame service={service} controls={<Switch label="Live updates" checked={live} onCheckedChange={setLive} />}>`. Like the rest of the drawer, they stay outside the app's `main`, so the app never depends on them being there.
