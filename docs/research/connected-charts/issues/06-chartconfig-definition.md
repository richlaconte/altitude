<!--
title: ChartConfig: a definition for each measure, on hand at the legend, the readout and the table
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`ChartContainer`'s `ChartConfig` (`chart.tsx`, `ChartSeriesConfig`), with `ChartLegendContent`, `ChartTooltipContent` and the table view, which show it. One change in the config, three places that read it.

## What you're trying to do

Say what a measure means where it's read. "Active users" on one card and "Active users" on the next are often two definitions (signed in within 28 days; opened the app this month), and the reader can't tell. Practitioner accounts of dashboards disagreeing by metric definition are many and consistent; peer-reviewed evidence is thin, so this is filed as a gap the content rules already imply ("status always carries a word") rather than a measured finding. `Stat` already has `help` for this; a chart's series have nothing.

## Today

`ChartSeriesConfig` has `label`, `color`, `format`. The legend key says the label; the readout says the label and value; the table header says the label.

## Proposal

```tsx
const config = {
  active: { label: 'Active users', definition: 'Signed in at least once in the last 28 days.', format: count },
};
```

- `definition?: ReactNode` per series. The legend key (static or toggle) gets an info affordance that opens a `HoverCard` with the definition, on hover and on focus, as `InlineCitation`'s preview does (E100); the table view's header carries the same in a `HoverCard`; the readout doesn't show it (it's live and brief) but the series node's accessible description in the keyboard path does.
- With a single series and no legend, the definition sits under the title as the description does, so it's never unreachable.
- A `ChartScope` can carry a `definitions` map keyed by series key, so one definition serves every chart in it.

**Additive?** yes.

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| The info affordance on a legend key | ground | 0 | the `info` icon in `ink-muted`, flush | its name: "What Active users means" |
| The definition card | floating | 3 | `HoverCard` | the words |

## Motion and accessibility

`HoverCard`'s own (rises as a tooltip, with the shared warm-up). Keyboard: the affordance is focusable within the legend key; Enter opens, Escape closes. Screen reader: the series node says "Active users, defined as …" once at the series level, never per point. Forced colours and `contrast="more"`: `HoverCard`'s.

## Out of scope

Where definitions live (a semantic layer, a metrics file): the application's. A definitions page.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the `ChartContainer` and `ChartLegend` READMEs and `build/previews.txt` updated (two cards whose "Active users" differ, each defined)
- [ ] `tsc` clean; `shoot.mjs` clean in both schemes; hover and focus checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered

Putting the definition in the `label` ("Active users (28 days)"). It crowds every legend and end label, and still doesn't define the term.
