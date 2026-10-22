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

The derivation reruns when the scheme changes, so one brand color works in light and dark. Very pale accents (yellows, pastels) still need checking: a checked checkbox's fill should hold 3:1 against the ground.

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

Only hex colours can be measured; `checkScheme` reports any other value it was asked to check. To ship a scheme as CSS instead, write a `[data-theme="paper"]` block that sets the tokens and pass `scheme="paper"`. Anything the block leaves out falls back to daylight, and nothing checks it for you, so run `checkScheme(element)` on it in a test.

## Making a new scheme

To add a scheme to Altitude itself, add a theme to `tokens.json` and give it a value for every color and shadow token. Keep these invariants:

- The surfaces form a ladder: trench < well < ground < raised ≤ lifted ≤ floating ≤ overlay ≤ modal in lightness (dark schemes step up about 3% per level; light schemes go to white at raised).
- `ink`, `ink-muted`, `accent-ink` and the three status colors each clear 4.5:1 on all eight surfaces. `line-control` and `accent` clear 3:1 on ground, well, trench and raised.
- `presence-1`–`presence-3` clear 3:1 on every surface, and `on-presence` clears 4.5:1 on each.
- Button and key walls are derived (the face colour mixed 34% toward black; `surface-trench` under neutral faces), so a new scheme or a custom accent gets correct walls without new tokens.
- Shadows keep the four-layer structure (rim, ring, key, ambient) at every level, including `elev-0`, `well` and `trench`, so transitions interpolate.

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
