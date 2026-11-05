<!--
title: New: ChartScope — one slice, one pointer and one palette across every chart on a page
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

A dashboard or report is several views of one record, and today each `ChartContainer` is alone: its own crosshair, its own window, its own selection and its own colour slots. `ChartScope` wraps the charts, stats and tables that share a slice so that one pointer reads across them, one brush moves them, one selection filters them, one entity keeps one colour in all of them, and the slice is said once in words. Coordinated views improved task performance by 30–80% in the earliest controlled work on them (North & Shneiderman, 2000); Recharts' `syncId` shares only the tooltip.

**Closest existing components:** `ChartContainer` (`relevance`, `selected`, `window`, `live`), `ChartBrush`, `FilterBar` + `DateRangePicker` (the slice's controls), `DataTable` (`relevance` as the same filter language). None of them knows a neighbour.
**Name:** `ChartScope`. No shadcn/ui equivalent.

## Elevation story

**What it is:** a context, with one flush caption. The record and its views stay on the ground; nothing new is raised.
**Signal it carries:** "Filtered in place" (Charts) extended across components: a selection anywhere recedes misses everywhere, positions held. "The crosshair" becomes one pointer shared by every chart with the same x scale.
**Relatives it borrows from:** `FilterBar`'s one row of conditions; `DataTable`'s relevance; `ChartBrush`'s window; `ChartContainer`'s "Filtered to EU · Clear".

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| The slice caption ("Last 30 days · EU · 4 of 12 services") | ground | 0 | flush, `text-caption` `ink-muted` | words; `aria-live="polite"` on change |
| Shared crosshair, in every chart with the same x | ground | 0 | 1px `line-control` rule | the readout opens in the chart under the pointer only; siblings mark the x with the rule and name it in their readout on focus |
| Mark matching a selection made elsewhere | ground | 0 | flat series colour | as `relevance` today |
| Mark missing a selection made elsewhere | ground | 0 | 35% of its colour | the caption's count; "Clear" |
| Entity colour across charts | ground | 0 | one `data-*` slot per entity key | the same legend key and pattern everywhere |

## Motion

None new. A sibling's crosshair steps with the readout, no easing (Motion, Charts 10). Receding on a shared selection cross-fades over `dur-travel-1` (Charts 15). A shared window cross-fades each chart as a brush does (Charts 19). Under reduced motion all of it changes in place.

## Accessibility

**WAI-ARIA pattern:** plain HTML: a `section` or `region` named by its heading, with a `p` caption.
**Keyboard:** unchanged per chart. Escape clears a shared selection from any chart in the scope before stepping up a level, as it does today for a local one.
**Screen reader:** each chart's generated summary gains the slice sentence ("Filtered to EU, 4 of 12 services match"); the caption is polite, announced once per change, never per crosshair move.
**Forced colours:** the shared crosshair is `CanvasText`; receded marks stay at 35%, as today.
**`contrast="more"`:** as the charts' own.

## API sketch

```tsx
<ChartScope
  slice="Last 30 days · EU"                   // said once, in words
  selected={region} onSelectedChange={setRegion}
  window={range} onWindowChange={setRange}
  palette={{ by: 'service' }}                 // one slot per entity key, in first-seen order
>
  <FilterBar … />
  <StatGroup>…</StatGroup>
  <Card><ChartContainer …><LineChart data={errors} x="t" /></ChartContainer></Card>
  <Card><ChartContainer …><LineChart data={latency} x="t" /></ChartContainer></Card>
  <Card><ChartContainer …><BarChart data={byService} x="service" onSelect={…} /></ChartContainer></Card>
  <DataTable rows={incidents} relevance={…} />
</ChartScope>
```

- **Pointer:** charts whose x scale shares a domain kind (time with time) draw the crosshair at the same x; the readout opens only in the chart under the pointer or focus.
- **Window:** one `ChartBrush` anywhere in the scope sets every time chart's `window`; `onWindowChange` is the one callback.
- **Selection:** a chart's `onSelect` sets the scope's `selected`; every chart and `DataTable` in the scope receives it as `relevance` by a `match` function the author gives per view, or by a shared key.
- **Palette:** `palette.by` names the key whose values are entities; slots are assigned in first-seen order across the scope and held for its life, so "EU" is `data-2` in every card (Charts rule 5, "colour follows the entity", made true across a page). A chart's own `config.color` still pins.
- **Words:** `slice` renders once as the caption; the scope appends the match count when a selection is on.

## Rules it strains

Charts rule 5 says colour follows the entity *within a chart*. The scope makes it hold across charts, which means a chart's slot order may no longer be its config order. Propose: config order inside a scope yields to the scope's entity order, and the README says so.

## Out of scope

Small multiples (`ChartGrid`, its own issue, which uses this scope's pointer). Persisting the slice in the URL (the application's). Cross-page scopes.

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/ChartScope/README.md` in the existing format
- [ ] A section in `build/previews.txt` (the service-health dashboard's three charts, a stat row and a table, scoped) with an honest `@dsCard` group and subtitle
- [ ] `Charts.md` ("Dashboards") describes the build; `Elevation.md` "Filtered in place" row names it; `Research.md` carries the review
- [ ] `tsc` clean; `shoot.mjs` renders it in both schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`
- [ ] Keyboard paths checked with `ACT`: a selection in one chart, Escape from another, the caption's announcement
- [ ] `node build.mjs && node previews.mjs` run and committed

## Open questions

1. Should the shared crosshair also open a reduced readout (value only) in sibling charts, or mark the x alone? Marking alone keeps one readout per page; the study in the research pass's §8.1 can decide.
2. Does `StatGroup` take the scope's selection (a stat per entity recedes), or only charts and tables?
