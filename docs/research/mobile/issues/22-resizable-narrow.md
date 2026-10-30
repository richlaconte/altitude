<!--
title: ResizablePanelGroup: stack the panes when narrow, and a touch-sized handle
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`. Part of the mobile work ({{01}}, constraints M2, M10).

## What you're trying to do

Use a list-and-detail layout on a phone. At 375 CSS px the `Resizable` preview's horizontal group gives the list pane about 80px ("Invoice / INV-0042 / failed" over three lines) and the detail the rest. The handle is a 1px line whose grip you must find with a finger.

## Today

`direction?: 'horizontal' | 'vertical'`, panels with `minSize`, `maxSize`, `collapsible` (`resizable.tsx`). `.alt-resizable-handle` is 1px wide with `touch-action: none` (`bundle.css:1361`). Nothing responds to a narrow container. `minSize` is a percentage, so it shrinks with the container.

## Proposal

```tsx
<ResizablePanelGroup direction="horizontal" narrow="stack" … />   // 'stack' (default) | 'vertical' | false
```

- **`stack`**: under `breakpoint-narrow` (from {{02}}), show one panel at a time (the first, or the one marked `narrowPrimary`), with the app switching via `onNarrowPanelChange`/`narrowPanel`, the list-detail pattern on phones. The handle is hidden.
- **`vertical`**: under the breakpoint, switch `direction` to vertical, so panes stack and the handle becomes a horizontal grip.
- The handle's hit area becomes 24px everywhere and 44px under a coarse pointer, centred on the 1px line, without changing the line ({{18}}).
- `minSize` can also take a pixel value (`minSize="240px"`) so a pane never squeezes below readable.

**Additive?** Mostly. `narrow="stack"` as the default changes narrow layouts; `narrow={false}` keeps today's.

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Handle (touch hit area) | Ground | 0 | transparent hit area; the 1px line unchanged | `role="separator"`, `aria-valuenow` |
| Grip while held | as today (lifts, floats while held) | as today | as today | as today |

## Motion and accessibility

No new motion. In `stack`, the visible panel change should move focus to the new panel's heading and announce it. The separator keeps its keyboard model.

## Done when

- [ ] `narrow`, pixel `minSize`, coarse hit area implemented
- [ ] `index.d.ts`, README and a 375px section in `build/previews.txt`
- [ ] `tsc` clean; `shoot.mjs` clean at 375 and 960 in all four schemes; handle dragged by touch with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
