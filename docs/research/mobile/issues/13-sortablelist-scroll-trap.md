<!--
title: SortableList: a swipe on a row reorders it instead of scrolling the page
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

On a touch screen, a vertical swipe that starts on a `SortableList` row picks the row up and moves it; the page doesn't scroll. A list that fills the screen traps the page, and every attempt to scroll reorders the list.

**Kind:** keyboard / screen reader (input modality)

## Where

| | |
|---|---|
| Component | `SortableList` |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system preview (`build/previews.txt`, section `SortableList`), with the page made taller than the viewport |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Chromium via Playwright with touch emulation, CDP `Input.dispatchTouchEvent`, 375×300 CSS px, macOS. Not checked on a device |
| Schemes affected | daylight checked; not scheme-specific |
| Modes affected | touch |

## Steps to reproduce

```sh
cd build && ACT='(async()=>{await page.setViewportSize({width:375,height:300});await page.evaluate(()=>document.body.style.paddingBottom="1500px");const s=await page.context().newCDPSession(page);await s.send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:5});const t=(type,x,y)=>s.send("Input.dispatchTouchEvent",{type,touchPoints:type==="touchEnd"?[]:[{x,y}]});const c=await page.locator(".alt-sort-item").nth(2).boundingBox();const before=await page.locator(".alt-sort").innerText();await t("touchStart",c.x+150,c.y+20);for(let i=1;i<=12;i++){await t("touchMove",c.x+150,c.y+20-17*i);await page.waitForTimeout(16);}await t("touchEnd");await page.waitForTimeout(700);console.log("scrollY:",await page.evaluate(()=>scrollY),"reordered:",before!==await page.locator(".alt-sort").innerText());})()' node shoot.mjs SortableList daylight 375
# prints "scrollY: 0 reordered: true"
```

1. On a phone, with a sortable list taller than the screen, put your thumb on a row and swipe up to scroll.
2. The row moves up the list; the page stays where it was.

## Expected

Constraint M5 in {{01}}: "a swipe without a hold scrolls; `touch-action: none` only on a handle or a gesture-only surface, never a row, card or list." The rows show a grip (⠿); on touch that grip, or a press-and-hold anywhere on the row, should pick it up.

## Actual

`scrollY` stays 0; the row is reordered.

## Suspected cause (optional)

Confident. `.alt-sort-item { … touch-action: none; cursor: grab }` (`bundle.css:1947`) applies to the whole row, so the browser never gets to scroll. Fix direction: `touch-action: none` on the grip only (and give it a 44px hit area under coarse pointers, {{02}}), and on the rest of the row a hold-to-pick-up as in {{11}}, with `pan-y` until the hold completes.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass, driving the drag components with touch.
