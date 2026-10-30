<!--
title: Accessibility: controls below WCAG 2.5.8's 24px minimum target size
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

Measured at 375 CSS px, a number of controls have hit areas under 24×24 CSS px, the WCAG 2.2 AA minimum (2.5.8). Several sit next to another target, so the spacing exception can't apply. On a phone they're hard to hit and easy to miss into their neighbour.

**Kind:** keyboard / screen reader (target size)

## Where

| | |
|---|---|
| Component | `NumberInput`, `TimeInput`, `DatePicker`, `Slider`, `ChartBrush`, `TagInput`, `Toaster`, `InlineCitation`, `AILabel`, `Alert`, `ResizablePanelGroup`, and `<summary>` disclosures in previews (one issue because they share one fix: a hit-area extension; checkboxes below list each so they can close separately). `Schedule` slot cells are covered in {{14}} |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system previews |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Chromium via Playwright, 375 CSS px, `isMobile`, `hasTouch`, DPR 2, macOS; hit box = `getBoundingClientRect()` of the control (of the label for checkbox/switch inputs) |
| Schemes affected | not scheme-specific |
| Modes affected | all; worst on touch |

## Steps to reproduce

```sh
cd build && ACT='(async()=>{console.log(await page.$$eval("button,a[href],[role=slider],[role=spinbutton],[role=separator],summary",els=>els.map(e=>{const b=e.getBoundingClientRect();return b.width&&(b.width<24||b.height<24)?e.className+" "+Math.round(b.width)+"x"+Math.round(b.height):null}).filter(Boolean).join(" | ")))})()' node shoot.mjs NumberInput,Slider,ChartBrush,TagInput,Toaster,InlineCitation,TimeInput daylight 375
```

## Expected

WCAG 2.5.8 Target size (minimum): 24×24 CSS px, or spaced so a 24px circle on each doesn't touch another target. Constraint M2 in {{01}}: ≥ 24 everywhere, ≥ 44 under a coarse pointer (the 44 part is {{02}}). `Research.md` already flags one as an open question: "whether 15px-tall steppers are large enough on touch screens". #27 fixed the same class of bug for `ErrorSummary` links.

## Actual

- [ ] `NumberInput`: steppers **24×15**, two stacked with no gap (`.alt-numfield-step`, `bundle.css:1089`). Fails; no spacing exception possible
- [ ] `TimeInput`, `DatePicker`, `ChartBrush` (typed range): date and time segments **20–28×22**, adjacent (`.alt-date-seg`, `:3119`)
- [ ] `Slider`: thumbs **20×20** (`.alt-slider-thumb`, `:400`); the two thumbs of a range slider can sit side by side
- [ ] `ChartBrush`: grips **10×24** at each edge of the lens (`.alt-brush-grip`, `:2456`)
- [ ] `TagInput`: remove buttons **20×20**, beside the tag (`.alt-tag-remove`, `:3086`)
- [ ] `Toaster`: close **23×23** (`.alt-toast-close`, `:866`)
- [ ] `InlineCitation`: markers **16×16** and 26×16 inline in prose (`.alt-cite`, `:1812`). Inline targets in a sentence are exempt from 2.5.8, but on touch they're the only way to open the source preview
- [ ] `AILabel`, `ChartReference`: badge buttons **22px** tall
- [ ] `Alert`: "+2 more" **69×22**
- [ ] `<summary>` disclosures in `Dialog`, `EditRegion`, `InlineEdit`, `TableEditing`, `ActionsInPlace` previews: **17–20px** tall (these are preview chrome, but `Accordion`-less disclosures are a pattern apps copy)
- [ ] `ResizablePanelGroup`: handle **1px** wide (`.alt-resizable-handle`, `:1361`); see also {{22}}

## Suspected cause (optional)

Confident: literal sizes in `bundle.css`. Fix direction: a shared hit-area utility (`position: relative` plus a transparent `::before` with `inset: min(0px, calc((var(--size-target-min) - 100%) / -2))`, or explicit negative insets) so faces keep their size and tier and the hit area reaches 24px, or 44px under a coarse pointer once {{02}} lands. For the stacked `NumberInput` steppers, the hit areas would overlap: under a coarse pointer, lay them out as − and + on either side of the field instead.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
