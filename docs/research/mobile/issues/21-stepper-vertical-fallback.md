<!--
title: Stepper: fall back to the vertical layout when the horizontal one doesn't fit
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Stepper`. Part of the mobile work ({{01}}, constraint M10).

## What you're trying to do

Show a five-step process on a phone. At 375 CSS px the horizontal `Stepper` wraps: Account and Workspace on the first line, Invite team and Billing on the second, Launch alone on the third, each line ending in a connector that leads nowhere. The order still reads, but the connectors say the opposite of what they're for.

## Today

`orientation?: 'horizontal' | 'vertical'` (`stepper.tsx:17`), default horizontal. `.alt-stepper` is `flex-wrap: wrap` (`bundle.css:2201`). The vertical layout (`:2245`) is fine at any width. Nothing chooses between them.

## Proposal

```tsx
<Stepper orientation="auto" … />   // 'horizontal' (default today) | 'vertical' | 'auto'
```

`auto` lays out horizontally when every step fits on one line in the container, and vertically otherwise (measured with `ResizeObserver`, or a container query at `breakpoint-narrow` from {{02}} if measuring proves jumpy). A compact third form ("Step 3 of 5 · Invite team" with a `Progress`-style track) could replace the vertical list when vertical space is also short. Optional, maybe a later issue.

**Additive?** yes. The default stays `horizontal`; the README recommends `auto`.

## Elevation impact

None. Both layouts already exist with the same plates (completed flush and checked, current standing on its wall, future imprinted).

## Motion and accessibility

Switching layout on resize doesn't animate. The list semantics (`ol`, `aria-current="step"`) are the same in both.

## Done when

- [ ] `orientation="auto"` implemented
- [ ] `index.d.ts`, README and a 375px section in `build/previews.txt` (the existing preview's `300px 1fr` grid also needs to go, per {{04}})
- [ ] `tsc` clean; `shoot.mjs` clean at 375 and 960 in all four schemes
- [ ] `node build.mjs && node previews.mjs` run and committed

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
