# BarList

Top pages, top referrers, top customers by spend: a ranked list where each row is its own bar, the label is readable at any length, and the exact value sits at the end. It sits between a `Table` (exact, no shape) and a horizontal `BarChart` (shape, but long labels squeeze the plot).

**Why it's flat.** Rows are the record, so they lie flush on the ground with `line` dividers, like a table's rows. Each row's bar is a flat tint of `data-1` behind its label, as long as the row's value against the largest (the top row's bar fills its row), and faint enough that `ink` holds 4.5:1 over it in every scheme. It has a `radius-xs` corner and no shadow, wall or gradient. A long label wraps; it's never cut. The value sits at the row's end in tabular figures, and with `share` its percentage of the total sits beyond the bar in `ink-muted`.

**Hover is a promise.** A row that does something (`href` makes it a link, `onSelect` a button) lifts one level when pointed at, exactly as `Table`'s interactive rows do, and drops back when pressed; its bar stays flat on it. A row that does nothing never moves.

**Other and Show all.** With `limit`, the rows past it fold into one "Other (14 pages)" row in `data-other`, and a ghost "Show all 21 pages" button lists them all (and "Show fewer" folds them back). `noun` names what the rows are.

**Filter in place.** `relevance` raises matches one level and sinks misses into a well, as `TableRow relevance` does; nothing is removed, and misses say "not matching" to screen readers.

**Motion.** When values change, rows are carried to their new ranks (FLIP, `dur-travel-3`, `ease-glide`), all at once, because a re-rank is one change; bars glide to their new lengths. Under reduced motion both change in place. While `data` is undefined the list is imprinted rows, which land like `Await` content.

**Accessibility.** Plain HTML: an `ol` (rank is meaningful) of links, buttons or plain items, each reading "1. /pricing, 4,210, 23%". The bar is hidden from assistive technology; the value is text. Under forced colours bars are a light `Highlight` tint with a 1px `Highlight` border, matches are outlined and misses dashed. Under `contrast="more"` bars get a 1px `ink` edge.

**Props:** `data` (`{ name, value, key?, href? }[]`); `format`; `limit`; `share`; `sort` (`'desc'`, the default, or `false` to keep your order); `noun`; `onSelect`; `relevance`; `locale`; and any `ol` attribute (name it with `aria-labelledby` or `aria-label`).

**You provide:** the rows, a name for the list, and a `format` with the unit when it isn't a plain count.

```tsx
<BarList aria-labelledby="pages-title" data={pages} format={(n) => n.toLocaleString()} limit={8} share noun="pages" />
```

- Do use it for a ranked top-N with long labels; use a `BarChart` to compare a few categories across series.
- Do give rows an `href` when they open a report, so they're real links.
- Do fold a long tail into "Other" with `limit` rather than scrolling a hundred rows.
- Don't colour bars by status or give each row its own colour: colour is identity, and these rows are one series.
- Don't set the bars' lengths to share of total yourself; `share` says it in words, and the bars compare rows with each other.
