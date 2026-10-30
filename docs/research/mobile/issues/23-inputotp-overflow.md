<!--
title: InputOTP: an eight-character code overflows at phone width
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

At 375 CSS px, the `InputOTP` preview's eight-slot backup code runs past the right edge of the screen; the last slot is partly cut off and the page scrolls sideways.

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | `InputOTP` (`InputOTPGroup`, `InputOTPSlot`) |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system preview (`build/previews.txt`, section `InputOTP`) |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Chromium via Playwright, 375 CSS px, `isMobile`, DPR 2, macOS |
| Schemes affected | daylight checked; not scheme-specific |
| Modes affected | none needed |

## Steps to reproduce

```sh
cd build && DPR=2 node shoot.mjs InputOTP daylight 375
```

1. Look at "Backup code" (8 letters or digits).

## Expected

Constraint M1 in {{01}}: no sideways page scroll at 320 CSS px. Eight slots fit in 320px if they shrink (8 × 34px + 7 × 4px = 300px) or the group wraps into two groups of four, as backup codes are often written.

## Actual

The page is 11px wider than the viewport; the group ends at x=386 in a 375px screen. At 320px it would be 66px over.

## Suspected cause (optional)

Confident. `.alt-otp-slot { width: 40px; height: 48px }` and `.alt-otp-group { display: inline-flex; gap: 6px }` (`bundle.css:1113–1114`): 8 × 40 + 7 × 6 = 362px plus the preview's padding. Fix direction: `width: clamp(32px, calc((100cqi - (n - 1) * 4px) / n), 40px)` with `container-type: inline-size` on the root (needs the slot count as a custom property), keeping the 48px height so the target stays tall. Or allow `InputOTPGroup`s to wrap when there's a separator.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
