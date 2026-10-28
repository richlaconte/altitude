# LineChart

Change over time: latency over a day, revenue over a year, one series or a few compared. It renders inside a [`ChartContainer`](../ChartContainer/README.md), which places x by time (ISO dates, timestamps) or by number.

**Why it's flat.** Lines are the record, so they lie on the plot: 2px strokes in their series' colours, round joins and caps, no fill, no glow, no shadow. A missing value (`null`) is a gap in the line, never bridged: nothing was recorded there, as `Await` tells `null` from not-yet. `curve="monotone"` curves through the points without overshooting them (Fritsch–Carlson), so a curve never invents a peak or a dip the data doesn't have. The last point wears an 8px marker, and each line is named at its end in `ink` (up to four series), so the lines are their own legend; end labels are nudged at least 16px apart where lines converge.

**The axis.** Unlike bars, a line's y axis doesn't have to include zero, but its range is always labelled. When zero isn't on it, the plot's foot is drawn as an ordinary gridline, not the ground line, so nothing reads as a baseline that isn't one.

**Without colour.** Under forced colours and in print, and with `patterns` on the container, each line takes its slot's dash and every point its slot's marker (circle, square, triangle, diamond, ring, cross), in `CanvasText` when forced. With `contrast="more"` lines are 3px.

**Motion.** When the data changes and the x values are the same, the line morphs on `ease-glide`; when they differ (a new range), the old chart and the new one cross-fade. A rescale comes first. There's no draw-on animation on first render ([Motion](../../Motion.md), "Charts").

**Accessibility.** Without a written `summary`, the generated one says which way each series went between its first and last values ("p95 rises from 168 ms at 14 Mar, 12:00 AM to 207 ms…"), and its lowest and highest points. The keyboard path along x and between series is #63, the readout #52, and the table view #64.

**Props:** `data` and `x`; `curve` (`'linear'` or `'monotone'`); `y={{ format }}` to format the axis; `endLabels` to turn end labels on or off (default on for up to four series, and always under forced colours and in print). `status` and `boundary` (below); `band={{ low, high, series?, label? }}` for an uncertainty band. `linePath(points, curve)` is exported for your own marks: it draws the same path, gaps and all.

**Not yet the record.** `status={(d) => d.day > today ? 'projected' : undefined}` dashes the line (5 4) from the last settled point on, and draws those points hollow: ringed in the series colour on the plot's own. It's one path clipped two ways, so a curve doesn't kink where the record ends. A 1px `line-control` rule named "Today" marks the boundary. Point names, the readout's heading and the table say "Projected" or "So far", and the generated summary reads its trend from the settled points only, then says what's projected. While patterns are on, a line that has its own dash keeps it, and the hollow points carry the difference.

**Uncertainty is a band.** `band={{ low: 'p10', high: 'p90', label: 'Range 10th–90th percentile' }}` draws a flat fill of the series colour at 16% between the two keys, under the lines. It's never error bars, which readers misjudge (Correll & Gleicher 2014), and never a gradient. Its edges count toward the y axis. The readout adds a row for it ("499–787 Range 10th–90th percentile"), and so do point names and the table.

**You provide:** a `ChartContainer` with a `config` naming each series, the `data` in x order, and usually a `summary`.

```tsx
<ChartContainer config={{ p50: { label: 'p50' }, p95: { label: 'p95' } }} aspect={2.5}>
  <LineChart data={latency} x="minute" curve="monotone" y={{ format: (ms) => `${ms} ms` }} />
</ChartContainer>
```

- Do keep it to four series or fewer; past that, use small multiples, or a legend and the readout.
- Do leave missing values as `null`; don't fill them with zero or the last value.
- Do use `monotone` for smooth measures, and `linear` when each point is a discrete count.
- Don't fill the area under a line to make it look richer; that's `AreaChart`, for a total and its parts.
- Don't put two measures of different scale on one plot; that's two charts.
