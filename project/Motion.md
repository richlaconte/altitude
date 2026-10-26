# Motion

Motion in Altitude does one job: it shows a surface changing level. Nothing slides in from the side, bounces for fun or spins for attention. If a change doesn't move something up or down the ladder, it's a cross-fade or nothing.

## Duration is distance

Every transition takes 100ms plus 40ms for each level it travels. A hover lift (one level) is `dur-travel-1`, 140ms; a menu opening from a level-0 trigger to level 3 is `dur-travel-3`, 220ms; a dialog rising to level 5 is `dur-travel-5`, 300ms. Because the rule is shared, a tooltip and a dialog feel like the same physics at different heights.

| Token | Value | Use |
|---|---|---|
| `dur-press` | 90ms | Pressing down to ground. Fast, so the press feels immediate. |
| `dur-travel-1` | 140ms | Hover lift, color and fill changes, checkbox and radio state. |
| `dur-travel-2` | 180ms | Tab indicator, switch thumb, menu highlight, field messages. |
| `dur-travel-3` | 220ms | Tooltips, popovers, menus, accordion. |
| `dur-travel-4` | 260ms | Toasts, sheets. |
| `dur-travel-5` | 300ms | Dialogs, and the page receding behind them. |
| `dur-sweep` | 1600ms | Light passing over a skeleton imprint, and the indeterminate progress loop, per pass. |

Signal timings, each set from research or measurement (see **Research**):

| Token | Value | Use |
|---|---|---|
| `dur-grace` | 300ms | A write that confirms within this never shows as pending. Under about 0.1s feels instant and under 1s keeps flow, so fast saves stay invisible and only slow ones hover. |
| `dur-onset` | 500ms | Non-predicted menu items fade in over this; predicted ones are there at once. 500ms helped in Findlater et al.'s studies, 250ms didn't. |
| `dur-hold` | 1000ms | How long a HoldButton must be held: long enough to be deliberate, short enough not to feel like a punishment. |
| `dur-hover` | 1800ms | One slow breath of a pending surface. Slower than any transition, so it reads as waiting, not as motion to follow. |
| `dur-settle` | 8000ms | Afterglow: full strength for the first second, noticeable for about four, gone by eight (measured). |

Exits run at 70% of their entry: attention has already moved on.

## Curves

- `ease-rise` for anything entering or gaining height: it decelerates into place, like something lifted and set down.
- `ease-sink` for anything leaving or losing height: it accelerates away.
- `ease-settle` for things that snap into a slot (switch thumb, tab indicator, menu highlight, a button released after a press). It overshoots by 2–3%, felt more than seen.
- `ease-glide` for changes of size or position at one level: accordion height, progress width.
- `ease-decay` for the afterglow fading, after its first second at full strength.

## Choreography

- **Rise from where it's anchored.** Popovers and menus grow from their trigger's edge (`transform-origin` on that side), tooltips from the side facing their anchor.
- **Shadow travels with the surface.** On enter, a floating surface starts at `elev-1` and grows to its level while it moves; on exit it shrinks back. The shadow is part of the motion, not a separate fade.
- **Small distances.** Surfaces travel 4–16px and scale from 0.96, never more. Larger moves read as navigation, not elevation.
- **Stagger only lists that arrive together**: 16ms per menu item, capped by the list's length.
- **One shared indicator.** Segmented tabs and menus have one raised pill or highlight that glides to the new choice, instead of each option fading in and out.
- **Press is fast, release settles.** Down in `dur-press` with a plain ease-out; back up on `ease-settle`.
- **Rises are an attention budget.** An abrupt onset captures attention whether the person wants it or not, and people track only about four moving things at once. Altitude lets at most four afterglows begin in any 250ms window and staggers the rest by 90ms; apply the same budget to anything you make rise. Things that merely change state cross-fade instead of rising.
- **Animate only what is congruent with the change.** Animation helps when its motion *is* the change (a surface gaining height, a view descending into a child) and adds nothing when it's decoration. If a transition doesn't move something along the ladder or through the hierarchy, it fades.
- **Stacks, not slides.** `Drilldown` lays the child on top of the parent and presses the parent beneath it; going back lifts the top sheet off. The new breadcrumb step drops onto the staircase. Animated transitions like this measurably help people rebuild where things are.
- **Carried, not teleported.** When there's one of something (the radio thumb, the switch thumb, the segmented pill, the menu highlight), it travels to its new place on `ease-settle` so the eye can follow where the choice went; the radio's accent pours in as the thumb arrives.
- **Brought to the top.** Folder tabs don't slide: the chosen tab's sheet comes up from behind (its tab rises 10px into place over `dur-travel-3`, the panel's shadow swells from `elev-1`) while the old tab drops back on `ease-sink`.
- **Filled, not swapped.** When an empty field gets its first character, its floor rises flush on `ease-settle` and the text rises with it; an invalid field drops to trench depth on `ease-sink` instead of shaking.
- **Filled by choosing.** A Select's floor rises flush when a value is chosen, as the list sinks back and the value settles in with a brief afterglow (a fifth of `dur-settle`). A Combobox's floor waits for the choice: typing doesn't fill it.
- **Opened in the cell, settled in the row.** A `DataGrid` cell entering edit drops its floor to a well (`dur-travel-1`, `ease-sink`) with its text in place; a committed value rises flush and settles, and a pasted block settles as one region rather than one rise per cell.
- **Imprinted, then risen.** A component's own imprint (shown while its content is undefined or a promise) waits `dur-grace` before it fades in, so a quick load shows nothing and lands without moving. A slower one rises 8px out of its imprint (`dur-travel-3`, `ease-rise`) as the imprint fills in behind it, within the attention budget; containers leave no imprint, their content just rises. In a `RevealGroup`, parts that land early stay imprints until the slowest arrives, then rise together.
- **Pressed into the record.** Advancing a Stepper presses the current step to the ground (`ease-sink`) and stamps its check in, then, about 150ms later, raises the next step out of its imprint (`dur-travel-3`, `ease-rise`, within the attention budget). The two never move at once, so the eye follows the press and then the rise.
- **Sunk in, never begging.** An `EmptyState` appears by sinking from flush to its well (`dur-travel-1`, `ease-sink`): the inverse of content arriving lifted. It never pulses or loops. Under reduced motion it still changes depth, as every surface does, but nothing travels.
- **Lifted off.** Dismissing an alert lifts the sheet 8px as its shadow spreads, fades it, and only then closes the gap. In an `AlertStack` the next alert comes up from under it.
- **Stamped and relit.** A badge whose label changes is re-stamped onto the page (down 3px, settling); one whose status changes relights its lamp (the flat dot fills in from an empty ring, `dur-travel-3`). A count pops up when its number changes.
- **Gap, not glow.** An avatar's height is animated through one registered property, so its face and its shadow move as one: as the face leaves the page its shadow appears beneath it, then shrinks and fades the higher it goes; someone live drifts over `dur-hover`, and a pressable avatar lifts on hover.
- **Fanned out, not opened.** Opening a `Pile` slides its items out from under the top card, 22ms apart, floating over the page below; closing slides them back under.
- **Risen at the edge.** A sheet appears where it's anchored: it travels 16px out of its edge as it fades in and its shadow grows to `elev-4` (`dur-travel-4`). It never crosses the screen. Closing lifts it off: up 8px, 101%, shadow spreading, in 70% of the time.
- **Carried and landed.** A card picked up off a board floats at level 3, tilted 1.2°, and follows the pointer with no easing at all (the hand leads); everything else moves on `ease-settle`. The slot it will land in opens as it goes; let go and it's carried into the slot with a slight overshoot (`ease-settle`, `dur-travel-3`) while its shadow sinks back. The columns open (`ease-sink`) when carrying starts and close (`ease-rise`) when it ends.
- **Hover intent.** A HoverCard waits 400ms before rising and 250ms before going; neighbours open at once while warm (Tooltip's warm-up, shared), and one hands over to the next.
- **Rows are carried.** When a table's order changes (a sort, a move), each row travels from where it was to where it now belongs (FLIP, `dur-travel-3`, `ease-glide`), all at once and at one level: a re-sort is one change, not many arrivals, so it doesn't spend the rise budget. Reduced motion re-sorts in place.
- **Results are carried.** When a list changes under a query (the command palette), rows that stay travel to their new places (FLIP: measured before and after, then animated from the old place, `dur-travel-2`, `ease-glide`) and the list's height glides to fit. New rows near the top rise 4px within the attention budget; the rest cross-fade. Under reduced motion they all cross-fade.
- **Repeat the warm state.** After one tooltip has shown, its neighbours open instantly for 400ms. Moving along a toolbar shouldn't make you wait at every button.

## Approach

Openings respond to the pointer *before* it arrives; nothing else does. One shared tracker (started by any component that uses it) follows a mouse or pen, never touch, and writes `--near` (0 at the edge of the element's radius, 1 when touching, smoothstepped) and, while hovered, `--mx`/`--my` (where the pointer is on the element, −1…1).

| Component | Radius | Response |
|---|---|---|
| `Input`, `Textarea`, `Select`, `Combobox` | 56px | an empty field's inside wall deepens by up to 2px, and the placeholder sinks with it; once focused, it holds that depth until something is put in it |
| `Sheet` (bottom, dismissible) | 48px | the finger pull deepens by up to 1px |

Raised things never use it. A button, card, crumb, step, pile or board card stays exactly where it is until the pointer is on it, and then changes once (its hover state); it doesn't climb toward an approaching pointer or lean after it across its face. An earlier version did both, and in use it read as the control drifting on its own, as if something were wrong. An opening deepening is different: the field itself doesn't move, only its depth does, and that previews what focusing it will do.

Approach only adds depth, never size or position, so nothing reflows. Values update once per frame and every response rides the element's existing transition. Mark your own element with `data-approach` (and call `useApproach()`) to use the same variables, and keep to the same rule: deepen openings, never move what's raised. `AltitudeProvider approach={false}` turns it off for a subtree.

## Reduced motion

`--alt-travel` multiplies every translate and scale distance. It is 1 by default and 0 under `prefers-reduced-motion` or `AltitudeProvider motion="reduced"`. At 0, surfaces still change level, tint and shadow, and still fade, so state is never lost; they just don't travel. Every approach effect is multiplied by it too, so it disappears (a focused field doesn't deepen either); an avatar's shadow still shrinks with its height even though the face no longer moves. The skeleton sweep and indeterminate travel stop, and a pending surface holds at level 2 instead of breathing.
