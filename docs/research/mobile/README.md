# Altitude on a phone: research, philosophy and constraints

October 2026 · a design research pass over every component at phone width and with touch, ending in a design philosophy, ten testable constraints and a set of issues ([issues/](issues/)).

**The question.** Altitude was designed with a mouse in mind: hover climbs a level, openings deepen as the pointer approaches, menus drop from where you clicked, and things are carried by dragging. What does "height is the interface" mean when the pointer is a finger, the screen is 375px wide, and a keyboard can cover half of it? And what has to change so that every component works there?

**The short answer.** The elevation model survives intact, and on a phone it is arguably clearer, because there's less on screen competing for height. What doesn't survive is everything Altitude quietly hangs on the pointer: **hover as the first signal, hover as the way to reveal things, drag as the way to move things, and the assumption that a floating panel has room to float.** On a phone a finger arrives and presses in one motion, it has to pick a thing up before it can carry it, it covers what it touches, and the edge of the screen is close by. The proposals give each of these a touch path that keeps the same meaning: **press is the first signal, nothing is hover-only, picking up is a hold, and the overlay tier comes up from the bottom edge.**

---

## 1. Method

| Step | What was done |
|---|---|
| Read the system | `project/README.md`, `Elevation.md`, `Motion.md`, `Charts.md`, `Research.md` (every touch, narrow and hover mention), `framework/principles.md`, `CONTRIBUTING.md`, `AGENTS.md`, the issue templates, the previous research pass (`docs/research/charts/`). |
| Audited the CSS | `project/components/bundle.css` (3,638 lines): media queries, `:hover` rules, `touch-action`, fixed positioning, viewport units, safe-area insets, control heights, field font sizes. |
| Rendered every preview as a phone | A Playwright script (Chromium, `playwright-core` from `build/`) opened all 129 `preview.html` files, injected as `shoot.mjs` does, at **375×max(h,640) CSS px, `deviceScaleFactor: 2`, `isMobile: true`, `hasTouch: true`**, Daylight, 900ms settle. For each it measured document overflow, elements past the right edge outside a scroll container, every interactive element's hit box (a native checkbox or switch measured through its label, a text input through its `.alt-input` frame), and the computed font size of every text field. Screenshots were read as contact sheets. Commit `f32b92b` (`package.json` 0.2.1). No page errors in any preview. |
| Drove touch | Chrome DevTools Protocol `Input.dispatchTouchEvent` (real `touchstart`/`touchmove`/`touchend`, so pointer events arrive with `pointerType: "touch"`) on `Board`, `Tree`, `SortableList`; `page.touchscreen.tap` on `Tooltip` and `HoverCard`. The same `Board` and `Tree` drags with a mouse as the control. |
| Read the source | Every `pointerType`, `onPointerEnter`, `matchMedia`, `innerWidth`/`innerHeight` and `touch-action` in `project/components/src`. |
| Literature | Touch target size, touch accuracy, grip and reach, and the WCAG 2.2 criteria that touch hits hardest (§6). |
| Prior issues | `gh issue list --state all --search` for mobile, touch, responsive, narrow, phone, viewport, tap, hover: #6, #26 and #27 fixed individual narrow-width bugs; #119 (`AppShell`) and #146 (`NotificationCenter`) added the only two narrow-screen modes. No issue covers mobile as a whole. |

Not done: **no real device.** Nothing was run on iOS Safari or Android Chrome, so the iOS focus zoom (§3, F5) and the on-screen keyboard behaviour (F7) are well-documented platform behaviour, not observations. Touch was emulated in Chromium; emulated touch reproduces pointer-event and `touch-action` behaviour faithfully but not momentum scrolling, the long-press callout or text selection. No VoiceOver or TalkBack pass. Only Daylight was rendered at phone width (none of the findings depend on the scheme).

## 2. What's already right (keep it)

- **Approach never runs for touch.** The shared tracker in `core.tsx` ignores `pointerType === "touch"` (`Motion.md`, "Anticipation"; `Elevation.md`: "only near the pointer, never for touch"). This is exactly the right instinct and the philosophy below generalises it.
- **Two components already change form when narrow.** `AppShell`'s sidebar becomes a `Sheet` drawer below 768px; `NotificationCenter`'s panel becomes a `Sheet` below 640px. Both keep their tier and meaning and just change where they come from.
- **Long press where a right-click would be.** `ContextMenu` opens on a 500ms touch hold that doesn't move more than 10px; `ChartTooltip` opens on a 250ms hold so a quick swipe still scrolls, scrubs on drag, and stays after lifting (Research.md, ChartTooltip review).
- **Charts let the page scroll.** `.alt-chart-plot { touch-action: pan-y }`, and `Heatmap` re-wraps its weeks and hours to the width it has (verified at 375px).
- **One hover-only reveal already has its touch fallback**: `@media (hover: none) { .alt-inline-edit-pencil { opacity: 1 } }`.
- **The bottom sheet exists**: `Sheet side="bottom"` with a pull handle, `touch-action: none` only on the handle.
- **Most forms already reflow.** Field stacks, cards, `Alert`, `Confirmation`, `PlanPicker`, `Stat`, `CodeBlock`, `Timeline`, `Trace`, `Conversation` and the charts all read well at 375px with no change.

## 3. Findings

### F1 · Hover is the first signal, and on touch it sticks
`bundle.css` has **98 `:hover` rules and none is inside `@media (hover: hover)`**. On a touch screen a tap fires `:hover`, and mobile browsers keep it until the next tap elsewhere. A button you tapped stays lifted at +1 level after it has done its job, which says "you're pointing at this" when nobody is. That contradicts law 4 ("Pressing returns it to ground") and the hover-is-a-promise rule. → issue 03.

### F2 · Targets are sized for a mouse
Of **1,076 interactive targets** across the previews at 375px, **951 (88%) are smaller than 44×44 CSS px** in at least one dimension, the size Apple's HIG and WCAG 2.5.5 (AAA) name, and smaller than Material's 48dp. The defaults explain it: `Button` 36px tall (`sm` 30), `Input` 40 (`sm` 34), `Tabs` triggers 30, `Switch` 24, `Sidebar` items 34, `Tree` rows 32. There are no size or density tokens in `tokens.json` at all, so nothing can grow under a coarse pointer.

**279 targets are under 24px**, the WCAG 2.2 AA floor (2.5.8). 200 of those are `Schedule`'s 11px slot cells. The rest: `NumberInput` steppers 24×15 (stacked, touching), `TimeInput`/`DatePicker` segments ~21×22, `Slider` thumbs 20×20, `ChartBrush` grips 10×24, `TagInput` remove 20×20, `Toaster` close 23×23, `InlineCitation` markers 16×16, `AILabel` badges 22 tall, `Alert`'s "+2 more" 22 tall, `<summary>` disclosures 17–20 tall, `Resizable` handle 1px wide. → issues 02, 18.

### F3 · Content revealed only by hover
- `HoverCard` filters out touch entirely (`overlays.tsx:242`). It's documented as supplementary, so that's allowed, but nothing says it in the touch terms people need.
- `Toaster` fans out and **pauses its timers** only while hovered (`overlays.tsx`, `onPointerEnter`/`onPointerLeave`). On touch the stack expands on the tap and collapses as the finger lifts, so a person reading a toast on a phone can't stop it closing. → issue 10.
- `Board` card tools and `Schedule`'s resize handle are `opacity: 0` until `:hover`/`:focus-within` (`bundle.css:3521`, `:3393`), with no `(hover: none)` fallback. → issues 11, 14.

### F4 · Drag is the only path on touch, and it doesn't work
Driven with real touch events at 375px:

| Component | Mouse drag | Touch drag | Touch drag after a 600ms hold |
|---|---|---|---|
| `Board` (card to the next column) | moves | **doesn't move** | **doesn't move** |
| `Tree` (row down two places) | moves | **doesn't move** | n/a |
| `SortableList` (vertical swipe on a row, page taller than the screen) | n/a | **reorders, page doesn't scroll** | n/a |

`Board` captures the pointer but sets no `touch-action`, so the browser takes the gesture for panning and cancels the pointer. `Tree` sets `touch-action: pan-y`, so a vertical drag (the only direction a tree moves in) becomes a scroll. `SortableList` has the opposite problem, `touch-action: none` on the **whole row** (`bundle.css:1947`), so a list that fills the screen traps the page. All three have keyboard paths; none has a touch path that coexists with scrolling. → issues 11, 12, 13.

### F5 · Field text is 14px, so iOS zooms the page into every field
Every text field renders its text at 14px (`.alt-input input, .alt-input textarea { font: 400 14px/20px … }`, `bundle.css:183`); `SecretField` is 13.5px, native selects 12.5–13.3px. Measured in 23 previews. iOS Safari zooms the page when a field with text under 16px is focused, and doesn't zoom back. The usual workaround (`maximum-scale=1`) disables pinch zoom and fails WCAG 1.4.4, so it has to be fixed in the components. → issue 07.

### F6 · Floating panels assume there's room
`.alt-pop` is positioned `left: 0` or `right: 0` from its anchor with `min-width: 220px` and no collision handling (`bundle.css:784`). At 375px the `DropdownMenu` preview's right-hand menu runs 86px past the screen, `HoverCard` 26px, and the open `Tooltip` sits 5px from the left edge. `Select`'s list is `max-width: max(100%, 360px)`. None of `Popover`, `DropdownMenu`, `HoverCard`, `Tooltip`, `Select`, `Combobox` or `DatePicker` flips or shifts. On a phone they should usually not be anchored panels at all. → issues 05, 06.

### F7 · Overlays size to the layout viewport
`Dialog` is `max-height: calc(100vh - 48px)` (`bundle.css:824`), `CommandPalette` `max-height: min(380px, 52vh)` with `12vh` top padding (`:2033`, `:2048`). Nothing reads `visualViewport` or uses `dvh`/`svh`. On iOS `100vh` is the *largest* viewport (toolbars retracted), and the on-screen keyboard shrinks only the visual viewport, so a dialog's footer, where its primary action sits, can be under the keyboard while you type in the dialog's field. → issue 08.

### F8 · Fixed layers ignore the safe area
There is no `env(safe-area-inset-*)` anywhere. `Toaster`, `SaveBar`, `Sheet side="bottom"`, `Tour` and the `AltitudeProvider mode` frame are all fixed at `space-4`/`space-6` from the edges. In an app that sets `viewport-fit=cover` (any installed PWA, any app that wants edge-to-edge), they sit under the home indicator or the notch. → issue 09.

### F9 · Layouts that don't reflow
At 375px, WCAG 1.4.10 (Reflow) asks for no two-dimensional scrolling except for content that needs it (tables, maps, code).

| Component | What happens at 375px | Issue |
|---|---|---|
| `PropertyList` proposals | value column ~35px wide: "Quali/fied", "€12,0/00", "Propos/ed by/Assista/nt" | 15 |
| `Schedule` | five day columns of ~55px; events read "Sta…", "D", "C"; slots 11px tall | 14 |
| `Tabs`, `SavedViews` | the tab list overflows the page by 15–47px | 16 |
| `DataTable`, `DataGrid` | columns squeeze to ellipses ("Des…", "Acti") or wrap dates over two lines | 17 |
| `InputOTP` | an 8-character code overflows by 11px | 23 |
| `Breadcrumb` | wraps onto two or three lines instead of collapsing | 20 |
| `Stepper` (horizontal) | wraps with dangling connector lines | 21 |
| `Resizable` (horizontal) | the first pane is squeezed to ~80px | 22 |
| `ItemGroup` | row actions leave the content ~95px; URLs break every 9 characters | 24 |

Six more previews overflow because the preview itself hard-codes a desktop width (`Await` 440px, `Skeleton` 420px, `Stepper`'s `300px 1fr` grid, `Contrast`, `CommandPalette`'s 280px field, `Signals`' 4-column grid). That's not a component bug, but it means the previews can't show phone behaviour. → issue 04.

### F10 · Keyboard hints on a device without a keyboard
`DropdownMenu` shortcuts (`.alt-menu-shortcut`), the `CommandPalette` footer ("↑↓ Move, ↵ Choose, esc Close"), `Tooltip` contents such as "Bold ⌘B" and `Kbd` itself all render on touch-only devices, where they're noise in a narrow row. → issue 19.

### F11 · Breakpoints are ad hoc
The four width rules in the system use four different numbers: `AppShell` 768 (a prop), `NotificationCenter` 640 (a prop), `SavedViews` 640, `DatePicker` 560, `Pagination` 480 (CSS). There are **no container queries**, though components live in cards, sheets and side panes whose width has nothing to do with the viewport's. → issues 01, 02.

## 4. The philosophy: the ground is the record, at any size

The one idea doesn't change on a phone. Settled things sit on the ground, live things rise, openings sink. What changes is the *hand*. A mouse hovers, travels, and can point at a 16px target. A finger lands and presses in one motion, covers what it touches, lands a few millimetres from where its owner aimed (Holz & Baudisch), mostly holds the phone at the same time (Hoober), and reaches some of the screen more easily than the rest (Bergstrom-Lehtovirta & Oulasvirta). Each principle below is a law Altitude already has, restated for that hand.

1. **Press is the first signal.** With a mouse, hover (+1) promises and press (to 0) confirms. A finger has no hover, so on touch the press *is* the feedback and must be immediate: the slab goes to ground the moment the finger lands. Hover lift only exists where hover does (`@media (hover: hover)`), so nothing stays raised after the finger has gone. *(Law 4, made true for touch.)*

2. **Nothing is hover-only.** Whatever a pointer can reveal, a finger can reach: by a tap, a long press, a visible control or a focus. Hover may *preview*; it never *gates*. Timers that pause for a hovering reader pause for a touching one. *(Law 7, "height never travels alone", extended: hover never travels alone either.)*

3. **Faces are sized for eyes, hit areas for fingers.** The visible slab keeps its size and tier, because density and hierarchy are information. Its hit area grows to 44×44 CSS px under a coarse pointer, and never falls below 24×24 anywhere. Where a whole control has to grow (fields, rows, menu items), it grows by one density step, consistently, from tokens.

4. **Pick it up before you carry it.** On touch, a swipe belongs to the page: it scrolls. A thing is lifted into your hand (level 3, the same lift as today) only after a press-and-hold, and then it can be carried. This is the elevation model taken literally: "in your hand" begins when the hand closes on it. Every drag also has a path that isn't a drag (keyboard and a visible move action), because dragging is an accelerator, never the only way (WCAG 2.5.7).

5. **The page scrolls one way.** At 320 CSS px nothing makes the page scroll sideways. Content that genuinely needs two dimensions (a table, a code block, a board, a schedule) scrolls inside its own frame, which says so at its edge. Content that doesn't fit *changes form*, as `AppShell` and `NotificationCenter` already do: columns stack, a week becomes a day, a horizontal stepper becomes vertical, a trail collapses. It never shrinks into ellipses or one letter per line.

6. **The screen's edge is part of the ground.** Floating things stay inside the visible viewport, flipping and shifting rather than spilling. On a narrow touch screen the overlay tier comes **up from the bottom edge**: menus, selects, pickers and panels open as bottom sheets, where the thumb already is and where nothing has to be pointed at precisely. The tier and its meaning are the same (a sheet is level 4, a menu level 3); only the edge it rises from changes. Fixed layers respect the safe area and the keyboard.

7. **The primary action is within reach.** On a phone the primary action sits where a thumb reaches it: a dialog's and a sheet's footer stack full-width with the primary action nearest the bottom, `SaveBar` stays at the bottom edge, and a page's one primary action can dock there. Still one primary per view, still level 2.

8. **Fields don't move the page.** Typing never zooms the page or hides the field. Field text is at least 16px on touch, and the field you're in, and the action that commits it, stay above the keyboard.

9. **Hints match the hands.** Keyboard shortcuts are shown where there's a keyboard, and touch hints ("Press and hold to move") where there's touch. Neither is shown to the other. Behaviour is never removed: a phone with a hardware keyboard still gets every shortcut.

10. **Height still reads small.** Tiers, shadows and the attention budget don't shrink on small screens. One level 5, at most one thing rising at a time, and a sheet is still above a menu. What changes on a phone is where things come from and how big they are to touch, never what their height means.

### Rules it strains

- **"Openings anticipate"** has no touch equivalent, by design. The field's focus state carries all of it on touch. No change proposed.
- **"Hover: +1 level"** becomes "+1 level *where there's hover*". The tiers don't change; only the motion level that hover used is unavailable on touch. That's consistent with "tiers carry meaning, levels carry motion".
- **Menus at level 3 vs. sheets at level 4.** If a narrow `DropdownMenu` opens as a bottom sheet, is it a menu (3) or a sheet (4)? Proposal: it keeps the **menu's** level-3 surface and shadow, built as a sheet without a scrim. It's still the same temporary choice, so it shouldn't climb a tier just because it moved edges. Open question for issue 06.

## 5. Constraints (testable)

Each constraint is something a check can fail. They're numbered so issues and future reviews can cite them, as the chart rules are.

| # | Constraint | Applies to | How it's checked |
|---|---|---|---|
| **M1** | **No sideways page scroll at 320 CSS px.** `documentElement.scrollWidth ≤ innerWidth`; nothing outside a scroll container extends past the viewport. | every component and preview | phone audit at 320 and 375 |
| **M2** | **Targets ≥ 24×24 CSS px everywhere** (or the WCAG 2.5.8 spacing exception), **≥ 44×44 under `(pointer: coarse)`**, by hit area, not necessarily by face. Inline text links are exempt. | every control | phone audit, `isMobile` + `hasTouch` |
| **M3** | **Hover styles only under `@media (hover: hover)`.** No `:hover` rule outside it, except ones that don't change height, colour or visibility. | `bundle.css` | a CSS lint in CI |
| **M4** | **Nothing is reachable only by hover.** Every hover-revealed control, preview or pause has a tap, long-press, focus or always-visible path on `(hover: none)`. | overlays, reveals, timers | ACT checks with `touchscreen.tap` |
| **M5** | **Every drag works with touch, and has a non-drag path.** Touch pick-up after a hold (≈ 250–500ms, ≤ 10px movement, matching `ContextMenu` and `ChartTooltip`); a swipe without a hold scrolls; `touch-action: none` only on a handle or a surface whose only job is the gesture (a slider track, a colour area), never on a row, card or list. | `Board`, `Tree`, `SortableList`, `Schedule`, `Table` rows, `Resizable`, `Sheet` | CDP touch drag in ACT checks |
| **M6** | **Field text ≥ 16px under `(pointer: coarse)`.** No `maximum-scale` or `user-scalable=no` workaround. | `Input` and every field built on it | phone audit |
| **M7** | **Floating panels stay inside the visual viewport** with an 8px margin: flip side, then shift, then constrain size. On narrow touch screens, menus, lists and pickers may open as bottom sheets. | `Popover`, `DropdownMenu`, `HoverCard`, `Tooltip`, `Select`, `Combobox`, `DatePicker`, `ContextMenu`, `Tour` | phone audit + ACT open |
| **M8** | **Overlays size to the visible viewport** (`dvh`, or `visualViewport` where the keyboard matters), and the focused field and the footer's primary action stay visible while typing. | `Dialog`, `Sheet`, `CommandPalette`, `SaveBar` | `dvh` in CSS; manual device check |
| **M9** | **Fixed layers add `env(safe-area-inset-*)`** to their edge offset. | `Toaster`, `SaveBar`, `Sheet`, `Tour`, mode frame | CSS lint |
| **M10** | **Components respond to their container, not the viewport**, using container queries at the shared narrow width (proposed 480px for a component, 640px for page-level chrome), or a `layout` prop where JS has to decide. | all layout-bearing components | phone audit with the component in a 320px container |

### Mechanism (proposed in issues 01 and 02)

- **Input modality from media queries, not user-agent sniffing**: `(hover: hover)`, `(hover: none)`, `(pointer: coarse)` and `(any-pointer: fine)` (Media Queries Level 4). A laptop with a touch screen gets hover styles *and* big hit areas only where they apply.
- **A density step from tokens**: new `size-*` tokens (control heights, the minimum hit area) with a coarse-pointer value, so `Button`, `Input`, menu items, rows and tabs grow together, and an `AltitudeProvider density="comfortable"` override for apps that want it everywhere.
- **Container queries** for component layout (`container-type: inline-size` on the component root), so `PropertyList` stacks inside a narrow side panel on a desktop too.
- **Two shared widths** in `tokens.json` so the ad hoc numbers converge: `breakpoint-narrow` (480, components) and `breakpoint-compact` (640, page chrome such as `AppShell`'s default, if its maintainers agree to move from 768).

## 6. Sources

- **Target size for thumbs.** Parhi, Karlson & Bederson, "Target size study for one-handed thumb use on small touchscreen devices", MobileHCI 2006, [doi:10.1145/1152215.1152260](https://dx.doi.org/10.1145/1152215.1152260): 9.2mm for discrete targets and 9.6mm for serial ones were sufficient for one-handed thumb use; smaller targets cost speed and accuracy. 9.2mm is ≈ 35 CSS px at a typical phone's ~163 CSS px/inch, so 44 CSS px leaves margin for the edges, where accuracy is worst.
- **Touch accuracy at scale.** Henze, Rukzio & Boll, "100,000,000 taps: analysis and improvement of touch performance in the large", MobileHCI 2011 (best paper; [eprint](https://eprints.lancs.ac.uk/id/eprint/57576)): 120 million touches from 91,731 installs; touch positions are systematically skewed, and a compensation function cut the error rate by 7.79%.
- **Why fingers miss.** Holz & Baudisch, "The generalized perceived input point model and how to double touch accuracy by extracting fingerprints", CHI 2010, [doi:10.1145/1753326.1753413](https://christianholz.net/generalized_perceived_input_point_model): most touch inaccuracy previously blamed on "fat fingers" (67%) comes from the offset between where a person perceives the touch and where the device registers it, which varies with finger posture. Hence hit areas larger than faces, and no precision-dependent targets.
- **How phones are held.** Hoober, "How do users really hold mobile devices?", UXmatters, February 2013, [uxmatters.com](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php): of people observed touching their phones, 49% used one hand, 36% cradled it (two hands holding, one touching) and 15% used two hands, often with the other hand busy.
- **What a thumb can reach.** Bergstrom-Lehtovirta & Oulasvirta, "Modeling the functional area of the thumb on mobile touchscreen surfaces", CHI 2014: the reachable area depends on surface size, hand size and grip, which is why the bottom of the screen, not a fixed "thumb zone" diagram, is the safe default for primary actions and sheets.
- **WCAG 2.2.** [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) (320 CSS px, no two-dimensional scrolling except where needed); [1.4.4 Resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text); [1.4.13 Content on hover or focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus); [2.5.1 Pointer gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures); [2.5.5 Target size (enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced) (44×44, AAA); [2.5.7 Dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) (a single-pointer alternative to every drag, AA); [2.5.8 Target size (minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) (24×24 or spacing, AA).
- **Platform guidance.** Apple Human Interface Guidelines (44×44pt minimum hit target); Material Design (48×48dp touch target).
- **CSS.** Media Queries Level 4 (`hover`, `pointer`, `any-hover`, `any-pointer`); CSS Values Level 4 (`dvh`, `svh`, `lvh`); CSS Environment Variables (`env(safe-area-inset-*)` with `viewport-fit=cover`); CSS Containment Level 3 (container queries).
- **iOS focus zoom.** WebKit on iOS zooms into a focused field whose computed font size is under 16px. It's widely documented platform behaviour but not in a WebKit specification, and it **wasn't verified on a device in this pass**.

## 7. The issues

Filed on GitHub as #244–#267 (the umbrella is #244). Drafts are in [issues/](issues/).

| # | Issue | Kind | Constraint |
|---|---|---|---|
| 01 · #244 | Docs: a Mobile chapter in the design guide (touch and small screens) | umbrella | all |
| 02 · #245 | Tokens: target sizes and a coarse-pointer density step | enhancement | M2, M10 |
| 03 · #246 | Elevation: hover lift sticks after a tap on touch screens | bug | M3 |
| 04 · #247 | CI: render every preview as a phone and check overflow, target size and field text | enhancement | M1, M2, M6 |
| 05 · #248 | Popover, DropdownMenu, HoverCard, Tooltip: floating panels leave the screen at phone width | bug | M7 |
| 06 · #249 | DropdownMenu, Select, Combobox: open as a bottom sheet on narrow touch screens | enhancement | M7 |
| 07 · #250 | Input: field text is 14px, so iOS Safari zooms the page on focus | bug | M6 |
| 08 · #251 | Dialog, Sheet, CommandPalette: size to the visible viewport, not 100vh | bug | M8 |
| 09 · #252 | Toaster, SaveBar, Sheet: fixed layers ignore the safe-area insets | bug | M9 |
| 10 · #253 | Toaster: on touch the stack collapses as the finger lifts, and timers never pause | bug | M4 |
| 11 · #254 | Board: cards can't be moved by touch | bug | M4, M5 |
| 12 · #255 | Tree: rows can't be moved by touch | bug | M5 |
| 13 · #256 | SortableList: a swipe on a row reorders it instead of scrolling the page | bug | M5 |
| 14 · #257 | Schedule: switch to one day when the week doesn't fit | enhancement | M1, M2, M4 |
| 15 · #258 | PropertyList: proposed values wrap one letter per line at phone width | bug | M1, M10 |
| 16 · #259 | Tabs: the tab list overflows the page at phone width | bug | M1 |
| 17 · #260 | DataTable, DataGrid: a narrow layout, so columns don't squeeze into ellipses | enhancement | M1, M10 |
| 18 · #261 | Accessibility: controls below WCAG 2.5.8's 24px minimum target size | bug | M2 |
| 19 · #262 | Kbd, DropdownMenu, CommandPalette: hide keyboard shortcut hints on touch-only devices | enhancement | principle 9 |
| 20 · #263 | Breadcrumb: collapse to fit the width instead of wrapping | enhancement | M1 |
| 21 · #264 | Stepper: fall back to the vertical layout when the horizontal one doesn't fit | enhancement | M10 |
| 22 · #265 | ResizablePanelGroup: stack the panes when narrow, and a touch-sized handle | enhancement | M2, M10 |
| 23 · #266 | InputOTP: an eight-character code overflows at phone width | bug | M1 |
| 24 · #267 | ItemGroup: row actions squeeze the content at phone width | enhancement | M1, M10 |

## 8. Validating it

None of this has been tested with people. Before the Mobile chapter is called settled:

- **On devices**: iOS Safari and Android Chrome, with and without `viewport-fit=cover`, with the on-screen keyboard open in `Dialog`, `Sheet` and `CommandPalette`; VoiceOver and TalkBack through a menu that opens as a bottom sheet.
- **The hold to pick up**: whether a press-and-hold to move a `Board` card or `Tree` row is discovered without a hint, and how long the hold should be (`ChartTooltip` uses 250ms, `ContextMenu` 500ms). The same open question as Research.md's ChartTooltip review.
- **Density**: whether 44px controls under a coarse pointer cost too much on a tablet with a keyboard, and whether `(any-pointer: fine)` should keep the compact density there.
- **Menus as sheets**: task time and error rate for choosing from a 6–12 item `Select` as an anchored list vs. a bottom sheet at 375px.
