Altitude is a design and HCI framework with React components where **height is the interface**. Its one idea: **the ground is the record.** Settled content sits on the ground. Anything live rises above it (something to press, something in your hand, something waiting to be confirmed, something that just changed), and the higher it goes, the more temporary it is and the more it asks of you. Anything that's waiting to receive sinks below it (a field, a slot, a track, a problem to fix). Motion only ever travels along that axis. Color schemes are swappable and the accent can be any color; the elevation language is the same in all of them.

Read **Elevation** for the model and every signal height carries, **Motion** before animating anything, **Charts** before drawing data, **Mobile** before laying anything out for touch or a small screen, **Research** for the evidence and measurements behind each rule, **Theming** for schemes, custom accents and shadcn/ui, **Distinctiveness** before composing a screen, so it doesn't read as generated, and **Fundamentals** for the established design laws generated interfaces break, and where Altitude answers each.

## The laws

1. **Altitude is importance.** The more something matters right now, the higher it sits. The primary action rests at level 2; one thing at level 5, ever. Importance is the person's: what their task needs now, never what the business would rather they chose.
2. **Push up, fill down.** Things you press are raised slabs whose height you can see (a wall under the face, a convex sheen); things you fill are openings cut into the page, their back wall showing until they're filled. Every choice control is built like the Switch: a trench, a raised thumb, and the accent pouring in behind it. Never style an input as raised or a button as sunk.
3. **Tiers carry meaning, levels carry motion.** People read four tiers (sunk, ground, raised, floating) at a glance; the eight levels exist so hover and press can be *felt*. Never make two things mean different things by putting them one level apart.
4. **Only what moves, moves.** A surface lifts on hover only if clicking it does something, and nothing raised moves until the pointer is on it: no climbing toward an approaching pointer, no leaning after it. Only openings anticipate (an empty field deepens as a hand comes near). Pressing returns it to ground; disabled things stay flush.
5. **Live things are above, settled things are on the ground.** New content arrives lifted and settles; pending writes hover until they land; whatever is in a hand floats.
6. **The light never moves.** One light, straight above. Shadows only fall downward and are always darker than the ground.
7. **Height never travels alone.** Every elevation signal also has a word, an icon, an ARIA state or a border, so it survives screen readers, forced colors and low vision.

## Content

- Sentence case everywhere: buttons, titles, menu items, tabs ("Publish changes", not "Publish Changes").
- Buttons start with a verb and name the outcome: "Delete project", "Send invite". Never "OK" or "Submit".
- Speak to the person as "you"; the product speaks as "we" only in errors it caused ("We couldn't reach the server").
- Errors say what happened and what to do, in one or two short sentences: "Use at least 5 characters." No "Oops", no exclamation marks, no emoji.
- Status always carries a word and an icon, never color alone: "Operational", "Degraded", "Outage".
- Links name where they go: "View March invoice", not "Learn more", "Read more" or "Click here". A link has to make sense read on its own, because screen readers list them that way.
- An icon-only button's accessible name says the action and its object ("Delete invoice"), the words a visible label would use.
- Every field has a visible label (`Field label`). A placeholder is an example of the answer, not a label: it disappears when typing starts. A search field with only an icon still takes an `aria-label`.
- Alt text says what an image shows, in its context. A decorative image takes `alt=""`. Never "image", "photo" or a file name.
- Headings describe the section under them. One `h1` per view (`PageHeader` draws it), levels never skip, and the page has `header`, `nav` and `main` landmarks.
- Show real data or say there's none. Never fill a screen with invented figures, ratings, names or testimonials presented as real.

## Honesty

Generated interfaces add deceptive patterns nobody asked for (see [Fundamentals](Fundamentals.md)). Emphasis serves the person's task, so:

- Urgency only when a real deadline exists, and say the deadline ("Your trial ends on 12 March"). No countdowns, "only 3 left" or "limited time" without a real limit behind them.
- Declining is as easy to find as accepting. The choice the business prefers isn't the primary by default; when one choice is primary, the other is still a button, never a ghost, a faint link or a small grey word. Name it plainly ("Don't subscribe"), never with shame ("No thanks, I like paying full price").
- Nothing that costs money, shares data or subscribes someone is pre-selected.
- Every overlay can be dismissed with a close button and Escape. A decision the person must make has both choices as buttons.
- Prices, terms and conditions sit beside the action they apply to, at body size. A total includes every charge the service has quoted.
- Leaving takes no more steps than joining did. A cancellation can say what will be lost (as a downgrade's review does), never plead or offer a discount the person didn't get when they joined.
- Reviews, ratings and counts shown as real are real, and say how they were chosen ("Most recent", "Highest rated").

## Color

- Build every screen from the `surface-*` ladder: `surface-ground` for the page, `surface-raised` for cards and buttons, `surface-well` for inputs, and so on. Never invent an in-between gray; pick the level instead.
- `ink` for primary text and `ink-muted` for secondary text, on any `surface-*`. `ink-faint` is for disabled labels only.
- `accent` is the scheme's one hue: primary buttons, checked controls, fills. Put `on-accent` text on it. When the accent is text or a link, use `accent-ink`. Behind accent text, use `accent-soft`.
- `positive`, `caution`, `critical` are for status and each has a `-soft` ground. `critical` also fills the danger button, with `on-critical` text.
- `data-*` is for charts only, as `presence-*` is for people: `data-1`–`data-6` tell series apart, `data-seq-*` carries magnitude and `data-div-*` polarity. Never use them for text, surfaces or status. [Charts](Charts.md) says which job a chart's colour does.
- `line` is for decorative dividers only. Anything that marks the edge of a control (inputs, checkboxes, radios, the switch track) uses `line-control`, which holds 3:1 against every ground.
- Every text token clears 4.5:1 on all eight surfaces in both schemes. Keep it that way when adding colors: test against `surface-trench` and `surface-modal`, the extremes.

## Type

- One family, Instrument Sans (Google Fonts, weights 400–700), with JetBrains Mono for code, keys and values.
- `text-title` for page titles, `text-heading` for section, card and dialog titles, `text-body` for paragraphs, `text-label` for every control, `text-caption` for hints and metadata. `text-display` once per view, at most.
- Weight carries hierarchy before size does: labels are 500, titles 600. Never use 700 in the interface.
- Tracking tightens as size grows (−0.025em at 44px, −0.01em at 19px, 0 at 15px and below).
- Prose runs 45 to 75 characters a line: cap paragraphs at `max-width: 70ch`, as `PageHeader`'s description does. Tables, code and data are exempt.

## Spacing and radius

- 4px base: `space-1` to `space-12`. Inside a surface, padding grows with altitude: menus `space-1`, cards `space-5`, dialogs `space-6`.
- Radii grow with surface size and height: `radius-xs` checkboxes and keys, `radius-md` buttons and inputs, `radius-lg` cards, menus and toasts, `radius-xl` dialogs. `radius-full` for switches, thumbs, radios, avatars and counts; `radius-sm` for badge plates.
- Nest concentrically: an inner surface's radius is the outer radius minus the gap between them. The tab indicator is `radius-md` − `space-1`.

## Focus and states

- Keyboard focus is a 2px solid `accent-ink` ring, 2px offset, on every control you press or switch; on walled controls (buttons, breadcrumb steps) it wraps the face and the wall together. Fields are the exception: a focused field, or an open select, is held, not targeted, so its floor lights; when you reached it by keyboard its own rim also darkens to a 2px neutral (`--alt-rim-held`), with no accent and no halo. A field you clicked into needs no rim, since you know where you clicked and the caret is there. Keyboard focus is never removed or replaced by a shadow alone. Focus also triggers the same one-level lift as hover, so keyboard and pointer users get the same feedback.
- Hover: +1 level. Press: down to 0, sheen flattened. Selected: raised out of its well. Disabled: flush, `ink-faint`, no shadow. Invalid: sunk to trench depth on `critical-soft` with a `critical` rim. Loading: held pressed. Pending: hovering. Failed: dropped into a trench.
- Everything that looks pressable does something. A raised, walled or underlined element with no action is a false signifier; make it flat text.
- Don't disable a submit button to say a form isn't valid yet: a disabled button can't explain itself and keyboard users may never reach it. Let it be pressed and list what's missing (`ErrorSummary`). Disable it only while the submission is in flight, so it can't be sent twice.
- Use `presence-1`–`presence-3` only for other people (their holds, cursors, selections), never for status or decoration.

## Iconography

- Line icons on a 24px grid at 1.75 stroke, round caps and joins, in `currentColor`. The components ship the handful they need (check, chevron, close, info, status). For everything else use Lucide, which shares the grid and stroke, at 16px in controls and 18px in alerts and toasts.
- Icons sit flush. They never get their own shadow or elevation.
- No emoji in the interface.

## Using the components

- Pass your data as it is while it loads (`user?.name`, `rows={deploys}`): components whose content is still undefined imprint themselves at their own size and rise out when it arrives, with no skeleton code (see `Await`).
- Wrap the app once in `AltitudeProvider`. It sets the scheme, derives a custom accent, honors reduced motion and high contrast, and hosts dialogs and toasts so the page can recede behind them. Render `Toaster` once inside it.
- Put depth signals on any `Surface` or `Card` with props: `settle` (afterglow when a value changes), `status` (pending, committed, failed), `heldBy` (a collaborator's hold) and `relevance` (match or miss). In your own components, spread `useDepth(...)` onto the element.
- The bundle exposes everything on `window.Altitude` and expects React 18. It is a dependency-free reference implementation; the props mirror shadcn/ui, so the same styles can wrap Radix primitives in a production package.

## Charts

In a chart, the data is the record: marks are flat ink standing on a ground line, never raised, shadowed or lifted on hover, because a bar's length is already its height. Only the chart's chrome (the readout, a toggleable legend, a brush, a drill-down) uses height, and each is built like a component you already have. Colour does one job per chart, and every chart has a summary, a keyboard path and a table view. [Charts](Charts.md) has the rules, the form chooser and the build of every part.

## Actions in place

Finish a small edit where its value lives with `InlineEdit`, and several fields of one record saved together with `EditRegion`. Perform a reversible action directly when the application supplies real recovery and a durable destination. Use a focused `Dialog` when the consequence requires an explicit decision. [Actions in place](ActionsInPlace.md) contains executable recipes and the integrated Files example.

Editing is temporary local input; it is not a pending write. Pending begins only when persistence is dispatched. Keep committed content on the ground, and carry every live state with text, semantics or borders as well as height. Persistence, authorization, concurrency and reversibility remain application responsibilities.

## Task patterns

For complete product tasks, start with the [framework entry](framework/README.md). Its edit-record, async-collection, consequential-action and review-and-submit patterns combine design decisions, small workflow hooks and verification. Use only applicable states and actual application capabilities. The elevation model remains the same; a pending or successful signal must correspond to the operation's real state.
