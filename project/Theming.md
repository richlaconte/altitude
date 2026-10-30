# Theming

## Schemes

Altitude ships four schemes. Each is a complete set of the same tokens, so every component works in all of them unchanged.

| Scheme | Ground | Accent | Character |
|---|---|---|---|
| `daylight` | cool off-white | cobalt | The default. Neutral, crisp, shadow-led. |
| `nightfall` | blue-black | periwinkle | Dark, tonal elevation: higher is lighter. |
| `mesa` | warm sand | terracotta | Light and warm, for editorial and consumer products. |
| `alpine` | deep spruce | glacier mint | Dark and cool, for focused tools and dashboards. |

Set a scheme with `<AltitudeProvider scheme="mesa">`, or with `data-theme="mesa"` on any element. Schemes nest: a `nightfall` panel inside a `daylight` page is just a provider (or a `data-theme`) around that panel.

## Custom accent

`<AltitudeProvider accent="#0f8a6b">` takes any hex color and derives the four accent tokens against the active scheme:

- `accent` is your color as given, for fills.
- `on-accent` is white if white reads at 5:1 on it (leaving room for the sheen's lighter top), otherwise a near-black of the same hue.
- `accent-ink` is your color nudged toward ink until it reads at 4.5:1 on every surface from trench to modal, for text, links and the focus ring.
- `accent-soft` is a 13% (light) or 20% (dark) tint of the ground.

The derivation reruns when the scheme changes, so one brand color works in light and dark.

The accent leads the chart palette too (see **The data palette** below). The scheme's slot nearest your colour makes way for one in your colour's hue, at the lightness nearest yours that clears every gate (3:1 marks, the lightness band, and the distance from status and presence hues). If no colour within 30° of your hue clears them, that nearest slot leads unchanged: a green brand in daylight leads with daylight's own green, because `positive` blocks the rest. The other five slots re-order behind `data-1`. Every order is tried, and the one that keeps neighbours furthest apart for colour-blind readers wins. The magnitude ramp `data-seq-*` follows `data-1`'s hue. Nothing is generated beyond the scheme's own slots, the result is the same every time for the same accent and scheme, and a slot is dropped (the palette then ends in `data-other`) only if no order keeps every neighbour 8 apart, which the provider says in a console warning. Another slot can still sit close to your accent; `checkScheme(el, { include: ['data'] })` reports it. Very pale accents (yellows, pastels) still need checking: a checked checkbox's fill should hold 3:1 against the ground.

## Your own scheme

When a brand needs more than an accent (its own grounds, ink and status colours), pass a custom scheme to the provider:

```tsx
<AltitudeProvider scheme={{
  name: 'paper',
  base: 'mesa',            // light or dark handling, and every token you leave out
  tokens: {
    'surface-trench': '#e5e1d2', 'surface-well': '#edeadf', 'surface-ground': '#f5f3ea', 'surface-raised': '#fffdf7',
    'surface-lifted': '#fffdf8', 'surface-floating': '#fffefa', 'surface-overlay': '#fffefb', 'surface-modal': '#fffefc',
    ink: '#1f3329', 'ink-muted': '#4b5d53', line: '#e2ded0', 'line-control': '#76806f',
    accent: '#284d39', 'on-accent': '#ffffff', 'accent-ink': '#284d39', 'accent-soft': '#e1e9dc',
  },
}}>
```

Token names are the ones in `tokens.json`, without `--`; any colour or shadow token can be set. `base` must be `nightfall` or `alpine` for a dark scheme, since casts, rims and the inside walls of openings are drawn differently on dark grounds. The provider scopes the tokens to its own root, so a custom scheme nests like a built-in one; `accent` still works on top of it (derived against your surfaces); and shadows and `line` give way to high contrast as the built-in ones do. Forced colours replaces every colour with the system's, as it does for any scheme.

A custom scheme has to keep the invariants below, or the elevation language and its contrast quietly break. The provider checks them when the scheme is applied and warns in the console with one line per problem. Check them in your own tests too: `checkScheme` takes the colour tokens by name (merge your tokens over the base's from `altitude-design/tokens.json`) or an element to read them from, and returns the problems, `[]` if there are none.

```ts
import { checkScheme } from 'altitude-design';
import tokens from 'altitude-design/tokens.json';

const base = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, typeof t.value === 'string' ? t.value : t.value.mesa]));
expect(checkScheme({ ...base, ...paper.tokens })).toEqual([]);
```

Only hex colours can be measured; `checkScheme` reports any other value it was asked to check. Its data-palette gates are opt-in, so existing tests keep passing: `checkScheme(tokens, { include: ['core', 'data'] })` runs both, and `include: ['data']` only the palette's. The provider runs both on a custom scheme, so a scheme that changes its grounds or status hues and leaves the `data-*` tokens to its base says which slots it broke. To ship a scheme as CSS instead, write a `[data-theme="paper"]` block that sets the tokens and pass `scheme="paper"`. Anything the block leaves out falls back to daylight, and nothing checks it for you, so run `checkScheme(element)` on it in a test.

## Making a new scheme

To add a scheme to Altitude itself, add a theme to `tokens.json` and give it a value for every color and shadow token. Keep these invariants:

- The surfaces form a ladder: trench < well < ground < raised ≤ lifted ≤ floating ≤ overlay ≤ modal in lightness (dark schemes step up about 3% per level; light schemes go to white at raised).
- `ink`, `ink-muted`, `accent-ink` and the three status colors each clear 4.5:1 on all eight surfaces. `line-control` and `accent` clear 3:1 on ground, well, trench and raised.
- `presence-1`–`presence-3` clear 3:1 on every surface, and `on-presence` clears 4.5:1 on each.
- Button and key walls are derived (the face colour mixed 34% toward black; `surface-trench` under neutral faces), so a new scheme or a custom accent gets correct walls without new tokens.
- Every `data-*` token keeps the gates in **The data palette** below; `node build/palette.mjs` chooses them and checks them.
- Shadows keep the four-layer structure (rim, ring, key, ambient) at every level, including `elev-0`, `well` and `trench`, so transitions interpolate.

## The data palette

Charts get their own colours, so a series never borrows a meaning (see [Charts](Charts.md), rule 5). Each scheme has:

| Tokens | Job | How it's built |
|---|---|---|
| `data-1` … `data-6` | identity: which series | six hues in a fixed order. `data-1` is in the accent's hue where a slot can be, at a different lightness from the accent; in mesa, where terracotta sits between `critical` and `caution`, it's the nearest hue that clears them |
| `data-other` | the seventh and later series, folded | a neutral in the ground's hue |
| `data-seq-1` … `data-seq-7` | magnitude: how much | `data-1`'s hue, lightness in even steps; light schemes darken from near-white, dark schemes climb from near their ground |
| `data-div-neg-3` … `data-div-mid` … `data-div-pos-3` | polarity: which side of a midpoint | orange below, blue above, around a neutral; the blue–yellow axis is the one colour-blind readers keep |

Six is a measured limit, not a choice: past it, series fold into `data-other` or become small multiples, and no colour is ever generated. The values are chosen by `build/palette.mjs`, which enumerates OKLCH candidates and orders and keeps the order with the best colour-blind separation that passes every gate, and CI fails if `tokens.json` drifts from it. The gates, measured in OKLab ΔE×100 with colour-blind vision simulated after Machado, Oliveira & Fernandes (2009):

- Each scheme chooses its own values. Dark schemes are stepped for their own ground, not inverted.
- Categorical slots sit at least 12 from `accent`, `positive`, `caution`, `critical` and `presence-*`, so a series never impersonates a control, a status or a person (Research, E23, says why 12 and not 15).
- Any two slots: normal-vision ΔE ≥ 15, hues at least 25° apart, colour-blind ΔE ≥ 6. Adjacent slots: colour-blind ΔE ≥ 8 under both protanopia and deuteranopia.
- OKLCH lightness within 0.43–0.77 in light schemes and 0.48–0.67 in dark ones; chroma ≥ 0.10.
- Marks hold 3:1 against both `surface-ground` and `surface-raised`, because charts sit on the page and in `Card`s. `data-other` too.
- The ramps are monotone in lightness, with steps of at least 0.06.
- The diverging poles are never `positive` or `critical` (ΔE ≥ 15 from both): red–green is the worst pair for colour-blind readers, and both hues mean status.
- When a series *means* good or bad (error rate, uptime), it wears the status tokens with an icon and a word, not a `data-*` slot, and never both in one chart.

A custom scheme that sets its own surfaces or status colours should set the `data-*` tokens too, and check them with `checkScheme(tokens, { include: ['data'] })`. A custom accent re-leads the palette (see **Custom accent**).

## Density and target size

Controls take their heights from the `size-*` tokens, so one setting can make them fit a finger without making a desktop sparse:

| Token | With a mouse | Under a coarse pointer | Used by |
|---|---|---|---|
| `size-target-min` | 24px | 44px | the hit area every control reaches (WCAG 2.5.8, and 2.5.5 on touch) |
| `size-control-sm` | 30px | 40px | small buttons, tab triggers, breadcrumb steps |
| `size-control-md` | 36px | 44px | buttons, menu items (−2px), sidebar items (−2px), folder tabs (+2px) |
| `size-field-sm` | 34px | 44px | small inputs |
| `size-field-md` | 40px | 48px | inputs, select triggers, command palette rows |
| `size-row-md` | 32px | 44px | tree, list and filter rows |

Under `(pointer: coarse)` the faces step up on their own. `<AltitudeProvider density>` overrides that: `'comfortable'` uses the larger sizes everywhere (a kiosk, an accessibility setting), `'compact'` keeps the mouse sizes even on touch. The hit-area minimum follows the pointer alone, so a compact face on a phone is still 44px to hit. Walls and sheens scale with the face, as they do between `sm` and `lg`; no tier or level changes.

Two breakpoints are the only widths a layout switches at: `breakpoint-narrow` (480px), for a component's own narrow layout, and `breakpoint-compact` (640px), for page chrome (the sidebar becomes a drawer, a panel becomes a sheet). CSS can't read a token in a media query, so they're written as numbers, and `checks/density.mjs` fails on any other.

## Your own fonts

`altitude.css` loads Instrument Sans and JetBrains Mono from Google Fonts. To make no third-party request, import `altitude-design/altitude.no-fonts.css` instead (the same tokens and styles without the `@import`) and either self-host those two families or point the type at your own:

```css
:root {
  --font-sans: "Avenir Next", ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
}
```

Both tokens already fall back to system fonts, so without either the components still render, in the system face. `altitude-design/fonts.css` is the font import on its own, if you pair `tokens.css` with your own styles but want the fonts. Typography carries no elevation signal, so nothing about height changes with the face.

## With shadcn/ui

The props mirror shadcn/ui, and the tokens can drive shadcn's own components. Both systems define a variable called `--accent` (in shadcn it means a hover tint), so don't redefine shadcn's `:root` variables on top of Altitude's. Point Tailwind's theme straight at Altitude's tokens instead (Tailwind v4, shadcn's current setup), and delete shadcn's generated color variables:

```css
@theme inline {
  --color-background: var(--surface-ground);
  --color-foreground: var(--ink);
  --color-card: var(--surface-raised);
  --color-card-foreground: var(--ink);
  --color-popover: var(--surface-floating);
  --color-popover-foreground: var(--ink);
  --color-primary: var(--accent);
  --color-primary-foreground: var(--on-accent);
  --color-secondary: var(--surface-raised);
  --color-secondary-foreground: var(--ink);
  --color-muted: var(--surface-well);
  --color-muted-foreground: var(--ink-muted);
  --color-accent: var(--accent-soft);
  --color-accent-foreground: var(--ink);
  --color-destructive: var(--critical);
  --color-border: var(--line);
  --color-input: var(--line-control);
  --color-ring: var(--accent-ink);

  /* shadcn's shadow utilities, re-pointed at the ladder */
  --shadow-xs: var(--elev-1);
  --shadow-sm: var(--elev-1);
  --shadow-md: var(--elev-2);
  --shadow-lg: var(--elev-3);
  --shadow-xl: var(--elev-4);
  --shadow-2xl: var(--elev-5);
}
```

That gets shadcn's components onto Altitude's colors and shadows. The elevation behavior (hover lift, press to ground, wells for inputs, the receding page) lives in Altitude's component styles, so shadcn components adopted this way still need those states added to their class lists.

### Charts

shadcn/ui's `Chart` is Recharts underneath (Tremor wraps Recharts too), so charts already built with it can take Altitude's colours and most of its chart rules without being rewritten. What they can't take is listed at the end. [`examples/shadcn-chart`](../examples/shadcn-chart) is this setup, checked in all four schemes by `build/checks/shadcn-chart.mjs`.

**Map the palette.** Add the chart lines to the `@theme inline` block above, so Tailwind's `fill-chart-1` and the like are Altitude's slots:

```css
@theme inline {
  --color-chart-1: var(--data-1);
  --color-chart-2: var(--data-2);
  --color-chart-3: var(--data-3);
  --color-chart-4: var(--data-4);
  --color-chart-5: var(--data-5);
}
```

shadcn's chart configs name the variables directly (`color: "var(--chart-1)"`), so point those at the palette too, on every element a scheme can be set on:

```css
:root, [data-theme] {
  --chart-1: var(--data-1);
  --chart-2: var(--data-2);
  --chart-3: var(--data-3);
  --chart-4: var(--data-4);
  --chart-5: var(--data-5);
}
```

On `:root` alone, a `nightfall` panel inside a `daylight` page would draw daylight's colours: a variable that refers to another is resolved where it's declared, and children inherit the result. `AltitudeProvider` always sets `data-theme` on its root, custom accent and custom scheme included, so `[data-theme]` covers them.

Delete shadcn's own `--chart-*` values, in `:root` and `.dark` alike. They aren't checked against Altitude's grounds, its status hues or its reserved hues (`accent`, `presence-*`), and the five Altitude slots are (see **The data palette**). A sixth series is `data-6`; past that, fold into `data-other`.

**Recharts props that keep Altitude's rules.** The rules are in [Charts](Charts.md) ("The rules"). These are documentation, not code; set them on your own charts:

| Rule | Recharts |
|---|---|
| Recessive grid | `<CartesianGrid vertical={false} stroke="var(--line)" />` |
| Ground line | `<ReferenceLine y={0} stroke="var(--ink-muted)" />` |
| Flat marks, rounded only at the data end | `<Bar radius={[4, 4, 0, 0]} />`; no `<defs>` gradients on `<Area>`, a flat `fill` instead |
| Readout at level 3 | `<ChartTooltipContent indicator="line" className="bg-popover shadow-lg" />`: `surface-floating` and `elev-3` through the mapping above |
| Hover is a promise | `cursor={false}` on a bar chart's `<ChartTooltip>` (no band behind the category); on a line or area chart `cursor={{ style: { stroke: 'var(--line-control)' } }}`, the crosshair, and `activeDot={false}` on each `<Line>` and `<Area>` |
| Keyboard | keep `accessibilityLayer` (on by default in Recharts 3): the chart is one tab stop and the arrow keys move the readout |
| Reduced motion | `isAnimationActive={!prefersReducedMotion}` on every mark, from a `matchMedia('(prefers-reduced-motion: reduce)')` hook of your own |
| Text in ink | `tick={{ fill: 'var(--ink-muted)' }}` on each axis, never the series colour |

Three things the example found:

- **Pass `tick` yourself.** `ChartContainer` colours ticks with a selector for `.recharts-cartesian-axis-tick text`. Recharts 3.10 draws tick text in a separate group, so that selector no longer matches and ticks fall back to Recharts' grey.
- **Colour the crosshair with `style`.** `ChartContainer`'s stylesheet colours it `border`, and a stylesheet beats Recharts' `stroke` attribute; an inline style beats both.
- **Give an `<Area>` its series colour as `stroke`.** The legend's swatch and the readout's indicator are taken from the stroke, so a stroke in the plot's colour (to part stacked areas, as Altitude's `AreaChart` does) leaves them blank.

**What doesn't carry over.** These need Altitude's own chart components (`ChartContainer` and the charts inside it) or code of your own:

- **Marks that act.** A clickable mark's 2px `ink` outline and pointer cursor, its action in the readout, and selection that recedes the rest are your own code.
- **Legend keys as switches.** shadcn's legend only labels; toggling a series is your own state.
- **Waiting and absence.** No Suspense imprint at the chart's size and no `EmptyState` opening; Recharts draws empty axes.
- **A table view and a written summary** for every chart.
- **Afterglows and staged rescales.** Recharts animates every change the same way, and on first render grows marks from the baseline unless animation is off.
- **Patterns under forced colours, and direct labels** so no series is told apart by colour alone.

## Charts Altitude doesn't draw

Altitude's charts are SVG, and they stop where SVG does: tens of thousands of points, maps, sankeys, treemaps, candlesticks. For those, use a canvas library. `altitude-design/chart-themes` gives ECharts and Chart.js Altitude's palette, type, surfaces and motion, read from the tokens of the active scheme, so nobody copies hex values. It returns plain objects and imports neither library.

```ts
import * as echarts from 'echarts';
import { echartsTheme } from 'altitude-design/chart-themes';

echarts.registerTheme('altitude', echartsTheme(document.documentElement));  // reads the computed tokens of the active scheme
const chart = echarts.init(el, 'altitude');
```

Pass the chart's own element (or anything inside an `AltitudeProvider`) to read that scheme and accent, or pass the tokens by name (`{ 'data-1': '#…', ink: '#…', … }`, as `checkScheme` takes them) where there's no DOM.

| | `echartsTheme(source, options?)` | `chartjsDefaults(source, options?)` |
|---|---|---|
| Use | `echarts.init(el, theme)` or `registerTheme` | `Chart.defaults.set(defaults)` |
| Series | `color`: `data-1` … `data-6`, then `data-other` | none: Chart.js has no palette default, so give each dataset a colour from `dataColors(source)` |
| Magnitude | `visualMap.inRange.color`: `data-seq-1` … `data-seq-7` (swap in `data-div-*` for polarity) | |
| Text | `--font-sans`; `ink`, axis labels `ink-muted` | `--font-sans`; `ink-muted`, legend `ink` |
| Axes and grid | axis lines `line-control`, split lines `line` | `scale.border` `line-control`, `scale.grid` `line` |
| Readout | `surface-floating` with `extraCssText: box-shadow: <elev-3>`; a `line-control` crosshair | `surface-floating`, in `ink` (a canvas readout can't cast a shadow) |
| Accessibility | `aria.enabled`; `aria.decal.show` under forced colours or with `{ patterns: true }` | |
| Motion | `dur-travel-3` on ease-glide's curve; 0 under reduced motion | the same; `animation: false` under reduced motion |

Reduced motion is the provider's `motion` if it sets one, else the system's; forced colours is the system's. Both can be passed in `options` instead.

**Re-theme on scheme change.** The objects are read once. `useChartTheme` re-reads them when an `AltitudeProvider`'s `scheme`, `accent` or `motion` changes, a `data-theme` changes on the page, or the reduced-motion or forced-colours setting does. It's `null` until mounted:

```tsx
import { echartsTheme, useChartTheme } from 'altitude-design/chart-themes';

function Flows({ option }: { option: echarts.EChartsOption }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const theme = useChartTheme(echartsTheme, ref);
  React.useEffect(() => {
    if (!theme) return;
    const chart = echarts.init(ref.current!, theme);
    chart.setOption(option);
    return () => chart.dispose();
  }, [theme, option]);
  return <div ref={ref} style={{ height: 360 }} />;
}
```

What Altitude can't vouch for:

- **Keyboard and screen readers.** ECharts' `aria` writes a description of the chart for screen readers, and only if its `AriaComponent` is imported (`echarts.use([AriaComponent])` with the modular build). Neither library gives a keyboard path through the data the way Altitude's charts do. Whatever keyboard support the library has is what you get, so add a table view of the data yourself.
- **The rest of [Charts](Charts.md).** A theme can't keep you from a dual axis, a pie, a gradient or a 3D bar. The rules still apply, and choosing the form is still yours.

**Observable Plot and Vega-Lite** need no helper. Pass the palette and ink:

```ts
import { dataColors, readChartTokens } from 'altitude-design/chart-themes';
const t = readChartTokens(el);

// Observable Plot
Plot.plot({ color: { range: dataColors(el) }, style: { color: t['ink-muted'], fontFamily: t['font-sans'], background: 'transparent' }, marks });

// Vega-Lite: the config block
const config = {
  background: 'transparent', font: t['font-sans'],
  range: { category: dataColors(el), ramp: [1, 2, 3, 4, 5, 6, 7].map((n) => t[`data-seq-${n}`]) },
  axis: { domainColor: t['line-control'], tickColor: t['line-control'], gridColor: t.line, labelColor: t['ink-muted'], titleColor: t.ink },
  legend: { labelColor: t.ink, titleColor: t.ink }, title: { color: t.ink },
};
```

## Rich text, code and canvases

Altitude doesn't own a rich text editor, a code editor or a node canvas: each is a large engine of its own. It ships **adapters** instead, so the one part of the screen drawn by another library still follows the elevation model. Each adapter reads the active scheme's custom properties, so all four schemes, custom accents and `contrast="more"` work. The library is an optional peer dependency your app installs; the adapters import nothing else, and they leave the library's own keyboard support and ARIA alone. Import a CSS adapter after `altitude.css`.

### Tiptap

```ts
import 'altitude-design/altitude.css';
import 'altitude-design/adapters/tiptap.css';
```

Styles Tiptap's `.tiptap` editor (ProseMirror, Tiptap 2 or later):

- **The editor is an opening**, built like `Textarea`: empty, it's a well showing its inside wall; once it holds content the floor rises flush; focus lights the floor and keyboard focus adds the 2px neutral rim. `aria-invalid="true"` on the editor drops it to a trench.
- **Content** follows Altitude's type: links in `accent-ink`, inline code on a mono plate, code blocks on `CodeBlock`'s ground, mentions (`@tiptap/extension-mention`) as flush Tag plates, Tiptap's Placeholder in `ink-muted`.
- **The formatting bar is yours**, built from `Toolbar` and `ToolbarToggle`, so each mark is a latched toggle: pass `pressed={editor.isActive('bold')}`.
- **The mention list is yours too.** Render it with class `alt-rte-mentions`, `role="listbox"` and options with `aria-selected`, and it floats at level 3 like `Combobox`'s list.

What it can't cover: Tiptap's menus beyond mentions (bubble and floating menus are your markup: build them from `Popover` and `Toolbar`), and anything a custom extension renders itself.

### CodeMirror

```ts
import { EditorView } from '@codemirror/view';
import { altitudeTheme } from 'altitude-design/adapters/codemirror';

new EditorView({ parent, extensions: [altitudeTheme(), /* your language, lint, keymaps */] });
```

`altitudeTheme()` is a CodeMirror 6 extension: a theme plus a syntax highlight style. Every value is one of the scheme's custom properties, so the editor follows the active scheme, a custom accent and `contrast="more"` without being re-created. `altitudeEditorTheme` and `altitudeHighlightStyle` are exported separately if you compose your own.

- **The editor is an opening**: a well with its inside wall; focus lights the floor and keyboard focus adds the 2px neutral rim.
- **Gutter and lines are ground.** The active line is a tint, never a height; the selection is accent.
- **Syntax uses `ink`, `ink-muted` and `accent-ink` only**: keywords and literals in accent-ink, comments and punctuation in ink-muted, the rest in ink. Code is text to read, not data to compare, so there are no `data-*` hues.
- **Lint errors** (`@codemirror/lint`) sink their gutter marker into a trench on `critical-soft`, underline the range in critical, and keep the message in words in the tooltip.
- **Tooltips and completion lists** float at level 3.

What it can't cover: the editor's state changes without a transition, because a CodeMirror theme can't scope a reduced-motion query to the editor itself. If you add `drawSelection()`, its blinking cursor is CodeMirror's own. Search and other panels take ground and line but keep CodeMirror's layout.

### React Flow

```ts
import '@xyflow/react/dist/base.css';
import 'altitude-design/altitude.css';
import 'altitude-design/adapters/react-flow.css';
```

Styles a React Flow 12 (`@xyflow/react`) canvas by setting its `--xy-*` properties from the active scheme and styling its elements:

- **The canvas is ground**, with a dot grid in `line-control` (`<Background variant="dots" />`).
- **Nodes are Cards at level 1.** A node you can select lifts one level when pointed at; a dragged node is in your hand at level 3; selection is a 2px accent rim, never extra height.
- **Status uses the commitment signal**: give a running node `className: 'alt-node-pending'` (it hovers, after the grace period) and a failed one `'alt-node-failed'` (it drops into a trench on `critical-soft`). Put the state in the node's words too ("Failed: token expired"); a failed edge can take `'alt-edge-failed'`.
- **Ports are openings**: small wells that deepen under an edge being drawn, and sink to a trench with the accent rim where it can land. The edge being drawn is dashed; edges are `line-control`, a selected edge `accent-ink`.
- **The minimap is a well** with the visible area outlined as its lens; the controls are a raised toolbar.

What it can't cover: custom node components draw themselves (build them from `Card` or `Surface`); a dragged node can't tilt, because React Flow owns its transform; and keyboard access is React Flow's own (Tab to a node, Enter to select, arrows to move), with no way to follow edges by keyboard, so offer a list or table of the same steps.
