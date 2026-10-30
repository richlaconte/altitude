<!--
title: Dialog, Sheet, CommandPalette: size to the visible viewport, not 100vh
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

Modal overlays size and place themselves with `vh` and `position: fixed; inset: 0`, which on mobile browsers means the *largest* viewport, not the part you can see. With the browser toolbar showing, or the on-screen keyboard open while you type in the overlay, its footer (where the primary action is) can be off-screen or under the keyboard.

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | `Dialog`, `Sheet`, `CommandPalette` (one family: the modal layers from `useModal`) |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system previews |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Code reading. **Not observed on a device**: Playwright can't open a real on-screen keyboard, and `vh` vs `dvh` differ only in browsers with retracting toolbars (iOS Safari, Android Chrome) |
| Schemes affected | all |
| Modes affected | touch; any phone browser |

## Steps to reproduce

```sh
cd project/components && grep -n "100vh\|52vh\|12vh\|dvh\|svh\|visualViewport" bundle.css ../components/src/*.tsx
```

1. On an iPhone, open a `Dialog` (or `Sheet`) whose body holds a text field and whose footer holds "Save changes".
2. Tap the field. The keyboard covers the lower half of the screen; the dialog doesn't move or shrink, and "Save changes" is under the keyboard.
3. In `CommandPalette`, the list's `max-height: min(380px, 52vh)` is computed from the large viewport, so with the keyboard open the list extends under it.

## Expected

Constraint M8 in {{01}}: overlays size to the visible viewport, and the focused field and the footer's primary action stay visible while typing. `Elevation.md` puts the dialog at level 5, where it "claims you", and a claim you can't answer because its button is hidden is worse than none.

## Actual

- `Dialog` (`bundle.css:824`): `max-height: calc(100vh - 48px)`, centred in a `position: fixed; inset: 0` root with `padding: var(--space-6)`.
- `CommandPalette` (`:2033`, `:2048`): `padding: max(var(--space-6), 12vh) …`; viewport `max-height: min(380px, 52vh)`.
- `Sheet` (`:2087`, `:2096`): `position: fixed; inset: 0` root; the bottom sheet's `max-height: calc(100% - 2 * var(--space-8))` of that root.
- Nothing in `src/` reads `window.visualViewport`.

## Suspected cause (optional)

Confident about the CSS; device behaviour unverified. Fix direction: `dvh` in place of `vh` (`max-height: calc(100dvh - 48px)`, with the `vh` value first as a fallback); and in `useModal`, while a modal is open, track `visualViewport` (`resize`/`scroll`) into `--alt-vvh` and `--alt-vv-top` on the modal root so a dialog can align to the top of the visible area and the sheet's footer can sit above the keyboard. Chrome's `interactive-widget=resizes-content` viewport key is a documented alternative for apps; mention it in `Mobile.md`. Also scroll the focused field into view within the modal's scroll area on `focusin`.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass (CSS and source audit).
