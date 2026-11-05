<!--
title: New: UnitChart — how many in a hundred, as counted marks
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

Say a frequency so it's felt as a count: "18 of every 100 trial accounts convert", "1 in 5 invoices is paid late", "3 of 40 seats are unused". The chooser's part-of-whole answers (a stacked bar, a segmented `Meter`) give a share as a length, which is right for comparing shares and wrong for grasping a risk or a rate: icon arrays raised accuracy for low- and high-numeracy readers alike (Galesic, Garcia-Retamero & Gigerenzer, 2009) and removed denominator neglect (Garcia-Retamero, Galesic & Gigerenzer, 2010). The same work found risks shown as icons read as less serious than the number alone, so the number is always said beside the marks.

**Closest existing components:** segmented `Meter` (a share as a flush track), stacked `BarChart stack="expand"`, `Heatmap` (a grid of cells, but for a value per cell).
**Name:** `UnitChart`. No shadcn/ui equivalent (an icon array, a waffle without the chart-junk).

## Elevation story

**What it is:** settled. A grid of counted marks on the ground.
**Signal it carries:** "Amounts are never height": a count is that many marks. "Colour does one job": identity for the counted part, `data-context` for the rest; `status` only when the part means good or bad, with icon and word.
**Relatives it borrows from:** `Heatmap`'s grid, its 2px parting and its wrap at narrow widths; `Meter`'s label, value and thresholds in words; `ChartMarker` shapes for a mark per group under forced colours.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| A counted mark | ground | 0 | flat `data-1` square (or a group's slot), `radius-xs`, 2px apart | the count beside the grid, in words: "18 of 100" |
| The rest | ground | 0 | flat `data-context` | "82 did not" in the summary |
| Two or more groups | ground | 0 | `data-1`…`data-n`, a marker shape each under patterns | a direct label per group with its count |
| A partial mark (a fraction of a unit) | ground | 0 | the mark filled to the fraction from the left, flat | the exact figure in the label ("18.4") |
| A mark that acts (one unit = one record) | ground | 0 | 2px `ink` outline on hover, pointer | the record's name in the readout |

## Motion

A count change fills or drains marks in order over `dur-travel-3` on `ease-glide` as one change, as a `Meter` glides; never one by one with stagger. Under reduced motion, in place.

## Accessibility

**WAI-ARIA pattern:** plain HTML: `figure` named by its label; the grid is `img` with the count as its name when units aren't records; a `grid` in the keyboard path when each unit is a record.
**Keyboard:** when units are records, the heatmap's arrows; otherwise the figure is one stop and the summary is the path.
**Screen reader:** "18 of every 100 trial accounts converted. 82 did not." Groups are listed with counts.
**Forced colours:** counted marks `CanvasText`, the rest a 1px `CanvasText` outline; groups by marker shape.
**`contrast="more"`:** marks take a 1px `ink` edge; the rest's outline darkens to `line-control`.

## API sketch

```tsx
<UnitChart label="Trial accounts that convert" total={100} value={18} noun="accounts" />

<UnitChart label="Seats" total={40} groups={[{ key: 'used', label: 'In use', value: 37 }, { key: 'unused', label: 'Unused', value: 3 }]} />

<UnitChart label="Invoices this month" units={invoices} key="id" tone={(i) => i.late ? 'critical' : undefined} onSelect={open} />
```

- `total` and `value` draw `total` marks with `value` counted; `total` defaults to 100 and is said as "of every 100" unless the units are real records (`units`), when it's "of 40".
- Columns are 10 by default, wrapping into bands at narrow widths as `Heatmap` does; a mark is at least 10px (Szafir, E42).
- `tone` only for status that means good or bad, and then the summary and label carry the word and icon.

## Rules it strains

The chooser says "part of a whole: a stacked BarChart, or a segmented Meter" and the no-pie rule's reasoning (area is read worse than length) could be read against a grid. Counting isn't area estimation: the marks are discrete, aligned and the number is said. Propose the chooser gains "how many in a hundred: `UnitChart`" beside the part-of-whole row.

## Out of scope

Pictograms (people shapes): an icon is decoration on a count; squares. Proportional areas (a treemap). Thousands of units (say the number).

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/UnitChart/README.md` in the existing format
- [ ] A section in `build/previews.txt` (18 of 100; seats by group; invoices as records with late ones in status) with an honest `@dsCard` group and subtitle
- [ ] Charts' form chooser gains "How many in a hundred"; `Elevation.md` and `Research.md` updated
- [ ] `tsc` clean; `shoot.mjs` renders it in both schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`; at 360px
- [ ] Keyboard paths checked with `ACT` (record units)
- [ ] `node build.mjs && node previews.mjs` run and committed

## Open questions

1. Should `total` above 100 be refused (say the number instead) or allowed up to 1,000 (Galesic et al. found 1,000 icons read as more serious)? Proposed: allowed to 400 (20 columns), refused above with a dev warning.
