# AltitudeProvider

Sets the color scheme, accent and motion preference for everything inside it, and hosts the layers that rise above the page.

Wrap the app once, near the root. It renders a themed root, a **stage** (your app, which recedes behind dialogs) and a **layer host** (where dialogs and toasts render, so they stay inside the theme but outside the receding stage).

It also sets the high-contrast rendering: with `contrast="more"` (or the system's `prefers-contrast: more`), shadows become hard ink slabs whose thickness is the height.

It runs the **approach** tracker too, which lets openings react to a pointer before it arrives: an empty field deepens to receive, and a bottom sheet's finger pull opens. Raised things (buttons, cards, piles, steps) never react before the pointer is on them and never follow it. It only follows a mouse or pen, never touch, and reduced motion turns every approach effect off. `approach={false}` turns it off for everything inside.

**Your own scheme.** `scheme` also takes a custom scheme: `{ name, base, tokens }`, your colour and shadow tokens laid over a built-in scheme (`base`, which supplies anything you leave out and the light or dark handling). The provider scopes them to itself in a stylesheet, so they nest like the built-in schemes and still give way to high contrast. If the scheme breaks the invariants in [Theming](../../Theming.md) (the surface ladder, contrast on every surface), it says which in a console warning; `checkScheme` runs the same test in your own tests. A plain string names your own `[data-theme="…"]` block instead.

**You provide:** `scheme` (a built-in name, your own, a custom scheme, or nothing, to inherit `data-theme` from the page), optionally `accent` as a hex color, `motion`, `approach`, and `recede={false}` if your layout can't tolerate a transform on the app root (for example a `position: fixed` header that must not scale).

- Do nest a provider to theme a region differently: a `nightfall` sidebar in a `daylight` app.
- Do pass your brand color as `accent`; legibility is derived for you.
- Do reach for a custom scheme only when the brand needs its own grounds and ink, and keep `checkScheme` passing in your tests.
- Don't render `Dialog` or `Toaster` outside a provider unless you accept them portaling to `document.body` without the receding page.
