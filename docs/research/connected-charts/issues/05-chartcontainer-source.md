<!--
title: ChartContainer, Stat: say where the data came from and when it was read
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`ChartContainer` and `Stat` (and `StatGroup`, which can carry one line for all its stats). They change together because a dashboard's charts and headline numbers come from the same read and should say so the same way.

## What you're trying to do

Tell the reader where a chart's data came from, when it was read, how many records are behind it, and whether it's stale. Today only a `live` chart says "Updated 12:04"; a settled chart, the common case, says nothing, and the content rules' "show real data or say there's none" has no build for "say what this is". Interviews with producers and consumers of charts and dashboards found a recurring, unmet need for validation and verification, strongest among consumers (Sultanum, Bromley & Correll, *Data Guards*, VIS 2024). The source line is journalism's settled convention (FT, Economist, Datawrapper). In agent-built apps the chart is often drawn from a query the reader never saw, which makes the line the only account of it.

## Today

`ChartContainer` has `title`, `description`, `takeaway`, `summary` and the `live` caption (`chart.tsx`, the "Updated" caption near line 2238). `Stat` has `help` ("Paid plans only, before refunds."). Nothing names a source, a time or a count.

## Proposal

```tsx
<ChartContainer config={config} data={rows} x="day"
  source={{ name: 'Billing database', href: '/sources/billing', asOf: readAt, count: rows?.length, staleAfter: 15 * 60_000 }}>
  <BarChart data={rows} x="day" />
</ChartContainer>

<StatGroup source={{ name: 'Billing database', asOf: readAt }}>…</StatGroup>
```

- **One line under the plot**, after the summary, at caption weight in `ink-muted`: "Source: Billing database · 1,954 records · as of 12:04". `name` may be a `Link` (where the data lives, or the query that made it). `asOf` renders through `RelativeTime` ("2 minutes ago", exact time on hand), so it stays true as time passes without the chart re-rendering.
- **Stale is said.** Past `staleAfter`, the line leads with the status icon and the word: "Stale · as of 11:20". The marks don't change: the record is still the record; it's old. A `live` chart's "Updated" caption becomes this line's `asOf`, so there's one line, not two.
- **In the summary and the table.** The generated summary ends with the source sentence; the table view's caption carries it. Printing keeps it.
- **A `ChartScope`** can set one `source` for everything in it, so a dashboard says it once.

**Additive?** yes. Without `source`, nothing is shown.

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| The source line | ground | 0 | flush, `text-caption` `ink-muted` | words |
| Its link | ground | 0 | `Link` (`accent-ink`, underline) | the link's name |
| Stale | ground | 0 | flush; the status icon in `caution` with its word | "Stale" |

## Motion and accessibility

None new; a `RelativeTime` tick is not a change (Motion). Crossing `staleAfter` takes the ground-level tint once over `dur-settle`, as `FormattedNumber` does, and the word changes. The line is part of the figure's description; "Stale" is announced politely once when it becomes true. Forced colours and `contrast="more"` unchanged.

## Out of scope

Definitions of each measure (its own issue). Refreshing the data (the app's; a "Refresh" button beside the line is the app's `Button`). Signed or verified provenance.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the `ChartContainer`, `Stat` and `StatGroup` READMEs and `build/previews.txt` updated (a fresh chart, a stale one, a stat group with one line)
- [ ] `Charts.md` ("Every part, by its build") gains the source line; `Elevation.md` and `Research.md` updated
- [ ] `tsc` clean; `shoot.mjs` clean in both schemes; the stale transition checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered

A `HoverCard` on the title holding the source. Hidden until asked, so a reader who doesn't ask takes the chart for current; the line is visible by default and the detail (the query) is what the link holds.
