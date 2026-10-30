<!--
title: Tokens: target sizes and a coarse-pointer density step
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`project/tokens.json` (and so `tokens.css`) and `bundle.css`, plus an `AltitudeProvider` prop. Part of the mobile work ({{01}}, constraints M2 and M10).

## What you're trying to do

Make controls large enough to hit with a finger on a phone without making the desktop interface sparse, and without each component inventing its own size.

At 375 CSS px with `isMobile` and `hasTouch`, **951 of the 1,076 interactive targets in the previews (88%) are smaller than 44×44 CSS px** in at least one dimension. That's the size in Apple's HIG and WCAG 2.5.5, and smaller than Material's 48dp. Parhi, Karlson & Bederson (MobileHCI 2006) found 9.2mm (≈ 35 CSS px on a typical phone) sufficient for discrete one-handed thumb targets, and accuracy is worst at the screen edges.

## Today

There are no size or density tokens. Heights are literals in `bundle.css`:

| Control | Height |
|---|---|
| `Button` (`bundle.css:87`) | 36px; `sm` 30; `lg` 44 |
| `Input` (`:167`) | 40px; `sm` 34 |
| `Tabs` trigger | 30px |
| `Switch` | 24px |
| `Sidebar` item | 34px |
| `Tree` row | min 32px |
| `CommandPalette` item | min 40px |

The four width rules use four numbers: `AppShell` 768, `NotificationCenter` 640, `SavedViews` 640, `DatePicker` 560, `Pagination` 480.

## Proposal

```jsonc
// tokens.json — new group "size"
"size": {
  "target-min":    { "value": "24px", "coarse": "44px" },   // the hit area every control reaches
  "control-sm":    { "value": "30px", "coarse": "40px" },
  "control-md":    { "value": "36px", "coarse": "44px" },   // Button, Tabs trigger, menu item, sidebar item
  "field-md":      { "value": "40px", "coarse": "48px" },   // Input, Select trigger
  "row-md":        { "value": "32px", "coarse": "44px" },   // Tree, list and menu rows
  "breakpoint-narrow":  { "value": "480px" },              // components (container queries)
  "breakpoint-compact": { "value": "640px" }               // page chrome
}
```

`tokcss.py` emits the `coarse` values inside `@media (pointer: coarse)`. Components use `var(--size-control-md)`, and small faces (a 20px tag remove, a checkbox box) reach `--size-target-min` with a transparent `::before` hit area, so the face and its tier don't change.

```tsx
<AltitudeProvider density="comfortable">   // 'auto' (default: follows the pointer) | 'compact' | 'comfortable'
```

`density="comfortable"` applies the coarse values everywhere (kiosks, accessibility settings); `compact` pins today's values.

**Additive?** yes for the API. Under `(pointer: coarse)` with the default `density="auto"`, controls get taller on touch devices. That's the point, but it changes layout on phones and tablets, so it's worth a minor version and a release note.

## Elevation impact

None. Tiers, levels, surfaces and shadows are unchanged; only dimensions change. Walls and sheens scale with the face as they do between `sm` and `lg` today.

## Motion and accessibility

No new motion. WCAG 2.5.8 (24px) everywhere and 2.5.5 (44px) on coarse pointers. Forced colours: unaffected (the `::before` hit area is transparent and has no border). Check that `(any-pointer: fine)` on a touch laptop still gets compact faces with the larger hit area. Proposed: hit area follows `pointer: coarse`, face size follows `density`.

## Done when

- [ ] `size-*` tokens in `tokens.json`, emitted by `tokcss.py` with the coarse media query; `tokens.py` still reports 0 failures
- [ ] `bundle.css` heights replaced by the tokens; the five ad hoc widths use the two breakpoints (in container queries where the component owns its layout)
- [ ] `AltitudeProvider density` in `index.d.ts`, README and a preview section
- [ ] `Theming.md` documents density; `Mobile.md` ({{01}}) references the tokens
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes at 960 and 375; the phone check ({{04}}) shows no target under 24px and none under 44px with `hasTouch`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered (optional)

- **Make everything 44px always.** Rejected: desktop density is information, and the mouse doesn't need it.
- **Hit areas only, no density step.** Covers buttons and icons, but fields and rows with 44px hit areas and 36px faces overlap their neighbours' hit areas in dense lists.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
