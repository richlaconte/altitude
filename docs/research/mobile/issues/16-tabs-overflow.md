<!--
title: Tabs: the tab list overflows the page at phone width
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

When the tabs don't fit the width, the tab list runs past the edge of its container and the page scrolls sideways. The last tab is partly off-screen.

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | `Tabs` (`TabsList`), and `SavedViews`, which renders its views as a `TabsList` |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system previews (`build/previews.txt`, sections `Tabs`, `SavedViews`) |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Chromium via Playwright, 375 CSS px, `isMobile`, DPR 2, macOS |
| Schemes affected | daylight checked; not scheme-specific |
| Modes affected | none needed |

## Steps to reproduce

```sh
cd build && DPR=2 node shoot.mjs Tabs,SavedViews daylight 375
```

1. `Tabs`: Overview, Activity, Settings, Members.
2. `SavedViews`: All deals, My open deals, In negotiation.

## Expected

Constraint M1 in {{01}}: no sideways page scroll at 320 CSS px. A tab list that doesn't fit scrolls within itself (with the selected tab kept in view and an edge fade saying there's more), or moves the tabs that don't fit into a "More" menu, as `Toolbar` already does ("The narrow bar moves what doesn't fit into 'More tools'").

## Actual

- `Tabs`: the page is 47px wider than the viewport; "Members" ends at x=412.
- `SavedViews`: 26px wider; "In negotiation" ends at x=390. Its 640px rule (`.alt-views-actions`) moves the actions but not the tabs.

## Suspected cause (optional)

Confident. `.alt-tabs-list` (`bundle.css:335`) is `display: inline-flex; align-self: flex-start` with no `max-width` or overflow, and triggers are `white-space: nowrap`. Fix direction: `max-width: 100%; overflow-x: auto; scrollbar-width: none` with `scroll-snap` and an edge mask, scrolling the selected trigger into view on change. The gliding indicator (`.alt-tabs-indicator`) must be positioned inside the scroller. Or reuse `Toolbar`'s overflow logic for a "More" menu. The scroll option is simpler and keeps every tab one tap away.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
