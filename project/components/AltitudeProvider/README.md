# AltitudeProvider

Sets the color scheme, accent and motion preference for everything inside it, and hosts the layers that rise above the page.

Wrap the app once, near the root. It renders a themed root, a **stage** (your app, which recedes behind dialogs) and a **layer host** (where dialogs and toasts render, so they stay inside the theme but outside the receding stage).

It also sets the high-contrast rendering: with `contrast="more"` (or the system's `prefers-contrast: more`), shadows become hard ink slabs whose thickness is the height.

It runs the **approach** tracker too, which lets openings react to a pointer before it arrives: an empty field deepens to receive, and a bottom sheet's finger pull opens. Raised things (buttons, cards, piles, steps) never react before the pointer is on them and never follow it. It only follows a mouse or pen, never touch, and reduced motion turns every approach effect off. `approach={false}` turns it off for everything inside.

**You provide:** `scheme` (or nothing, to inherit `data-theme` from the page), optionally `accent` as a hex color, `motion`, `approach`, and `recede={false}` if your layout can't tolerate a transform on the app root (for example a `position: fixed` header that must not scale).

- Do nest a provider to theme a region differently: a `nightfall` sidebar in a `daylight` app.
- Do pass your brand color as `accent`; legibility is derived for you.
- Don't render `Dialog` or `Toaster` outside a provider unless you accept them portaling to `document.body` without the receding page.
