# ChartTooltip

Reading exact values off a chart. Point at a date on a line chart, or at a bar, and a hairline marks that x while a readout lists every series' value there, so you never have to land on a 2px line to get a number. It's on for every chart; `ChartTooltip` only changes what it shows.

**Why it floats.** The readout is live: it exists while you're reading, so it's a level-3 floating surface like `Tooltip` (`surface-floating`, `elev-3`, `radius-lg`). The crosshair and the ringed points are marks on the plot, on the ground: a 1px `line-control` rule snapped to the nearest x, and each line's point there ringed in the plot's own surface colour (an outline, not height). Bars don't change at all, because hovering a static bar does nothing.

**How it moves.** It rises 4px the first time, as its shadow grows from `elev-1` to `elev-3` over `dur-travel-3`, then doesn't rise again while you move. It steps from one x to the next with no easing: it follows the data, not each pixel of the pointer, so it never reads as a control drifting (E10). It opens on whichever side of the point has room, so it never covers it, and leaves in 70% of its entry time. Coming back within 400ms shows it at once, warm, shared with `Tooltip`. On touch, press and hold shows it, dragging scrubs along x, and lifting your finger leaves it until you tap elsewhere. Under reduced motion it fades with no travel.

**Without height.** Under forced colours it has a 2px `CanvasText` border and its keys take each series' dash. With `contrast="more"` it stands on the hard ink slab every level-3 surface gets.

**Accessibility.** The readout is `aria-hidden` decoration over data that's reachable elsewhere: the chart's summary, the keyboard path through the data, which opens the same readout on the focused record (#63), and the table view (#64). Its labels come from your data, so they're inserted as text, never as HTML.

**Rows.** The heading is the x value (formatted by the container, or by `labelFormat`). Each row puts the value first (`ink`, weight 500, tabular figures) and the series name second (`ink-muted`), keyed by a short stroke of the series colour. Only series that are shown and have a value there are listed.

**Props.** `ChartTooltip` takes `content`: a `ChartTooltipContent` with your options. `ChartTooltipContent` takes:

- `indicator`: `'line'` (default), `'dot'` or `'dashed'`;
- `labelFormat`, for the heading;
- `hideLabel` and `hideIndicator`.

Turn the readout off with `tooltip={false}` on the chart type or the container. From your own marks or keyboard code, `useChart().active` is the record being read and `setActive(index)` opens the readout on one.

**Pinning a reading.** `pinnable` on a `LineChart`, `BarChart` or `AreaChart` lets people keep a number: with the readout open, a click on the plot (or P on the keyboard path, or a quick tap while the touch readout is open) sets the reading down. The live readout lands on the record as a `Badge` plate at the top of the plot, from level 3 to the ground over `dur-travel-3` on `ease-settle`, then takes the afterglow once. It has a pin icon, so it isn't read as a `ChartAnnotation`, a 1px `line-control` leader to its x, and a ghost remove button named "Remove pin, Mar 9, 2026". With two pins, a strip under the x axis says the difference ("+24% over 28 days", or per series), and pinning the second says it aloud ("Apr 6, 2026 is 52% higher than Mar 2, 2026."). `pinnable` allows two; a number allows that many, and a new pin replaces the oldest. Escape on the chart removes the last pin before it clears a selection. Where a click selects or drills, it keeps doing that and only P pins. `pins` and `onPinsChange` control them, to keep them in the URL. The readout's action line says how to pin ("Click to pin", "P to pin", "Tap to pin").

**You provide:** nothing, for the default. To change it, a `ChartTooltip` inside the chart type or the container.

```tsx
<ChartContainer config={config}>
  <LineChart data={months} x="month">
    <ChartTooltip content={<ChartTooltipContent indicator="dot" labelFormat={(m) => monthLong(m)} />} />
  </LineChart>
</ChartContainer>
```

- Do keep it on: it's how people get exact numbers without hunting for a line.
- Do format the heading the way people say the x ("Week of Mon, April 6"), not as stored.
- Don't put anything in it that can't be reached another way: it's a convenience over the summary, the keyboard path and the table.
- Don't add buttons or links to it; it doesn't take the pointer, and it moves away as soon as the pointer does.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`ChartTooltip` as first used in its preview:

```tsx
import { ChartTooltip, ChartTooltipContent } from 'altitude-design';

<ChartTooltip content={<ChartTooltipContent indicator="dot" labelFormat={(w) => 'Week of ' + long.format(new Date(w + 'T00:00:00Z'))} />} />
```

The full preview, as rendered in Storybook and checked in CI (`ct` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { BarChart, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer, ChartTooltip, ChartTooltipContent, LineChart, useChart } from 'altitude-design';

// The readout is on for every chart; point at one (or press and hold on touch). Here it's opened with setActive,
// the same call the keyboard path uses, so the preview shows it without a pointer.
const weeks = ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30', '2026-04-06', '2026-04-13'].map((week, i) => ({ week, opened: [31, 38, 35, 44, 41, 47, 52][i], closed: [28, 30, 36, 39, 43, 45, 49][i] }));
const long = new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });
function Open({ at }) {
  const { setActive } = useChart();
  React.useEffect(() => { setActive(at); }, []);
  return null;
}
export default function App() {
  const [pins, setPins] = React.useState(['2026-03-09', '2026-04-06']);
  return (
    <div className="ct" data-tells-ignore="LA4 a gallery of the readout in each chart, to compare">
      <Card>
        <CardHeader><CardTitle id="t1">Issues opened and closed</CardTitle><CardDescription>The default readout, open on 23 Mar</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer aria-labelledby="t1" aspect={1.8} config={{ opened: { label: 'Opened' }, closed: { label: 'Closed' } }}>
            <LineChart data={weeks} x="week" /><Open at={3} />
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle id="t2">Same data, your own content</CardTitle><CardDescription>indicator="dot" and a long date</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer aria-labelledby="t2" aspect={1.8} config={{ opened: { label: 'Opened' }, closed: { label: 'Closed' } }}>
            <BarChart data={weeks} x="week">
              <ChartTooltip content={<ChartTooltipContent indicator="dot" labelFormat={(w) => 'Week of ' + long.format(new Date(w + 'T00:00:00Z'))} />} />
            </BarChart>
            <Open at={5} />
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle id="t3">Pinned readings</CardTitle><CardDescription>pinnable: click (or P) sets a reading down; two compare</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer aria-labelledby="t3" aspect={1.8} config={{ opened: { label: 'Opened' } }}>
            <LineChart data={weeks} x="week" pinnable pins={pins} onPinsChange={setPins} />
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```
<!-- /example -->
