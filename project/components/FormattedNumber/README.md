# FormattedNumber

A number in a sentence or a table cell, formatted once: invoices, usage ("4.5 GB of 10 GB"), latency ("128 ms"), seats, error rates. `formatNumber()` gives the same text as a string, for `DataTable` columns and chart formatters.

**Elevation.** A number is the record, so it lies flush in its line, in tabular figures, at no level. When the value changes, the old figure fades out over the new one (`dur-travel-2`) and the number takes a ground-level tint that decays over `dur-settle`. That's the afterglow without the lift, because a word in a line can't rise. It never counts up, as with `Stat`: counting delays the number for decoration.

**Presets** (`format`):

| `format` | value | shows |
|---|---|---|
| `number` (default) | any | `1,250` |
| `currency` | minor units (cents) by default, as payment APIs send them | `€49.00` for `4900`. `minorUnits={false}` takes whole units. A currency with no minor unit (JPY) isn't divided. |
| `bytes` | bytes | `4.5 GB`, in the largest unit that keeps it at 1 or more; `base={1024}` gives `4.2 GiB` |
| `duration` | `unit` (default milliseconds) | `128 ms`, `1.6 min`: the largest unit that keeps it at 1 or more |
| `percent` | a fraction | `1.2%` for `0.0123` with `maximumFractionDigits={1}` |
| `compact` | any | `4.2K` |

Every other `Intl.NumberFormat` option (`maximumFractionDigits`, `signDisplay`, `currencyDisplay`, …) passes through.

**Accessibility.** It's a `<data value>` element carrying the raw value. When the text rounds or abbreviates the value (`4.2K`, `4.5 GB`), the exact value ("4,213", "4,512,000,000 bytes") is its `title`. Units whose symbols are ambiguous read aloud are spoken in words ("4.5 gigabytes", "128 milliseconds"). Changes aren't announced: put the number in a live region yourself if a change is something to hear. Under reduced motion there's no cross-fade, but the tint remains (it's colour, not travel). Under forced colours the tint is a `Highlight` outline.

**Props:** `value`; `format`; `locale`; `currency`; `minorUnits`; `unit`; `base`; any `Intl.NumberFormat` option; `title`.

**You provide:** the raw number and what it is. Format in one place, not with `toFixed` and string concatenation.

```tsx
<FormattedNumber value={4900} format="currency" currency="EUR" />      // €49.00
<FormattedNumber value={4_512_000_000} format="bytes" />               // 4.5 GB
<FormattedNumber value={128} format="duration" />                      // 128 ms
<FormattedNumber value={0.123} format="percent" maximumFractionDigits={1} /> // 12.3%
formatNumber(4213, { format: 'compact' })                              // "4.2K"
```

- Do pass amounts of money in minor units, as your payment provider sends them, or set `minorUnits={false}`.
- Do use `formatNumber` for table columns and chart formatters, so a number reads the same everywhere.
- Don't animate digits or count up to a new value.
- Don't use it for a headline figure; that's a `Stat`.
