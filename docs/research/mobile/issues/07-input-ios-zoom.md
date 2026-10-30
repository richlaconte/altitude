<!--
title: Input: field text is 14px, so iOS Safari zooms the page on focus
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

Every Altitude text field renders its text below 16px, the size under which iOS Safari zooms the page when the field is focused. The page stays zoomed after you leave the field.

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | `Input` and everything built on `.alt-input`: `Textarea`, `Field`, `Combobox`, `TagInput`, `NumberInput`, `PasswordInput`, `SecretField`, `PromptInput`, `InputSuggestion`, `Checklist`, `CommentThread`, `CommandPalette`, `FilterBar`, plus native `<select>`s in `InlineEdit`, `EditRegion` and `ActionsInPlace` (one family: one shared rule) |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system previews |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Computed font sizes measured in Chromium via Playwright (375 CSS px, `isMobile`, `hasTouch`). **The zoom itself wasn't observed on an iOS device**; it's documented WebKit behaviour |
| Schemes affected | all |
| Modes affected | touch (iOS) |

## Steps to reproduce

```sh
cd build && ACT='(async()=>{console.log(await page.$$eval("input:not([type=checkbox]):not([type=radio]),textarea,select",els=>[...new Set(els.map(e=>e.className+" "+getComputedStyle(e).fontSize))].join(" | ")))})()' node shoot.mjs Input,SecretField,InlineEdit daylight 375
```

1. On an iPhone, open any page using `Input` (e.g. the `Field` preview) and tap the field.
2. The page zooms in around the field and stays zoomed after blur.

## Expected

Typing never moves or zooms the page (principle 8 and constraint M6 in {{01}}): field text is at least 16px on coarse pointers. The common workaround, `maximum-scale=1` in the viewport meta, disables pinch zoom and fails WCAG 1.4.4 (Resize text), so it can't be the fix, and apps shouldn't have to find that out.

## Actual

Computed `font-size` of the field element, across 23 previews:

| Field | Size |
|---|---|
| `input`, `textarea` in `.alt-input` (incl. `Checklist`, `Combobox`, `TagInput`, `NumberInput`, `PromptInput`, `CommentThread`) | 14px |
| `SecretField` value (`.alt-secret-value`) | 13.5px |
| native `<select>` in `InlineEdit`, `EditRegion` | 13.33px (UA default) |
| native `<select>` in `ActionsInPlace` | 12.5px |

## Suspected cause (optional)

Confident. `bundle.css:183–186`: `.alt-input input, .alt-input textarea { … font: 400 14px/20px var(--font-sans) }`; `:1164` for `SecretField`. Fix direction: `@media (pointer: coarse) { .alt-input input, .alt-input textarea, .alt-select-native { font-size: 16px; line-height: 22px } }`, which pairs with the taller coarse field height in {{02}}. `text-label` stays 14px for labels; only the text you type grows. Check `InputSuggestion`'s ghost text and `Input`'s character gauge align after the change, since they overlay the field text.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
