<!--
title: ChartContainer: say what changed since a snapshot
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`ChartContainer`, so it applies to `BarChart` and `LineChart` first (the types with a comparison mark, from "BarChart, LineChart: read each value against a previous period"), then `Heatmap` and `ScatterChart`. Depends on that issue for its mark.

## What you're trying to do

Answer the dashboard question "what moved since I was last here?" Altitude spends a lot on recency: the afterglow, the attention budget, `live` charts that outline a changed mark. But that only covers changes that arrive while the reader is watching. A person who opens a dashboard each morning gets no help, and change blindness says they won't find the change unaided ([Rensink, O'Regan & Clark, *Psychological Science* 1997](https://doi.org/10.1111/j.1467-9280.1997.tb00427.x)). Phosphor, already the basis of Altitude's afterglow, showed that a trace of a change makes it findable (Baudisch et al., UIST 2006; Research.md).

## Today

`live` (`ChartContainerProps`, chart.tsx around line 820): new or changed marks get a decaying 2px `ink` outline (more than four, and the "Updated" caption glows instead). It only compares consecutive data while mounted. Nothing persists or compares against an older snapshot.

## Proposal

```tsx
<ChartContainer config={config} since={{ data: snapshotFromLastVisit, label: 'since Tuesday 09:00' }}>
  <BarChart data={queues} x="queue" />
</ChartContainer>
```

- **`since?: { data: ChartDatum[]; label: string }`**: records are matched by x (or `id` where the type has one). A record whose value differs from the snapshot carries the comparison mark from the compare issue (a 2px `ink` tick at its old value on bars, the old point as a small hollow `ink-muted` ring on lines), plus its change in the readout, its accessible name and the table.
- **The frame says it in words:** "3 changed since Tuesday 09:00". That caption is a toggle (built like a `Switch`, as `pausable`'s is) that turns on `relevance` for the changed records, so "show me only what changed" recedes the rest to 35% where they stand (E40).
- **Recency on arrival:** on first render, up to four changed marks get the existing `live` afterglow outline, within the attention budget. More than four, and the caption takes the tint instead, as in `live`. After that, only the persistent tick and the words remain.
- **What the application provides:** the snapshot and the label. Storing what a person last saw (and when) is the application's responsibility, as persistence is elsewhere in the framework.

**Additive?** Yes.

## Elevation impact

None to tiers or levels: the marks stay flat; the caption is text and a `Switch`.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Changed mark's previous value | ground | 0 | flat 2px `ink` tick / hollow `ink-muted` ring · none | "up 12 since Tuesday" in its name, readout and table |
| "3 changed since …" toggle | sunk + raised | Switch's | Switch's build | the caption text; `aria-checked` |
| Arrival afterglow | ground | 0 | 2px `ink` outline decaying over `dur-settle` · none | the caption's count |

## Motion and accessibility

- **Motion:** the arrival outline uses `live`'s choreography exactly (Motion, Charts rule 14): full for a second, decaying over `dur-settle` on `ease-decay`, at most four. Toggling "only changes" cross-fades misses over `dur-travel-1`. Under reduced motion the outline still tints and nothing travels.
- **Screen reader:** the count is part of the summary ("3 of 8 queues changed since Tuesday 09:00, most of all Billing, up 40%"). Nothing is announced on arrival; it's in the description.
- **Forced colours:** ticks `CanvasText`; the arrival outline `Highlight`, as `live`'s is.
- **Not decided:** whether "since" should also work with `live` (the snapshot advancing as the person acknowledges changes). Out of scope for this issue.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the ChartContainer README and a `build/previews.txt` section ("Since your last visit") updated
- [ ] `Elevation.md` **Recency** row extended to charts read against a snapshot; `Charts.md` "Signals a chart can carry" gains "Changed since"
- [ ] A design review in `Research.md`
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; reduced motion and `FORCED=1` checked; toggle checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered (optional)

- **A "New" badge on each changed mark.** It crowds the plot and puts a raised-looking plate on the data.
- **Colour changed marks.** Colour is already doing its one job (rule 5).

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte, from a chart design research pass (`docs/research/charts/`).
