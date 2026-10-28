# Stat

The tile at the top of a dashboard: a label, a big number, how it changed and against what ("Active users · 12,480 · Up 8% vs last month: 11,556"). It's often the most-read thing on the page, and sometimes the right answer isn't a chart at all.

**Why it's flush.** A number is the record. A stat has no level of its own: inside a `Card` it lies on the card, on its own it lies on the page. The label is `text-label` in `ink-muted`; the value is `text-title` in `ink`, weight 600, with tabular figures. `size="hero"` sets it in `text-display`, for the one number a view leads with (once per view, as the type scale says). A `trend` sits beside the value, usually a decorative [`Sparkline`](../Sparkline/README.md).

**Up isn't always good.** Without `good`, the change is neutral: `ink-muted` text with an arrow ("↘ Down 12 ms"). Say which direction is good (`good="up"` for users, `good="down"` for an error rate) and the change becomes a `Badge` plate whose lamp is `positive` or `critical`. The word says the direction, the arrow shows it, and the colour says whether it's good, so no cue stands alone. No change reads "No change" and stays neutral.

**Motion.** A changed value cross-fades (`dur-travel-2`) and the stat takes the afterglow (`settle`), within the attention budget. It never counts up: that delays the number for decoration. While the value loads (`undefined`, or a promise) it's an imprint of a number's width under a label already in place, and it lands like any `Await` content. In a `StatGroup` the values land together.

**Accessibility.** Plain HTML: a `section` named by its label, so it reads "Active users, 12,480, Up 8%, vs last month: 11,556". Direction is always a word; the arrow is decorative. With `live`, a changed value is announced politely: "Active users, 12,792, up 10.7% vs last month." Under forced colours the change plate gets a 1px border and the arrow carries direction; under `contrast="more"` it's drawn as `Badge` is.

**Props:** `label`; `value` (a number, a string, `null` for an em dash, `undefined` or a promise while it loads); `format`; `change` (`{ value, vs, previous, format }`: `value` is a fraction by default, so `0.08` reads "Up 8%"; with `format` it's in your units); `good` (`'up'` or `'down'`); `trend`; `help` (a caption of context); `size` (`'default'` or `'hero'`); `live`; `locale`. `StatGroup` lays a row of stats out to wrap (each at least 180px) and lands them together.

**You provide:** the value and, if it changed, by how much and against what, in words. Put each stat in a `Card` on a dashboard; make the card `interactive` if the whole stat opens a report.

```tsx
<StatGroup aria-label="Last 30 days">
  <Card><CardContent>
    <Stat label="Active users" value={metrics?.active} good="up"
      change={{ value: 0.08, vs: 'last month', previous: 11556 }}
      trend={<Sparkline data={metrics?.daily} y="active" decorative />} />
  </CardContent></Card>
</StatGroup>
```

- Do say what the change is against ("vs last month"); a percentage alone has no anchor.
- Do set `good` only when a direction really is good or bad; otherwise leave the change neutral.
- Do lead a dashboard with stats, then the charts that explain them, then the table that is the record.
- Don't use `size="hero"` more than once in a view.
- Don't animate the number counting up, or colour the value itself: colour belongs to the change, and only with `good`.
