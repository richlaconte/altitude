<!--
title: Docs: a Mobile chapter in the design guide (touch and small screens)
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

The design guide: a new `project/Mobile.md`, linked from `project/README.md` ("Read **Elevation** … **Mobile** before laying anything out for touch or a small screen"), with matching entries in `Elevation.md` (the hover row, "in your hand"), `Motion.md` (hold to pick up), `Research.md` (sources and the audit) and `framework/principles.md` (which already asks for narrow viewports to be tested but gives no rules). This is the umbrella for the mobile work. Every other issue in the set cites a constraint written here.

## What you're trying to do

Make every Altitude component and pattern work on a phone (a finger, 320–430 CSS px, an on-screen keyboard, a notch) without changing what height means.

Altitude assumes a mouse in places the guide never says. Hover is the first signal (+1 level). Some things are revealed only by hover. Moving things means dragging. Floating panels assume they have room to float. On a phone a finger lands and presses in one motion, has to pick a thing up before it can carry it, covers what it touches, and the screen's edge is close. Without written rules, each component makes its own guess. Today four components use four different narrow widths (768, 640, 560, 480), one hover-only reveal has a `(hover: none)` fallback and two others don't, and one list traps the page scroll while two others can't be dragged by touch at all.

## Today

A phone-width audit at commit `f32b92b` (all 129 previews at 375 CSS px with `isMobile` and `hasTouch` in Chromium, plus real touch events driven through CDP) found:

- **98 `:hover` rules, none inside `@media (hover: hover)`**, so a tapped control stays lifted (issue {{03}}).
- **951 of 1,076 interactive targets (88%) are under 44×44 CSS px**; 279 are under WCAG 2.5.8's 24px. There are no size or density tokens (issues {{02}}, {{18}}).
- **Field text is 14px**, under the 16px at which iOS Safari zooms the page on focus (issue {{07}}).
- **`Board` and `Tree` can't be dragged by touch** (both move with a mouse in the same harness), and **`SortableList` reorders when you meant to scroll** (issues {{11}}, {{12}}, {{13}}).
- **Floating panels spill off the screen** (`DropdownMenu` +86px, `HoverCard` +26px), and **overlays size to `100vh`** and ignore safe-area insets (issues {{05}}, {{06}}, {{08}}, {{09}}).
- **Nine layouts don't reflow at 375px**: `PropertyList` proposals, `Schedule`, `Tabs`, `Table`/`DataGrid`, `InputOTP`, `Breadcrumb`, `Stepper`, `Resizable`, `ItemGroup` (issues {{14}}–{{17}}, {{20}}–{{24}}).
- **No container queries**, and ad hoc breakpoints.

What's already right, and should be kept as precedent: approach ignores touch (`core.tsx`), `AppShell` and `NotificationCenter` become `Sheet`s when narrow, `ContextMenu` and `ChartTooltip` open on a touch hold, charts use `touch-action: pan-y`, `Heatmap` re-wraps, `InlineEdit`'s pencil is visible under `(hover: none)`.

## Proposal

A chapter that restates the laws for the hand, in the guide's voice. **The ground is the record, at any size.**

1. **Press is the first signal.** A finger has no hover, so on touch the press *is* the feedback: the slab goes to ground the moment the finger lands. Hover lift exists only under `@media (hover: hover)`, so nothing stays raised after the finger has gone. *(Law 4, made true for touch.)*
2. **Nothing is hover-only.** Whatever a pointer can reveal, a finger can reach: a tap, a long press, a visible control or focus. Hover may preview; it never gates. A timer that pauses for a hovering reader pauses for a touching one. *(Law 7, extended: hover never travels alone either.)*
3. **Faces are sized for eyes, hit areas for fingers.** The visible slab keeps its size and tier. Its hit area grows to 44×44 CSS px under a coarse pointer and is never under 24×24 anywhere. Where whole controls must grow (fields, rows, menu items), they grow together by one density step from tokens.
4. **Pick it up before you carry it.** On touch, a swipe belongs to the page. A thing is lifted into your hand (level 3, as today) only after a press-and-hold, then carried. "In your hand" begins when the hand closes on it. Every drag also has a non-drag path (WCAG 2.5.7).
5. **The page scrolls one way.** At 320 CSS px nothing scrolls the page sideways. Content that needs two dimensions (tables, code, a board) scrolls in its own frame. Content that doesn't fit changes form (columns stack, a week becomes a day, a trail collapses) and never shrinks into ellipses or one letter per line.
6. **The screen's edge is part of the ground.** Floating things stay inside the visible viewport: flip, shift, then shrink. On a narrow touch screen the overlay tier comes up from the bottom edge (menus, selects and pickers as bottom sheets), where the thumb is. Same tier and meaning, different edge. Fixed layers respect the safe area and the keyboard.
7. **The primary action is within reach.** Dialog and sheet footers stack full-width with the primary action nearest the bottom. Still one primary per view, still level 2.
8. **Fields don't move the page.** Field text is at least 16px on touch, with no `maximum-scale` workaround. The field you're in and the action that commits it stay above the keyboard.
9. **Hints match the hands.** Keyboard shortcuts are shown where there's a keyboard, touch hints ("Press and hold to move") where there's touch. Behaviour is never removed.
10. **Height still reads small.** Tiers, shadows and the attention budget don't shrink. What changes on a phone is where things come from and how big they are to touch, never what their height means.

The testable constraints each issue cites:

| # | Constraint |
|---|---|
| **M1** | No sideways page scroll at 320 CSS px; nothing outside a scroll container extends past the viewport. |
| **M2** | Targets ≥ 24×24 CSS px everywhere (or the 2.5.8 spacing exception), ≥ 44×44 under `(pointer: coarse)`, by hit area. Inline text links exempt. |
| **M3** | Hover styles only under `@media (hover: hover)`. |
| **M4** | Nothing reachable only by hover: every reveal, preview or pause has a tap, long-press, focus or visible path under `(hover: none)`. |
| **M5** | Every drag works with touch and has a non-drag path. Touch pick-up after a hold (≈ 250–500ms, ≤ 10px, matching `ContextMenu` and `ChartTooltip`); a swipe without a hold scrolls; `touch-action: none` only on a handle or a gesture-only surface, never a row, card or list. |
| **M6** | Field text ≥ 16px under `(pointer: coarse)`. |
| **M7** | Floating panels stay inside the visual viewport with an 8px margin; on narrow touch screens they may open as bottom sheets. |
| **M8** | Overlays size to the visible viewport (`dvh`, `visualViewport` where the keyboard matters). |
| **M9** | Fixed layers add `env(safe-area-inset-*)`. |
| **M10** | Components respond to their container (container queries at a shared narrow width), not the viewport. |

Mechanism: input modality from media queries (`hover`, `pointer`, `any-pointer`), never user-agent sniffing; a density step from tokens ({{02}}); container queries for component layout; and two shared widths in `tokens.json` so 768/640/560/480 converge.

**Additive?** yes. The chapter adds rules. The issues it spawns are additive except where noted (larger hit areas under coarse pointers change layout slightly on touch devices).

## Elevation impact

No tier changes meaning. Two clarifications for `Elevation.md`:

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Hover on a pressable (touch) | n/a: doesn't exist | n/a | n/a | the press itself, instantly |
| Carried item, picked up by a touch hold | Floating | 3 | `surface-floating` · `elev-3` (as today) | `aria-pressed`/`aria-grabbed` and the live-region "Picked up …" already used by `Board` |
| A menu opened as a bottom sheet | Floating | 3 (not 4: it's the same temporary choice) | menu's surface and shadow, from the bottom edge, no scrim | `role="menu"`/`listbox` unchanged; a "Close" button |

## Motion and accessibility

Motion: the hold that picks a thing up gets a visible charge (the slab lifts once the hold completes, `dur-travel-2`, `ease-rise`) so the person knows when they can move. Under reduced motion, it lifts without travel. Bottom sheets rise with `Sheet`'s existing choreography. Accessibility: WCAG 1.4.10, 1.4.13, 2.5.1, 2.5.7, 2.5.8 (and 2.5.5 as the coarse-pointer target), with VoiceOver and TalkBack checks named in `Research.md`.

## Done when

- [ ] `project/Mobile.md` written, with the principles, M1–M10, and their sources
- [ ] Linked from `project/README.md`; `Elevation.md`, `Motion.md`, `Research.md` and `framework/principles.md` updated
- [ ] The child issues below closed or explicitly deferred
- [ ] The phone check ({{04}}) runs in CI against M1, M2 and M6

## Child issues

{{CHILDREN}}

## Alternatives considered (optional)

- **A separate mobile component set** (`MobileSelect`, `MobileMenu`). Rejected: two of everything to keep in step, and agents would pick the wrong one. The same component should change form, as `AppShell` already does.
- **User-agent detection.** Rejected: a touch laptop and an iPad with a keyboard both break it. Media queries describe the input actually present.
- **`maximum-scale=1` to stop the iOS zoom.** Rejected: disables pinch zoom for everyone (WCAG 1.4.4).

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte, who asked for deep research into a mobile design philosophy and issues to make every component mobile-friendly. Sources: Parhi, Karlson & Bederson, MobileHCI 2006 (doi:10.1145/1152215.1152260); Henze, Rukzio & Boll, MobileHCI 2011; Holz & Baudisch, CHI 2010 (doi:10.1145/1753326.1753413); Hoober, UXmatters 2013; Bergstrom-Lehtovirta & Oulasvirta, CHI 2014; WCAG 2.2.
