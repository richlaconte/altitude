<!--
title: ChartTooltip: pin a reading to the plot, and compare two
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`ChartTooltip` (the readout), laid out by `ChartContainer`.

## What you're trying to do

Keep a number you looked at, and compare it with another. Today the readout is the only way to inspect a value precisely, and it disappears as soon as the pointer or focus moves. Comparing two points ("how much higher is Friday than Monday?") means holding one in memory while finding the other. That's the gap Gleicher's "explicit encoding" fills ([TVCG 2018](https://pages.graphics.cs.wisc.edu/VisSnacks/papers/comparison)).

It's also Altitude's characteristic move, missing from charts: **live things settle.** The readout is live (floating, level 3). Pinning lets it land on the record as a plate, the way an afterglow settles, a pending write lands and a `RemovalReceipt` stays in place.

## Today

[ChartTooltip README](../../../../project/components/ChartTooltip/README.md): the readout rises like a `Tooltip`, steps between x positions, and on touch stays after the finger lifts until a tap elsewhere (E27). Nothing persists.

## Proposal

```tsx
<LineChart data={signups} x="day" pinnable onPinsChange={setPins} />
```

- **`pinnable?: boolean | number`** on chart types (default max 2 pins): with the readout open, **P** or a click on the plot pins the reading at that x.
- **A pin is a plate on the ground.** The readout drops from level 3 to a flush plate at the top of the plot, built like `ChartAnnotation` (a `Badge` plate, `radius-sm`, with a 1px `line-control` leader to its x), holding the label and values. The plate gets the afterglow once as it lands.
- **Two pins compare.** With two, a strip under the x axis between them says the difference in words and numbers: "+12% over 6 days", or the differences per series. That's the explicit encoding.
- **Removing.** Each plate has a ghost close button (it acts, so it lifts on hover, as a ghost button does). Escape on the chart clears the last pin before it clears a selection.
- **Controlled:** `pins` / `onPinsChange`, so an application can keep them in the URL or share them.

**Open questions, to settle in review:**

1. **Clicks that already act.** When marks are selectable or drill (`onSelect`, `drill`), a click is taken. Propose P only, plus a "P to pin" line in the readout's action area (E41's slot).
2. **Touch.** A hold opens the readout and a tap elsewhere closes it (E27). Propose a "Pin" button inside the touch readout.
3. **Is a pin "the record"?** It's the reader's note rather than data. Plates are "part of the record" in Elevation's Labels row, which fits a note the reader set down; review it against ChartAnnotation's plates so the two don't read identically (perhaps a pin icon in the plate).

**Additive?** Yes: off by default.

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Readout (unchanged) | floating | 3 | `surface-floating` · `elev-3` | role and live text, as now |
| Pinned plate | ground | 0 | `Badge` plate · `elev-0` | listed in a "Pinned readings" group; each announced when pinned |
| Plate's remove button | ground → raised on hover | 0 → 1 | ghost button | accessible name "Remove pin, Mar 14" |
| Comparison strip | ground | 0 | flat text, 1px `line-control` bracket | its text is the difference |

## Motion and accessibility

- **Motion:** pinning moves the readout's surface from level 3 to 0 over `dur-travel-3` on `ease-settle` (three levels), then the plate takes the afterglow within the attention budget. Removing lifts the plate off as an Alert's dismiss does. Under reduced motion it appears and disappears in place, and the afterglow tint stays.
- **Keyboard:** P pins at the focused point; pins are reachable in the summary → series → points path as a "Pinned" level, or as a group of buttons after the chart. Decide which in review.
- **Screen reader:** "Pinned Mar 14: 2,410 signups." With two pins: "Mar 20 is 12% higher than Mar 14."
- **Forced colours:** plates take the ground fallback (no border) plus their 1px leader in `CanvasText`.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the ChartTooltip README and its `build/previews.txt` section updated with a pinnable preview
- [ ] `Elevation.md` gains a "A reading set down" row; `Motion.md` "Charts" gains the pin choreography
- [ ] A design review in `Research.md`, answering the open questions
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; pointer, keyboard and touch checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte, from a chart design research pass (`docs/research/charts/`).
