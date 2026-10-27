# Elevation

Elevation in Altitude is not decoration. It's a channel of information with one consistent meaning, so a person can read it without being taught.

## The model: the ground is the record

- **Ground (level 0) is what's settled**: committed content, the page, the record. It doesn't move.
- **Above the ground is what's live.** Anything raised is in play right now: something you can press, something in your hand, something waiting to be confirmed, something that just arrived, something asking for attention. The higher it sits, the more temporary it is and the more it claims you: a button < a menu < a toast < a dialog.
- **Below the ground is an opening.** Anything sunk is waiting to receive something: a field to type into, a slot to drop into, a track for a thumb, or a problem to fill in (an invalid field).

Every signal on this page is a case of that one idea. When a new component needs elevation, ask which of the three it is: settled, live, or an opening.

## Four tiers you can read, eight levels you can feel

People reliably tell apart only a few depth categories at a glance; measured in Altitude's own rendering, adjacent levels in the same tier can differ by less than one just-noticeable difference (see **Research**, E1). So meaning lives in **tiers**, and the finer **levels** are for motion: a one-level climb on hover is felt even when the two levels couldn't be told apart side by side.

| Tier | Levels | Surface · shadow | Means |
|---|---|---|---|
| **Sunk** | −2 trench, −1 well | `surface-trench`/`trench`, `surface-well`/`well` | An opening: fill it, drop into it, slide along it. |
| **Ground** | 0 | `surface-ground`, `elev-0` | Settled. Read it. Badges, alerts, ghost buttons, skeletons, disabled and pressed controls. |
| **Raised** | 1 raised, 2 lifted | `surface-raised`/`elev-1`, `surface-lifted`/`elev-2` | Live in the page: cards, buttons, thumbs, the selected option. Level 2 is the primary action and the hover state. |
| **Floating** | 3 floating, 4 overlay, 5 modal | `surface-floating`/`elev-3` … `surface-modal`/`elev-5` | Above the page: menus, tooltips, things in your hand, toasts, the dialog. |

Rules that follow:

- Never give two things different meanings by putting them one level apart within a tier. If they must read differently, put them in different tiers, or add a word.
- Never encode an amount in height. A pile's thickness is three bins; the number goes in its badge.
- Use `Surface level={n}` to place anything. Never pair one level's surface with another level's shadow.

## How a level is drawn

- **Cast shadow.** Each level is four layers: a top rim, a hairline ring, a key shadow and an ambient shadow. Offset and blur grow with height, because displacement is what reads as height. The structure never changes, so any level animates into any other.
- **The hairline fades as you climb**; the cast shadow takes over the separating.
- **Tonal lift in dark schemes.** Shadows barely show on dark grounds, so in Nightfall and Alpine each level is also a step lighter. Shadows are always darker than the ground; height is never drawn with a light glow.
- **One camera.** Everything is seen from slightly in front of and above the page. Under a raised face you see its front wall; inside an opening you see its back wall, just below the top edge. Buttons and steps show the first; empty fields and the accordion's compartment show the second.
- **Visible thickness.** Pressable things (buttons, keys, breadcrumb steps) show their height as a wall under the face: `wall-1` (2px) at level 1, `wall-2` (4px) at level 2, 1px more on hover, none when pressed. It's the same cue as the cast shadow, displacement read as height, made solid.
- **Shading polarity.** Pressable things carry `--alt-sheen`, a 2–5 L* light-to-dark face gradient (convex), and wells carry a dark top edge (concave). That polarity is the cue the visual system reads before attention; pressing flattens the sheen.
- **Detached shadows.** A disc that leaves the page (a live avatar) casts its own shadow on the ground beneath it; the gap between them, and how small and faint the shadow gets, is the height. A contact shadow reads as resting and a detached one as floating, and moving a shadow alone is enough to make people see an object rise (Kersten et al., see **Research**).
- **One light, straight above.** Shadows fall only downward, so layouts mirror cleanly for right-to-left languages.

## What height tells you

| Signal | Encoding | Where |
|---|---|---|
| **Importance** | primary 2 · secondary 1 · ghost 0, drawn as wall thickness (4px, 2px, none) | `Button` |
| **Affordance** | raised + wall + sheen = press it; sunk = fill it | every control |
| **Interactivity** | only things that act lift on hover | `Card interactive`, `Surface interactive` |
| **Selection** | every choice is built like the Switch: off is an empty trench; on pours the accent in and sets a raised white mark on it (the switch and radio thumb, the checkbox's check). A radio group is one switch with several positions, so its single thumb slides to the chosen option. In folder tabs the chosen tab and its panel are one raised sheet on top of the others | `Switch`, `Checkbox`, `RadioGroup`, `Tabs` |
| **Presence** | people who are here rest on the page at level 1 (a filled lamp when active, an empty ring when idle); offline people are plates flush in the page, grey; someone live lifts off their shadow and drifts | `Avatar` |
| **Loading** | content to come is an imprint pressed into the page; it rises out of the imprint when it lands. Components whose content is still undefined (or a promise) draw their own imprint, at their own size, from their own Suspense boundary | `Skeleton`, `Await` (Suspense-native `Avatar`, `Badge`, `Card`, `DataTable`) |
| **Status** | status that informs is a tinted sheet resting on the page (paper edge, contact shadow); status that asks for action is a raised card; dismissing lifts the sheet off; several make a stack whose peeking sheets show their tones | `Alert`, `AlertStack` |
| **Labels** | a label is part of the record: an indicator plate set flush into the page, with a lamp for status that relights when it changes; only a count, which wants your attention, floats | `Badge` |
| **Disclosure** | closed sections are lids flush on the page; opening one lifts the lid into a card and reveals a compartment sunk into it; a table row's read-only detail opens flush beneath it instead, because a row can't lift into a card without breaking the columns | `Accordion`, `DataTable` |
| **Editing in place** | a record being edited lifts off the ground into a static raised card holding its fields, with its neighbours still in view; the write hovers while pending, drops to a trench on failure, and the accepted values settle back with one afterglow | `InlineEdit`, `EditRegion`, a `DataTable` row and its region rising as one slab |
| **Completeness** | an empty field is a hole cut into the page, its back wall showing; once it holds a value the floor rises flush, so a form shows which fields still need filling. A select fills when a value is chosen; a combobox too, because a typed query isn't a value. A textarea with a limit fills from the floor as it nears it | `Input`, `Textarea`, `Select`, `Combobox` |
| **Validity** | an invalid field sinks to trench depth on `critical-soft` | `Input`, `Select`, `Combobox`, `Field` |
| **The record, in rows** | a table's rows lie flush; selected rows are tinted and raised one level, interactive rows lift on hover, matches rise and misses sink when filtering in place, and a row in hand floats at level 3 over the slot it will land in | `Table` |
| **Receptacles** | a board's columns are flush at rest and open into wells only while a card is carried; the one under the card deepens to a trench; a collapsed column is a pile that still takes drops | `Board` |
| **Progress** | the steps of a process are plates on one ground line: done steps are flush in the record with a stamped check, the current one stands raised on its wall, steps to come are imprints; advancing presses one down and raises the next out of its imprint | `Stepper` |
| **Recency** | new or changed content arrives tinted and lifted, then settles to rest over `dur-settle` (afterglow) | `settle` on `Surface`, `Card` |
| **Commitment** | a pending write hovers (after `dur-grace`), a confirmed one lands, a failed one drops into a trench | `status` on `Surface`, `Card` |
| **Possession** | whatever is in a hand floats at level 3, tilted; a collaborator's hold wears their `presence-*` colour and name | `heldBy`, `SortableList`, `BoardCard heldBy` |
| **Readiness to receive** | receptacles open (sink) only while something could be dropped into them, and deepen under the pointer | `DropZone`, the slot in `SortableList` |
| **Emptiness** | a region with nothing in it yet is an opening, a well with a dashed rim that the first record will fill; pointing at its action deepens it to a trench | `EmptyState` |
| **Relevance** | filtering lifts matches and sinks misses instead of removing them, so positions survive | `relevance` on `Surface`, `Card`, `TableRow` |
| **Overflow** | edges curve away where content continues; a header rises when content passes under it | `ScrollArea` |
| **Quantity** | a group shows 0–3 sheets beneath it (2–3, 4–9, 10+ items), with the exact number in a badge; hovering it fans the sheets a little; click it and its items fan out from under the top card, each its own card, floating over the page below without moving anything | `Pile` |
| **Hierarchy** | a stack: going deeper lays a sheet on top, going back lifts it off; the breadcrumb is a staircase: every step stands on the same ground line, outlined face and wall together, and each deeper place is a taller step; the view sits on a pile as thick as you are deep | `Drilldown` |
| **Anticipation** | an opening responds before the pointer arrives: an empty field deepens to receive, and holds that depth while it's focused; a bottom sheet's finger pull opens. Raised things never anticipate: they wait until the pointer is on them | `Input`, `Textarea`, `Select`, `Combobox`, `Sheet` |
| **Feedforward** | hovering shows what a click will do before it does it: the ghost of the check a box would get, the radio thumb where it would land, a tab's sheet peeking up, a closed lid's ghost | `Checkbox`, `RadioGroup`, `Tabs`, `Accordion` |
| **Consequence** | a destructive action is pushed *through* the ground: hold until it sinks to a trench; once done it lies flat and can't be pressed again | `HoldButton` |
| **Prediction** | likely menu items arrive first; the rest fade in over `dur-onset` | `predicted` on `DropdownMenu` items |
| **Recency of messages** | toasts sink one level per newer toast behind them | `Toaster` |
| **Focus of the moment** | the page recedes while a dialog or the command palette is at the summit; only one of them at a time | `Dialog`, `CommandPalette` with `AltitudeProvider` |
| **Ranking** | the best match is on top; when results change, the rows that stay are carried to their new places, and only the top few new ones rise | `CommandPalette` |
| **A task beside the page** | a sheet is laid over the page at level 4, anchored to an edge: above menus, below the summit; it rises at its edge and is lifted off when you're done | `Sheet` |

## Rules

- **Push up, fill down.** Never style an input as raised or a button as sunk.
- **Choices are switches.** Switch, Checkbox and RadioGroup share one build: a trench track that the accent pours into when it's on, with a raised white mark on top. When only one option can be chosen there is only one mark, and it travels.
- **Hover is a promise.** A lift on hover means clicking does something. Static surfaces never lift; interactive ones always do.
- **Pressing returns to ground; loading holds it there.** Disabled things are flush and stay flush.
- **Labels never lift.** Badges are stamped into the ground and informational alerts rest on it; only an alert that asks for action is raised, and only a count (which wants you) floats.
- **Anticipate, don't perform.** Only openings anticipate, and only by deepening (at most 2px), only near the pointer, never for touch, and gone under reduced motion. Nothing raised moves before the pointer is on it, and nothing follows the pointer across its face: a control that drifts on its own reads as a fault. No lean, no tilt and no page-wide parallax.
- **One summit.** Only one thing sits at level 5: a Dialog or the CommandPalette. Never open a dialog from a dialog, and never open a sheet from either (a sheet paints beneath the summit). (Apple's Liquid Glass guidance, "avoid glass on glass", is the same rule.)
- **Don't stack floating on floating.** A menu inside a popover inside a sheet loses the reading of height; flatten the inner one.
- **Spend rises carefully.** A rising onset grabs attention. Things that merely changed state cross-fade; things that need noticing rise. Altitude staggers afterglows so no more than four begin at once.
- **Height never travels alone.** Every signal above also has a word, an icon, an ARIA state or a border, so it survives a screen reader, forced colors and low vision.

## Accessible elevation

- **Forced colors** (Windows High Contrast) strips every shadow. Altitude falls back to borders by tier: dashed for sunk (thicker for trench), none for ground, 1px for raised, 2px for floating, double for modal; pending is dotted, failed is a thick dash.
- **`prefers-contrast: more`** (or `AltitudeProvider contrast="more"`) turns shadows into hard ink slabs whose thickness is the height: 2px under a raised surface, up to 7px under a dialog. Wells get a solid inner top edge.
- **Reduced motion** keeps every level, tint and shadow change and removes travel and scale (`--alt-travel: 0`). The pending hover stops breathing and simply holds at level 2.

## Paint order

`z-floating`, `z-overlay`, `z-modal` and `z-toast` follow altitude, with one exception: toasts paint above a dialog so status is never hidden behind it, even though they are visually one level lower.

## Small actions in their context

[Actions in place](ActionsInPlace.md) applies these existing signals to everyday work. `InlineEdit` keeps a single value in its location; its static raised editor uses the existing field and button treatments. Only a dispatched save uses pending, a known failure retains input, and accepted canonical content settles back to the ground.

An ongoing recoverable condition may use a raised actionable Alert with Undo, backed by the application's real inverse operation and durable recovery destination. A Dialog can keep its background stationary while retaining the level 5 panel, dimming, isolation and focus ownership. This adds no elevation tier and changes no meaning of the record.
