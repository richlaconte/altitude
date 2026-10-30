<!--
title: Board: cards can't be moved by touch
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

On a touch screen a `Board` card can't be dragged to another place: the finger drag does nothing, with or without holding first. The same drag with a mouse moves the card. The card tools (rename and so on) are also invisible on touch, because they appear only on hover.

**Kind:** keyboard / screen reader (input modality)

## Where

| | |
|---|---|
| Component | `Board` (`BoardColumn`, `BoardCard`) |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system preview (`build/previews.txt`, section `Board`) |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Chromium via Playwright with touch emulation, events sent through CDP `Input.dispatchTouchEvent` (so pointer events arrive with `pointerType: "touch"`), 375 CSS px, macOS. Not checked on a device |
| Schemes affected | daylight checked; not scheme-specific |
| Modes affected | touch |

## Steps to reproduce

```sh
cd build && ACT='(async()=>{const s=await page.context().newCDPSession(page);await s.send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:5});const t=(type,x,y)=>s.send("Input.dispatchTouchEvent",{type,touchPoints:type==="touchEnd"?[]:[{x,y}]});const c=await page.locator("[data-board-card]").first().boundingBox();const before=await page.locator("[data-board-col]").first().innerText();await t("touchStart",c.x+40,c.y+20);await page.waitForTimeout(600);for(let i=1;i<=12;i++){await t("touchMove",c.x+40+20*i,c.y+20+4*i);await page.waitForTimeout(16);}await t("touchEnd");await page.waitForTimeout(700);console.log("moved:",before!==await page.locator("[data-board-col]").first().innerText());})()' node shoot.mjs Board daylight 375
# prints "moved: false". The same path with page.mouse moves the card ("moved: true").
```

1. Touch "Write release notes" in To do, hold 600ms, drag right into In progress, lift.
2. The card stays in To do. Without the hold, same result.
3. Look for the card tools: they never appear.

## Expected

The preview says "Drag a card, or focus one and press Space, then the arrow keys." Dragging should work with a finger. Constraint M5 in {{01}}: on touch, a press-and-hold picks the card up (it lifts to level 3, as a mouse pick-up does), a swipe without a hold scrolls the board, and dragging has a non-drag path (here the keyboard path exists, but touch users without a keyboard need a visible "Move to…" action; WCAG 2.5.7). Constraint M4: the card tools must be reachable without hover.

## Actual

- Touch drag, with or without a 600ms hold: card doesn't move; no "Picked up" announcement.
- Mouse drag, same harness and coordinates: card moves.
- Card tools: `opacity: 0` until `:hover`/`:focus-within` (`bundle.css:3520–3521`), no `(hover: none)` rule.

## Suspected cause (optional)

Fairly confident. `onPointerDown` (`collections.tsx:725`) captures the pointer, but `.alt-board-card` (`bundle.css:2352`) sets no `touch-action`, and `.alt-board` is `overflow-x: auto`. So the browser claims the touch for panning and sends `pointercancel`, which `BoardCard` maps to `onPointerUp` (`collections.tsx:999`), ending the drag before it starts. Fix direction: on `pointerType === "touch"`, start a hold timer (≈ 400ms, cancelled by > 10px movement, like `ContextMenu`); when it completes, lift the card and set `touch-action: none` on it for the rest of the gesture (a non-passive `touchmove` `preventDefault()` is the reliable way once the gesture has started); auto-scroll the board near its edges. Show the card tools under `(hover: none)`, and add "Move to…" to them.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass, driving the drag components with touch.
