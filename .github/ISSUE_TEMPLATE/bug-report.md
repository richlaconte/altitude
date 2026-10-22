---
name: Bug report
about: Something renders, moves, announces or builds wrong
title: "<Component>: <what goes wrong>"
labels: bug
---

<!-- Read CONTRIBUTING.md ("Issues") before filling this in. Delete these comments and any section marked optional that you leave empty. -->

## What goes wrong

<!-- One sentence: what you did, what happened. -->

**Kind:** visual / elevation · motion · keyboard / screen reader · API / types · build / package / Storybook

## Where

| | |
|---|---|
| Component | |
| Version | `altitude-design@x.y.z`, or the commit SHA if built from source |
| How it's loaded | npm ESM / npm CommonJS / `altitude.iife.js` / Storybook / design system preview |
| React | |
| Browser and OS | |
| Schemes affected | daylight · nightfall · mesa · alpine (say which you checked) |
| Modes affected | none · reduced motion · `contrast="more"` · forced colours · touch |

## Steps to reproduce

```tsx
// The smallest render that shows it, using only the public API. Or a build/previews.txt section,
// or the shoot.mjs command (with ACT) that reproduces it.
```

1.
2.

## Expected

<!-- What should happen, and the rule that says so: quote or link the line in project/README.md, Elevation.md, Motion.md or the component's README. -->

## Actual

<!-- What happens instead. Attach a screenshot (shoot.mjs, DPR=2) and, if it moves, a short recording. Paste page and console errors trimmed to the relevant lines. -->

## Regression? (optional)

<!-- The last version or commit where it worked. -->

## Suspected cause (optional)

<!-- Only if you've looked. Link file and line, and say how sure you are. Keep this separate from what you observed. -->
