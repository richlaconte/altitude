<!--
title: New: Suggestions — prompts to start from or follow up with
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

An empty conversation offers starting points ("Summarise last week's incidents", "Draft a release note"); a finished answer offers follow-ups ("Compare with Q2", "Make it shorter"). The Shape of AI calls these wayfinders (Suggestions, Initial CTA, Follow up); AI Elements has `Suggestion`. They either send at once or fill the composer for editing. Apps build them as pills with no rule for how they arrive, whether they lift, or how they're announced.

**Closest existing components:** `EmptyState` (holds an empty conversation and its actions), `Button`, `Toolbar` (a row of tools with one tab stop).
**Name:** `Suggestions`, `Suggestion` (AI Elements' names).

## Elevation story

**What it is:** live (things you press)
**Signal it carries:** "Affordance" (raised slab = press it); a new arrival rule for follow-ups
**Relatives it borrows from:** each suggestion is a small `Button variant="secondary"`; starters sit inside an `EmptyState`; follow-ups sit under the answer like `MessageActions`.

| Part / state | Tier | Level | Surface · shadow | Non-height cue (word, icon, ARIA state or border) |
|---|---|---|---|---|
| Suggestion at rest | Raised | 1 | `surface-raised` · `elev-1`, `wall-1`, `radius-md` | its text; an arrow icon when it sends at once |
| Pointed at / focused | Raised | 2 | `surface-lifted` · `elev-2` | focus ring |
| Pressed | Ground | 0 | as `Button` | — |
| After choosing one (`mode="fill"`) | — | — | the composer's floor rises (Completeness) | composer value |
| Follow-ups arriving | Raised | 1 | cross-fade in after the answer has settled; no rise | group named "Suggested follow-ups" |
| Starter group in an empty conversation | Sunk (the `EmptyState` opening) | −1 | `EmptyState` well | its heading |

They're never level 2: the view's one primary is the composer's Send.

## Motion

Follow-ups **cross-fade** in over `dur-onset` after the answer's afterglow ends; they don't rise, because they merely became available ("Spend rises carefully"). When a new turn starts, the previous follow-ups fade out. Under reduced motion they appear and disappear.

## Accessibility

**WAI-ARIA pattern:** a labelled `group` of buttons (or the [toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) pattern with one tab stop when there are more than four).
**Keyboard:** Tab or arrows between suggestions; Enter or Space chooses. After `mode="fill"`, focus moves to the composer with the caret at the end; after `mode="send"`, focus stays in the composer.
**Screen reader:** each is named by its text, plus "sends now" when `mode="send"`. Follow-ups aren't announced on arrival (the answer was); they're reachable right after it.
**Forced colours:** 1px border (raised fallback).
**`contrast="more"`:** a 2px slab, as `Button`.

## API sketch

```tsx
<Suggestions aria-label="Suggested follow-ups" mode="fill" onChoose={(text) => setDraft(text)}>
  <Suggestion>Compare with Q2</Suggestion>
  <Suggestion>Make it shorter</Suggestion>
  <Suggestion value="List the three biggest risks, with owners">Biggest risks</Suggestion>
</Suggestions>
```

`mode`: `'fill'` (default; puts the text in the composer to edit) or `'send'`. `value` sends or fills something longer than the label.

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/Suggestions/README.md` in the existing format (what it is, elevation, props, "You provide", do and don't)
- [ ] A section in `build/previews.txt` with an honest `@dsCard` group and subtitle
- [ ] A row in the signals table in `Elevation.md`; new choreography in `Motion.md`; sources and a prototype review in `Research.md`
- [ ] `tsc` clean; `shoot.mjs` renders it in all four schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`
- [ ] Keyboard paths checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed (CI fails otherwise)

## Open questions (optional)

- Should AI-generated follow-ups carry an `AILabel`? They're the product's offer, not content; the group's name may be enough.

Part of the agent harness research pass (`docs/research/agent-harness/`).
