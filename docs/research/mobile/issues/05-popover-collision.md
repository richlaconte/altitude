<!--
title: Popover, DropdownMenu, HoverCard, Tooltip: floating panels leave the screen at phone width
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

At 375 CSS px, anchored floating panels open past the edge of the screen: part of the panel, and so part of its content, is off-screen and the page gains a horizontal scroll.

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | `Popover`, `DropdownMenu`, `HoverCard`, `Tooltip` (one family: all positioned by `.alt-pop` / `.alt-tip` with no collision handling). `Select`'s and `Combobox`'s lists share the problem through `max-width: max(100%, 360px)` |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system previews (`build/previews.txt`, sections `DropdownMenu`, `HoverCard`, `Tooltip`) |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Chromium via Playwright, 375 CSS px, `isMobile`, `hasTouch`, DPR 2, macOS |
| Schemes affected | daylight checked; not scheme-specific |
| Modes affected | none needed; any narrow viewport |

## Steps to reproduce

```sh
cd build && DPR=2 node shoot.mjs DropdownMenu,HoverCard,Tooltip daylight 375
# then: document.documentElement.scrollWidth - innerWidth in each page
```

1. `DropdownMenu`: the "Predicted" menu (right-hand trigger) opens with `align="start"` from its trigger's left edge.
2. `HoverCard`: the open card on "Mara Quist", mid-sentence.
3. `Tooltip`: the open "Bold ⌘B" tooltip on the first toolbar button.

## Expected

The panel stays inside the visible viewport with a margin, flipping its side or alignment, then shifting, then constraining its width. `ContextMenu` already does this (`context-menu.tsx:41` clamps to `innerWidth`/`innerHeight`), and so does `Tour` (`tour.tsx:57`). `Research.md` (E27) for the chart readout: "It opens on whichever side of the point has room." Constraint M7 in {{01}}.

## Actual

- `DropdownMenu`: the page scrolls sideways by **86px**; the menu's right part is off-screen.
- `HoverCard`: **26px** past the right edge.
- `Tooltip`: the tooltip's left edge is at x≈5px, clear only because the trigger happens to be 19px in. A trigger at the left edge clips it.

No page or console errors.

## Suspected cause (optional)

Confident. `.alt-pop` (`bundle.css:784`) is `top: calc(100% + 8px); left: 0; min-width: 220px`, with `[data-align="end"] { left: auto; right: 0 }` and `center` translating −50%, all pure CSS relative to the anchor. `Popover`, `DropdownMenu` and `HoverCard` (`overlays.tsx:60`, `:172`, `:216`) pass `side`/`align` straight through, and nothing measures the panel. `.alt-tip` is the same. Fix direction: one shared `usePlacement(anchor, panel, { side, align })` hook that measures on open and on `visualViewport` resize/scroll, picks the side and alignment that fit (8px margin), and sets `data-side`/`data-align` plus a `--alt-pop-max-w`. The `ContextMenu` clamp can move into it. On narrow touch screens, see {{06}} for opening as a bottom sheet instead.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
