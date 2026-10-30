<!--
title: Schedule: switch to one day when the week doesn't fit
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Schedule`. Part of the mobile work ({{01}}, constraints M1, M2, M4, M5).

## What you're trying to do

See and change a schedule on a phone. At 375 CSS px the `workweek` view draws five day columns of about 55px each: events read "Sta…", "D", "C", "Pla…", the slot cells you tap to create an event are 55×11px, and the resize handle appears only on hover.

## Today

- `view?: 'day' | 'week' | 'workweek'` (`schedule.tsx:12`): the day view already exists, but nothing picks it for a narrow container, and the header has no way to page through days.
- Slot cells: 200 targets of 55×11px in the preview (`.alt-schedule-cell { height: var(--slot) }`, `bundle.css:3365`), far under WCAG 2.5.8's 24px.
- Creating by dragging across slots and moving events by dragging (`schedule.tsx:334`, `:351`) are pointer-only, and the body has no `touch-action`, so on touch they compete with scrolling (as in {{11}}).
- The resize handle: `opacity: 0` until `:hover`/`:focus-within` (`bundle.css:3392–3393`).
- Opening an event is `onDoubleClick` (`schedule.tsx:351`), which touch browsers don't reliably deliver.

## Proposal

```tsx
<Schedule view="workweek" narrowView="day" />   // narrowView: 'day' (default) | 'agenda' | false
```

- When the component's own width is under `breakpoint-narrow` (480px, from {{02}}, via a container query or `ResizeObserver`), render `narrowView`. `day` shows one column with a day strip above it (the week's days as a segmented control, previous/next) so the week is one tap away; `agenda` lists events by day with no grid.
- Under `(pointer: coarse)`, slot height grows so a slot is ≥ 44px tall (or slots group into 30-minute rows); tapping an empty slot creates an event there (with the same default length a click-drag would give); press-and-hold an event to move it; the resize handle is always visible on the selected event.
- Open an event on a single tap (and keep `onDoubleClick` for mouse).

**Additive?** yes, except that the default `narrowView="day"` changes what narrow containers show. `narrowView={false}` keeps today's behaviour.

## Elevation impact

None to tiers. The day strip is a `Toggle` group (choice built like the Switch); events keep their raised plates; an event picked up by a touch hold lifts to level 3 as a mouse drag does.

## Motion and accessibility

Paging days glides the column (one change, `ease-glide`), no slide under reduced motion. The grid's keyboard model is unchanged. The day strip is a radio group with the date as its label. Announce the visible day on change.

## Done when

- [ ] `narrowView` and the coarse-pointer slot height and touch interactions implemented
- [ ] `index.d.ts`, the README and a 375px section in `build/previews.txt` updated
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes at 960 and 375; touch create/move checked with `ACT` (CDP touch events)
- [ ] `node build.mjs && node previews.mjs` run and committed

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
