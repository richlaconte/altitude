<!--
title: ItemGroup: row actions squeeze the content at phone width
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`ItemGroup` (`Item`, `ItemContent`, `ItemActions`). `RemovalReceipt`'s preview uses the same row shape and shows the same problem. Part of the mobile work ({{01}}, constraints M1, M10).

## What you're trying to do

Show a list of things with their actions on a phone. At 375 CSS px, in the `ItemGroup` webhooks preview, the grip, the icon and two text actions ("Edit", "Remove") leave the content about 95px, so each webhook URL breaks every nine characters over four lines ("https://api.no / rthwind.exampl / e/hooks/prod"). In `RemovalReceipt`, URLs wrap a single trailing character onto their own line.

## Today

`.alt-item { display: flex; align-items: center }`, `.alt-item-content { flex: 1; min-width: 0 }`, `.alt-item-actions { display: flex; flex-wrap: wrap; flex: none }` (`bundle.css:3474–3480`). Actions never yield width.

## Proposal

```tsx
<ItemActions narrow="below" />   // 'below' (default) | 'menu' | false
```

Under `breakpoint-narrow` (container query, from {{02}}):

- **`below`**: actions move to their own row under the content, aligned with the content's start.
- **`menu`**: actions collapse into a "More actions" (`…`) button that opens a `DropdownMenu` (a bottom sheet on touch, {{06}}). The primary action can stay visible with `ItemActions primary={…}`.

Long unbroken strings in `ItemDescription` get `overflow-wrap: anywhere` with a single line and an ellipsis option (`ItemDescription truncate`), so a URL doesn't drive the layout.

**Additive?** Mostly. `below` as the default changes narrow layouts; `narrow={false}` keeps today's.

## Elevation impact

None. Actions keep their buttons (ghost on the ground, raised when they're the row's primary); the "…" button is a ghost button that opens a level-3 menu.

## Motion and accessibility

No new motion. In `menu`, the trigger's accessible name includes the item ("More actions for Production"). Keyboard order unchanged in `below`.

## Done when

- [ ] `narrow` on `ItemActions`, `truncate` on `ItemDescription`
- [ ] `index.d.ts`, README and a 375px section in `build/previews.txt`
- [ ] `tsc` clean; `shoot.mjs` clean at 375 and 960 in all four schemes
- [ ] `node build.mjs && node previews.mjs` run and committed

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
