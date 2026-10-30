<!--
title: Toaster: on touch the stack collapses as the finger lifts, and timers never pause
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

The toast stack fans out and pauses its timers only while a pointer is over it. On a touch screen the stack expands on the tap and collapses again as the finger lifts, and the timers keep running, so a person reading a toast on a phone can't keep it open or reach the older toasts behind it.

**Kind:** keyboard / screen reader (input modality)

## Where

| | |
|---|---|
| Component | `Toaster` |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system preview (`build/previews.txt`, section `Toaster`) |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Code reading. Pointer events for touch fire `pointerenter` on contact and `pointerleave` after `pointerup` (Pointer Events spec), which is the sequence the code reacts to. Not checked on a device |
| Schemes affected | all |
| Modes affected | touch |

## Steps to reproduce

1. On a phone, open the `Toaster` preview; press "Toast" three times.
2. Tap the stack to read the older toasts. It fans out, then folds back as you lift your finger.
3. Keep your eyes on the front toast. It closes at its normal time even though you were touching it.

## Expected

Principle 2 and constraint M4 in {{01}}: nothing reachable only by hover, and "a timer that pauses for a hovering reader pauses for a touching one". WCAG 2.2.1 (Timing adjustable) and 1.4.13 (Content on hover or focus: hoverable, persistent) point the same way. The preview's own instruction reads "Hover the stack to fan it out; timers pause while you read", which has no touch equivalent.

## Actual

`overlays.tsx`, `Toaster`: `onPointerEnter={() => setExpanded(true)} onPointerLeave={() => setExpanded(false)}`, and the auto-dismiss effect returns early only `if (expanded || blocked)`. The close button is 23×23 (see {{18}}). There's no swipe to dismiss.

## Suspected cause (optional)

Confident about the code; the observed sequence on a device is inferred from the Pointer Events spec. Fix direction: on `pointerType === "touch"`, a tap on the stack toggles `expanded` (and pauses), a tap outside collapses it, and `focus-within` also pauses (it may already, via `blocked`; worth checking). Add a horizontal swipe to dismiss the front toast, with `touch-action: pan-y` on the toast so vertical page scroll still works. Under `(pointer: coarse)` and the compact breakpoint, a full-width stack (minus `space-2`) at the bottom with safe-area padding ({{09}}) fits the phone better than the 360px corner card.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass (source audit of hover-only behaviour).
