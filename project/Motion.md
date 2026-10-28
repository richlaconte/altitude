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
- **Opened to fit.** A multiline `InlineEdit` glides its height from the read text to the editor's as it opens (`ease-glide`, `dur-travel-3`). Afterwards the textarea grows with what's typed without animating each line: typing is not a change of level.
- **Chosen, then settled.** An `InlineEdit` with `commit="on-choose"` saves as soon as its Select or Combobox reports a value. The list sinks and the field's floor rises flush first; only when that motion has finished does the editor settle back to the ground with its afterglow. The two never move at once, as in the Stepper.
- **Lifted to edit, settled when saved.** An `EditRegion` rises one level as it opens (`dur-travel-1`, `ease-rise`) while its height glides to the form's (`ease-glide`, `dur-travel-3`); the fields fade in together, never staggered. Cancel glides back in 70% of the time on `ease-sink`. An accepted save settles the region with one afterglow, however many fields changed, so it spends one rise. Under reduced motion levels and tints still change; the height changes at once.
- **Stamped in, lifted off.** A tag added to a `TagInput` is stamped into the field's floor (down 3px, `ease-settle`); several from one paste are stamped together, as one change. The first Backspace arms the last tag (it lifts one level on a critical tint, `dur-travel-1`); the second lifts it off as an alert is dismissed (up 8px, fading), then the gap closes. Reduced motion keeps the tint and depth and drops the travel.
- **Carried across the month.** In a `Calendar` the chosen day's raised mark is carried to the newly chosen day (`ease-settle`, `dur-travel-2`), as the radio thumb is; the panel then sinks back and the field's floor rises flush (**Filled by choosing**). Changing month is lateral, so the grid cross-fades (`dur-travel-1`) instead of sliding. Under reduced motion the mark appears in place.
- **Carried through the hierarchy.** A `Tree` node carried by keyboard is shown where it will land at each step; carried by pointer, a floating copy follows the pointer with no easing while slots open at the target's depth. Resting over a closed node for 600ms opens it (a spring-loaded folder). Expanding turns the chevron (`ease-settle`) and reveals the children without a rise: they're existing records. Renaming sinks the label into a well (`dur-travel-1`, `ease-sink`); a saved or added node settles with an afterglow.
- **Written, then pressed in.** In a `Checklist`, Enter opens the next line as a well under the current one (`ease-sink`, `dur-travel-1`). Checking an item pours the checkbox, then draws the strike left to right as the text mutes (`dur-travel-2`). Indenting is a change of hierarchy, the one place a line moves sideways; it takes its new indent at once, without travel. Under reduced motion the state changes remain and nothing travels.
- **Chosen, then asked.** Adding a `FilterBar` condition: the field list sinks, and only then does the new condition's value picker rise (the Stepper's press-then-rise ordering). A changed condition is re-stamped, as a Badge is, and the results change their relevance in place within the rise budget.
- **Drawn, then risen.** In a `Schedule`, dragging across empty time draws a well that follows the pointer with no easing; releasing raises it into an event (`dur-travel-2`, `ease-rise`) and focuses its title. Carrying an event is Board's: the days open into wells, the event follows the pointer, and the slot under it deepens. A new week cross-fades. Under reduced motion levels and tints still change and nothing travels.
- **Opened in the cell, settled in the row.** A `DataGrid` cell entering edit drops its floor to a well (`dur-travel-1`, `ease-sink`) with its text in place; a committed value rises flush and settles, and a pasted block settles as one region rather than one rise per cell.
- **Lifted from the list.** In an `ItemGroup`, Edit lifts one slat into its editor while the neighbours are pushed down by the height change, not animated on their own. The add slat rises out of its well into an empty editor; once added, the new slat settles with an afterglow and a fresh add slat is ready below. A removed slat leaves and its Undo Alert rises; Undo brings it back with an afterglow.
- **Added at the foot.** A Board column's add slot rises out of its well into a new card (`dur-travel-2`, `ease-rise`); once the card is created the field stays, empty, for the next one. Renaming sinks the card's title into a well; saving settles it.
- **Opened under the row.** A DataTable row's detail glides open beneath it with no rise (it's the record, revealed). Editing adds the one-level rise to the row and its region together; Cancel or Save settles them back, and a saved row whose sort position changed is then carried to its new place (FLIP), after it has landed, never during the edit.
- **Chosen, then settled.** An `InlineEdit` with `commit="on-choose"` saves as soon as its Select or Combobox reports a value. The list sinks and the field's floor rises flush first; only when that motion has finished does the editor settle back to the ground with its afterglow. The two never move at once, as in the Stepper.
- **Changed where it sits.** A `PropertyList` value rises into its InlineEdit editor (`dur-travel-1`); with `commit="on-choose"` the picker's list rises from it with no editor row in between. An unset value's well fills flush when it's set (**Filled, not swapped**), then settles. Edit all lifts the list into one raised EditRegion.
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
- **Charts glide, they don't grow.** A chart's data changes at one level, staged, by one engine every chart shares: see **Charts** below.
- **Repeat the warm state.** After one tooltip has shown, its neighbours open instantly for 400ms. Moving along a toolbar shouldn't make you wait at every button.

## Charts

Every chart moves by one engine, built into `ChartContainer`, so no chart type has its own easing. Marks have no level, so none of this is height: it's position, length and presence changing on the ground.

1. **A data change happens at one level.** Marks glide to their new values on `ease-glide` over `dur-travel-3`, all at once. It's one change, not many arrivals, so it doesn't spend the attention budget.
2. **A rescale comes first.** If y's domain changes, the axis and gridlines glide to it first (`dur-travel-2`), with the marks keeping their old values so they move only with the scale; then the marks glide to their new values on a still axis (`dur-travel-3`). The two never happen at once, as a `Stepper` presses before it rises. Ticks that leave fade out as the new ones fade in.
3. **Re-sorted bars are carried** to their new places, as table rows are. A stack's segments glide together, so the parts stay stacked while the total changes.
4. **No decorative entrances.** On first render the plot fades in place (`dur-travel-1`). Data that lands out of a loading imprint fades in place too: it never rises out of it as `Await`'s content does, because a rising bar would leave the ground line. A refetch never imprints; after `dur-grace` the marks drop to half strength until the new data glides in. A bar grows from the ground line only when its value really goes from zero to something.
5. **Lines morph only when x is the same.** If the x values change under a line (a new range, a new interval), the old plot and the new one cross-fade instead. A line is never drawn on, and its end label moves with its end.
6. **Records and series that enter or leave cross-fade.** Exits take 70% of the entry's time, so what's leaving is gone before what's arriving has settled. A series toggled from the legend leaves and returns the same way, and its key's swatch drains or fills over `dur-travel-1`, like a Checkbox.
7. **An interruption retargets** from where the marks are, so nothing jumps back to the old destination first.
8. **Chart and table cross-fade.** Switching a chart's view fades one out as the other fades in, in the same box, over `dur-travel-2`; it never slides, because they're two views of one record, not two places.
9. **Focus moves at once.** The keyboard's ring jumps to the next point with no transition, because it's focus; the readout opens on it as it does under the pointer, and while a series is focused the others recede over `dur-travel-1`.
10. **The readout steps, it doesn't drift.** It rises like a `Tooltip` the first time (4px, `elev-1` to `elev-3`, `dur-travel-3`) and shares its 400ms warm-up; after that it steps between x positions with no easing and the crosshair snaps with it. It follows the data, not the pointer's every pixel, so it never reads as something drifting. It leaves in 70% of its entry.
11. **Past 500 marks** changing at once, the plot cross-fades instead of gliding.
12. **Reduced motion:** values change in place, as a cross-fade between the old chart and the new one, and nothing travels. Resizing never animates, with or without it.

**Word-sized charts don't move.** A `Sparkline` has no motion of its own: it lands out of its imprint like any inline `Await` content, and when its value changes in a live table the row gets the afterglow, not the line.

**Numbers change, they don't count.** A `Stat`'s changed value cross-fades over `dur-travel-2` (the old figure fading out over the new) and the stat takes the afterglow within the attention budget. Counting up is never offered: it delays the number for decoration. A stat whose value loads lands out of its imprint like `Await` content; in a `StatGroup` they land together.

`checks/chart-motion.mjs` samples every frame of these changes and fails if the axis and the marks move at once.

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
