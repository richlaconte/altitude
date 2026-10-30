<!--
title: PropertyList: proposed values wrap one letter per line at phone width
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

At 375 CSS px, a `PropertyList` field with a proposal squeezes its old value, new value and "Proposed by …" into a column about 35px wide, so they break every few letters ("Quali/fied", "€12,0/00", "Propos/ed by/Assista/nt").

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | `PropertyList` with `proposals` (the proposed-changes feature from #155) |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system preview (`build/previews.txt`, section `PropertyProposals`) |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Chromium via Playwright, 375 CSS px, `isMobile`, DPR 2, macOS |
| Schemes affected | daylight checked; not scheme-specific |
| Modes affected | none needed; any container under ~480px |

## Steps to reproduce

```sh
cd build && DPR=2 node shoot.mjs PropertyProposals daylight 375
# open test/shot-PropertyProposals-daylight.png
```

1. Look at "Stage", "Amount" and "Close date".

## Expected

The proposed change reads as a sentence: the old value struck through, the new value, who proposed it, then Reject and Accept. Constraint M10 in {{01}}: a component responds to its container and changes form when it doesn't fit (here: label above, then the change, then the actions on their own row), instead of shrinking content to one word per line. WCAG 1.4.10 (Reflow).

## Actual

Each proposal row keeps three columns: label (~110px), the change (~35px), and Reject/Accept (~110px). Old and new values break mid-word; "Proposed by Assistant (from Jamie's email)" takes eleven lines. The plain `PropertyList` preview reads fine at the same width; only rows with a proposal break.

## Suspected cause (optional)

Medium confidence. The proposal grid (`.alt-property-proposal { display: grid; grid-template-columns: 1fr auto }`, `bundle.css:3611`) sits inside the property row's label/value grid and puts the actions in an `auto` column beside the change, so the change gets whatever's left. Fix direction: `container-type: inline-size` on the list, and under 480px put the label above the value (as `PropertyList` could do for every row) and the actions on a row below the change.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
