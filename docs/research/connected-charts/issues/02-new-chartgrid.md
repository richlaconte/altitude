<!--
title: New: ChartGrid — small multiples with one axis, one legend and one pointer
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

Show one series per panel when there are too many to overlay or their scales differ: eight services' error rates, revenue by region, a metric per cohort. Charts rule 6 forbids a second axis and names small multiples as the answer, and nothing builds them: today an author lays out `Card`s by hand and gets eight y axes, eight legends and eight pointers. Juxtaposed series stay readable as their number grows where superimposed ones don't (Javed, McDonnel & Elmqvist, 2010), and E104 deferred multi-scale banking to "small multiples could carry it later".

**Closest existing components:** `ChartContainer` (one chart), `ChartScope` (the shared pointer and palette this uses), `Card` grids laid out by hand.
**Name:** `ChartGrid`. No shadcn/ui equivalent (Vega-Lite calls it `facet`, Observable Plot `fx`/`fy`).

## Elevation story

**What it is:** settled. A grid of plots on the ground, in one figure.
**Signal it carries:** "Amounts are never height", unchanged; adds "two measures are two charts": the panels share a y scale by default so lengths compare across them, and say so when they don't.
**Relatives it borrows from:** `ChartContainer`'s frame, drawn once; `ChartScope`'s crosshair; `Table`'s column headers for the panels' names.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| A panel's plot | ground | 0 | flat | its name as a caption above, `text-label` `ink` |
| The shared y axis (first column) and x axis (last row) | ground | 0 | as `ChartContainer`'s | one tick set, read once |
| The focused panel (keyboard) | ground | 0 | no change to the plot | the 2px `accent-ink` ring on the current mark, as today |
| A panel with its own scale (`scales="free"`) | ground | 0 | flat | "own scale" in its caption, and its own ticks, inline on a halo |
| The shared crosshair across panels | ground | 0 | 1px `line-control` | the readout in the panel under the pointer only |

## Motion

None new. Data changes glide per panel by the one engine; a rescale of the shared axis is staged once for all panels (Motion, Charts 2). Adding or removing a panel cross-fades, as a series entering does (Charts 6). Under reduced motion, in place.

## Accessibility

**WAI-ARIA pattern:** plain HTML: one `figure`, named by its title, holding a `group` per panel named by its panel name.
**Keyboard:** one Tab stop. The panel level sits between the summary and the series: ←/→ move between panels, Enter enters a panel's series and points, Escape returns to the panels.
**Screen reader:** the generated summary names the grid's kind, the panel count and which panel is highest and lowest at the end; each panel's node says its name, its range and its trend as a series node does today.
**Forced colours:** as the charts'. Panel names are `CanvasText`.
**`contrast="more"`:** as the charts'.

## API sketch

```tsx
<ChartGrid config={config} data={errors} x="t" by="service"
  columns={4} scales="shared"          // 'shared' (default) | 'free' | 'free-y'
  title="Error rate by service" takeaway="Checkout is the only service over its SLO"
  sort="desc" focus={['checkout']}>
  <LineChart />
</ChartGrid>
```

- `by` names the key whose values become panels, in `sort` order (by last value, or the data's order). One `ChartContainer` frame; the child chart type is rendered once per panel with that panel's rows.
- `scales="shared"` draws one y axis in the first column and one x axis in the last row. `free-y` gives each panel its own y, said in words. `aspect="banked"` on a shared grid banks the shared ratio from all panels.
- `focus` keeps the named panels' series in colour and sets the rest in `data-context`, as on one chart; `relevance` and a `ChartScope` selection recede panels as they recede marks.
- `columns` is a maximum; at 480px and below it's 1, at 640px 2.

## Rules it strains

None. The one-axis rule is what it exists to keep.

## Out of scope

Two-way facets (`by` × `by`). Mixed chart types across panels. A panel that drills into a full chart (that's a `Drilldown` the app composes).

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/ChartGrid/README.md` in the existing format
- [ ] A section in `build/previews.txt` (eight services' error rates shared; three regions' revenue with free y; the same data overlaid beside it for contrast) with an honest `@dsCard` group and subtitle
- [ ] Charts' form chooser gains the row; `Elevation.md` and `Research.md` updated
- [ ] `tsc` clean; `shoot.mjs` renders it in both schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`; at 360px
- [ ] Keyboard paths checked with `ACT`: panels → series → points and back
- [ ] `node build.mjs && node previews.mjs` run and committed

## Open questions

1. Is a shared y the right default when panels differ by an order of magnitude? Proposed: yes, with a generated note ("Checkout's scale is 40× Search's") when the ratio exceeds 10, so the author chooses `free-y` knowingly.
2. Should the grid take `compare` so each panel reads against its own period before?
