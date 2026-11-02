# Mobile

A phone is a finger, 320–430 CSS px of width, an on-screen keyboard and a notch. None of that changes what height means. **The ground is the record, at any size.** What changes is where things come from and how big they are to touch.

Altitude assumed a mouse in places the guide never said: hover was the first signal, some things were revealed only by hover, moving things meant dragging, and floating panels assumed room to float. A finger lands and presses in one motion, has to pick a thing up before it can carry it, covers what it touches, and the screen's edge is close. These are the laws, restated for the hand.

## The laws for the hand

1. **Press is the first signal.** A finger has no hover, so on touch the press *is* the feedback: the slab goes to ground the moment the finger lands. Hover lift exists only under `@media (hover: hover)`, so nothing stays raised after the finger has gone.
2. **Nothing is hover-only.** Whatever a pointer can reveal, a finger can reach: by a tap, a long press, a visible control or focus. Hover may preview; it never gates. A timer that pauses for a hovering reader pauses for a touching one (`Toaster` fans out and pauses on a tap).
3. **Faces are sized for eyes, hit areas for fingers.** The visible slab keeps its size and tier. Its hit area grows to 44×44 CSS px under a coarse pointer, and is never under 24×24 anywhere. Where whole controls must grow (fields, rows, menu items) they grow together, by one density step from the `size` tokens.
4. **Pick it up before you carry it.** On touch a swipe belongs to the page. A thing is lifted into your hand (level 3, as with a mouse) only after a press-and-hold, then carried. "In your hand" begins when the hand closes on it. A grip may pick up at once, because it is a handle and nothing else.
5. **The page scrolls one way.** At 320 CSS px nothing scrolls the page sideways. Content that needs two dimensions (a table, code, a board) scrolls in its own frame. Content that doesn't fit changes form (a pane becomes one at a time, a week becomes a day, a trail collapses, tabs scroll) and never shrinks into ellipses or one letter per line.
6. **The screen's edge is part of the ground.** Floating things stay inside the visible viewport: they flip, then shift, then shrink. On a narrow touch screen a menu or select may come up from the bottom edge as a sheet, where the thumb is: same tier, same meaning, different edge. Fixed layers respect the safe area and the keyboard.
7. **Fields don't move the page.** Field text is at least 16px on touch, so the browser never zooms on focus, with no `maximum-scale` workaround. Overlays size to what's visible above the keyboard.
8. **Hints match the hands.** Keyboard shortcuts are shown where there's a keyboard. Behaviour is never removed: the shortcut still works when its hint is hidden.
9. **Height still reads small.** Tiers, shadows and the attention budget don't shrink on a phone.
10. **Space steps down; it doesn't stack.** A desktop's insets, repeated at every level of nesting (page, frame, card, message, indent), leave a phone's text a column down the middle. Below the compact breakpoint each inset eases one step toward `space-4`: the page gutter, a dialog and a sheet from 24px, a card from 20px. An indent that aligns detail to a heading gives way to one small step in a narrow slot. Gaps between components stay as they are: grouping is meaning, padding is chrome.

## The constraints

Each is testable, and each names what holds it.

| # | Constraint | How it's met | Checked by |
|---|---|---|---|
| **M1** | No sideways page scroll at 320 CSS px; nothing outside a scroll container reaches past the viewport. | container queries and narrow forms (below) | `checks/phone.mjs` (warns) |
| **M2** | Targets ≥ 24×24 CSS px everywhere (or WCAG 2.5.8's spacing exception), ≥ 44×44 under `(pointer: coarse)`, by hit area. Inline text links are exempt. | `size-target-min`; `::after` hit areas on small controls; one density step on coarse pointers | `checks/phone.mjs`, `checks/density.mjs` |
| **M3** | Hover styles only under `@media (hover: hover)`. | every `:hover` rule wrapped | `checks/hover-media.mjs` |
| **M4** | Nothing reachable only by hover. | tools shown under `(hover: none)`; tap paths for `Toaster` and `Schedule` events | `checks/toaster-touch.mjs`, `checks/touch-drag.mjs`, `checks/schedule-narrow.mjs` |
| **M5** | Every drag works with touch. Pick-up after a hold (400ms, ≤ 8px of movement, close to `ContextMenu` and `ChartTooltip`); a swipe without a hold scrolls; `touch-action: none` only on a handle or a gesture-only surface, never a row, card or list. | `touchHold` in `core.tsx`, used by `SortableList`, `Board` and `Tree` | `checks/touch-drag.mjs` |
| **M6** | Field text ≥ 16px under `(pointer: coarse)`. | `max(16px, 1em)` on fields under a coarse pointer | `checks/phone.mjs` (fails CI) |
| **M7** | Floating panels stay inside the visual viewport with an 8px margin; on narrow touch screens a menu may open as a bottom sheet. | `useFitFloating`; `presentation` on `DropdownMenu`, `Select`, `Combobox` | `checks/float-fit.mjs`, `checks/menu-sheet.mjs` |
| **M8** | Overlays size to the visible viewport. | `--alt-vvh` and `--alt-vv-top` from `visualViewport`, falling back to `100dvh` | `checks/visible-viewport.mjs` |
| **M9** | Fixed layers add `env(safe-area-inset-*)`. | `Toaster`, `SaveBar`, `Sheet`, `Dialog` | `checks/safe-area.mjs` |
| **M10** | Components respond to their container at the shared narrow width, not the viewport. | `breakpoint-narrow` (480px) and `breakpoint-compact` (640px); only these appear in width queries | `checks/density.mjs` |
| **M11** | Insets step down on a phone: the page gutter, a dialog's and a sheet's inset 16px, a card's 16px, at 375 CSS px; unchanged from 640px up, a narrow card included. What reaches through an inset (a page header, a sheet's header and footer, a folder tab strip) lines up with it. | `--alt-inset-page` and `--alt-inset-box`, which follow the viewport like a density; Trace detail's indent follows its step's width | `checks/narrow-insets.mjs` |

## Narrow forms

Under 480px of its own width, each of these changes form rather than squeezing.

| Component | Narrow form | Opt out |
|---|---|---|
| `Tabs` | the list scrolls within itself, fading the edge with more tabs | n/a |
| `Breadcrumb` | middle steps collapse behind "…" until the trail fits | `fit="wrap"` |
| `Stepper` | `orientation="auto"` goes vertical when the row doesn't fit | `orientation="horizontal"` (the default) |
| `PropertyList` | labels stack over values; proposals stack their parts | n/a |
| `ItemGroup` | `ItemActions` move under the content | `narrow="inline"` |
| `ResizablePanelGroup` | one pane at a time (`narrowPanel`), or stacked | `narrow={false}` |
| `Schedule` | one day at a time, paged by day | `narrowView={false}` |
| `DataTable`, `DataGrid` | columns keep 6rem (or `minWidth`) and the table scrolls in its frame; `sticky` columns stay | n/a |
| `InputOTP` | slots give way to a 28px floor | n/a |

## Input modality

Read modality from media queries (`hover`, `pointer`, `any-pointer`), never from the user agent. `useKeyboardLikely()` says whether a keyboard is probably in hand (a fine pointer, or a key pressed since load). Approach (see **Motion**) follows a mouse or pen, never touch.

## Still open

These were found in the same audit and are not done yet: auto-scrolling a `Board` while a card is carried near its edge; a non-drag "Move to…" path for `Tree`, `Board` and `SortableList` for people with neither keyboard nor fine pointer (WCAG 2.5.7); `Schedule`'s day strip, tap-to-create and press-and-hold to move; `ItemActions` folding into a menu; `DataTable`'s stacked-record form and column `priority`; pixel `minSize` on resizable panes. The phone check still warns on a few pattern previews at 320px.

## Sources

WCAG 2.2: 1.4.10 Reflow, 1.4.13 Content on Hover or Focus, 2.5.1 Pointer Gestures, 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum), and 2.5.5 Target Size (Enhanced) as the coarse-pointer target. Media Queries Level 4 (`hover`, `pointer`) and CSS Containment Level 3 (container queries). The measurements behind each rule are in **Research**, E110–E131.
