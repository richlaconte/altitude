<!--
title: New: Funnel — the steps of a process and where people leave it
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

Show how many people reached each step of a process and where they left: visited → signed up → activated → paid; opened → replied → booked. It's the most common chart in product analytics and the chooser has no row for it, so authors either draw a tapering funnel shape (which encodes counts as area, the error rule 1 forbids for the same reason as pies) or hand-build a `BarList` and lose the drop-off. Aligned adjacent bars are the configuration people compare most accurately (Talbot, Setlur & Anand, 2014; Cleveland & McGill, 1984), and the drop-off between two steps is a number that belongs in words.

**Closest existing components:** `BarList` (ranked rows as bars; a funnel isn't ranked and has no drop-off), horizontal `BarChart` (the bars; no step semantics), `Stepper` (steps on one ground line; no amounts).
**Name:** `Funnel`. No shadcn/ui equivalent.

## Elevation story

**What it is:** settled. Steps on one ground line, each a flat bar from the same left edge.
**Signal it carries:** "Progress" (Elevation: steps are plates on one ground line) joined to "amounts are never height": the plates carry the counts as lengths, and the gap between two steps is the drop-off, said in words.
**Relatives it borrows from:** `Stepper`'s plates and ground line, turned to run down the page; horizontal `BarChart`'s bars and label budget; `Stat`'s change badge for the drop-off; `compare`'s tick for the period before.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| A step's bar | ground | 0 | flat `data-1`, from one left edge | the step's name, count and share of the first step ("Activated · 1,204 · 61%") |
| The drop-off between steps | ground | 0 | nothing drawn in the gap; a `Badge` plate in the gutter | "−38% · 742 left" with the `↘` icon; `critical` only when the author marks a step's drop as bad, with icon and word |
| A step that acts (opens who left) | ground | 0 | 2px `ink` outline on hover, pointer | "Select to see who left" in the readout |
| The period before (`compare`) | ground | 0 | 2px `ink` tick at the earlier count | "+11% vs last month" in the readout |
| Focused step (keyboard) | ground | 0 | 2px `accent-ink` ring | the readout |

## Motion

The one engine: counts glide (Charts 1); steps are never reordered. A step entering or leaving cross-fades. Under reduced motion, in place.

## Accessibility

**WAI-ARIA pattern:** plain HTML: `figure` with an ordered list semantics for the steps (`ol`), inside `ChartContainer`'s one-stop path.
**Keyboard:** ↑/↓ move between steps; Enter on a step that acts.
**Screen reader:** the summary says the first and last counts, the overall conversion and the largest drop ("Of 3,120 visitors, 418 paid (13%). The largest drop is between Signed up and Activated: 38%."); each step says its name, count, share and drop from the step before.
**Forced colours:** `CanvasText` bars; the drop-off plate keeps its 1px edge and icon.
**`contrast="more"`:** bars take a 1px `ink` edge.

## API sketch

```tsx
<ChartContainer config={{ users: { label: 'People', format: count } }} title="Signup funnel, October"
  takeaway="Most people who sign up never activate: 38% leave between the two steps">
  <Funnel data={steps} step="name" value="users"
    dropoff="share"            // 'share' (default: −38%) | 'count' (742 left) | 'both'
    bad={(d) => d.drop > 0.3}  // marks a drop as status, with icon and word
    compare={{ data: lastMonth, label: 'September' }}
    onSelect={(d) => openSegment(d)} />
</ChartContainer>
```

- Steps are drawn in data order, never sorted (a process has an order). A step larger than the one before is drawn as it is and said in words ("more than the step before"), because it happens (re-entries) and hiding it would misstate the record.
- `dropoff` places the plate in the gutter between bars; the share is of the step before, and the overall share of the first step is in each step's label.
- Takes `relevance` (a segment filter recedes steps that don't apply) and a `ChartScope` selection.

## Rules it strains

None. The tapering funnel shape is ruled out by rule 1's reasoning, and the README says so under "Don't".

## Out of scope

Time between steps (a `DotPlot` or `Histogram` per step). Branching processes (a sankey; "Charts Altitude doesn't draw"). Cohorts over time (a `Heatmap`).

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/Funnel/README.md` in the existing format, with "Don't draw it as a tapering shape"
- [ ] A section in `build/previews.txt` (a signup funnel with a bad drop; one against last month; one whose steps select) with an honest `@dsCard` group and subtitle
- [ ] Charts' form chooser gains "Where people leave a process"; `Elevation.md` ("Progress") and `Research.md` updated
- [ ] `tsc` clean; `shoot.mjs` renders it in both schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`; at 360px
- [ ] Keyboard paths checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Open questions

1. Vertical steps (down the page, bars running right) as the only layout, or also horizontal (steps across, bars standing)? Proposed: vertical only, because the drop-off plates need the gutter and step names are long.
