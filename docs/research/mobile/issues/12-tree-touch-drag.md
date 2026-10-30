<!--
title: Tree: rows can't be moved by touch
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

On a touch screen a `Tree` row (with `onMove`) can't be dragged to a new place: a vertical finger drag scrolls instead. The same drag with a mouse moves the row.

**Kind:** keyboard / screen reader (input modality)

## Where

| | |
|---|---|
| Component | `Tree` |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system preview (`build/previews.txt`, section `Tree`) |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Chromium via Playwright with touch emulation, CDP `Input.dispatchTouchEvent`, 375 CSS px, macOS. Not checked on a device |
| Schemes affected | daylight checked; not scheme-specific |
| Modes affected | touch |

## Steps to reproduce

```sh
cd build && ACT='(async()=>{const s=await page.context().newCDPSession(page);await s.send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:5});const t=(type,x,y)=>s.send("Input.dispatchTouchEvent",{type,touchPoints:type==="touchEnd"?[]:[{x,y}]});const c=await page.locator(".alt-tree-row").nth(1).boundingBox();const before=await page.locator(".alt-tree").innerText();await t("touchStart",c.x+80,c.y+10);for(let i=1;i<=12;i++){await t("touchMove",c.x+80,c.y+10+10*i);await page.waitForTimeout(16);}await t("touchEnd");await page.waitForTimeout(700);console.log("moved:",before!==await page.locator(".alt-tree").innerText());})()' node shoot.mjs Tree daylight 375
# prints "moved: false"; the same path with page.mouse moves the row
```

1. Touch "Logo usage" and drag it down 120px, past "Typography".
2. It doesn't move.

## Expected

The preview says "Or drag it onto a folder." Constraint M5 in {{01}}: on touch, a press-and-hold picks the row up, a swipe without a hold scrolls, and a non-drag path exists for people without a keyboard (WCAG 2.5.7). Today the non-drag path is keyboard-only (Space, arrows), which a phone user doesn't have. A "Move to…" item in the row's menu would cover it.

## Actual

Touch drag: no carry, no ghost, order unchanged. Mouse drag, same coordinates: the row moves.

## Suspected cause (optional)

Fairly confident. `.alt-tree-row` has `touch-action: pan-y` (`bundle.css:3214`), so a vertical gesture belongs to the browser, which pans and sends `pointercancel`. `startPointer` (`tree.tsx:297`) listens for `pointercancel` and abandons the move. A vertical drag is the only direction a tree moves in, so it's blocked exactly where it's needed. Fix direction: the same hold-to-pick-up as {{11}} (≈ 400ms, ≤ 10px), then claim the gesture; keep `pan-y` before the hold completes so swipes still scroll.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass, driving the drag components with touch.
