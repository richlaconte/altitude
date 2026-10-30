<!--
title: Breadcrumb: collapse to fit the width instead of wrapping
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Breadcrumb` (and `PageHeader`, which shows one). Part of the mobile work ({{01}}, constraint M10).

## What you're trying to do

Show where a page sits on a phone without the trail taking three lines. At 375 CSS px the preview's four-step trail wraps onto a second line ("Comments" alone), and a narrower container wraps it again. Because each step is a raised plate whose height says "the current page is the tallest", wrapped rows make the staircase read as two separate staircases.

## Today

`maxItems` (`breadcrumb.tsx:24–25`) collapses the middle of a *deep* path behind "…" (`BreadcrumbEllipsis`), but only by count. `.alt-crumbs ol` is `flex-wrap: wrap` (`bundle.css:1970`). Nothing reacts to the width.

## Proposal

```tsx
<Breadcrumb items={items} fit="collapse" />   // 'collapse' (default) | 'wrap'
```

`collapse` measures the trail against its container (`ResizeObserver`) and, when it doesn't fit on one line, moves steps behind the existing "…" menu from the second step onward until it does, always keeping the first step and the current page. Under `breakpoint-narrow` with only room for one step, it shows "← Parent" (a single back link to the parent), the common phone form. `maxItems` still applies first.

**Additive?** Mostly. `collapse` as the default changes how narrow trails render (one line instead of several); `fit="wrap"` keeps today's behaviour.

## Elevation impact

None. Steps keep their plates and the current page stays tallest; the "…" step is the existing `BreadcrumbEllipsis`. A single "← Parent" is a raised step at the same level as other steps.

## Motion and accessibility

Steps moving behind "…" when the width changes don't animate (it's layout, not a change in the record). The "…" menu is already keyboard reachable. The back-link form keeps `nav[aria-label="Breadcrumb"]` and labels the link "Back to <parent>".

## Done when

- [ ] `fit` implemented with width measurement; `maxItems` unchanged
- [ ] `index.d.ts`, README and a 375px section in `build/previews.txt`
- [ ] `tsc` clean; `shoot.mjs` clean at 320, 375 and 960 in all four schemes
- [ ] `node build.mjs && node previews.mjs` run and committed

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
