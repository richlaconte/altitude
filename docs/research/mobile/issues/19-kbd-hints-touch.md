<!--
title: Kbd, DropdownMenu, CommandPalette: hide keyboard shortcut hints on touch-only devices
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Kbd`, and the places that render it on their own: menu item `shortcut`s (`.alt-menu-shortcut`, in `DropdownMenu`, `ContextMenu`, `SplitButton`), `CommandPalette`'s footer hints and item shortcuts. These must change together so the rule is the same everywhere. Part of the mobile work ({{01}}, principle 9).

## What you're trying to do

Keep a phone's narrow menus and palettes free of hints the person can't use. On a touch-only phone, "⌘D" beside "Duplicate", or "↑↓ Move · ↵ Choose · esc Close" under the palette, is noise that takes width from the labels. On the same app on a laptop, or an iPad with a keyboard, the hints are useful.

## Today

- Menu items render `shortcut` unconditionally (`.alt-menu-shortcut`, `bundle.css:814`).
- `CommandPalette` has `hints = true` (`command.tsx:134`), so an app can turn the footer off, but it can't know whether a keyboard is present, and item `shortcut`s (`command.tsx:16–17`) always render.
- `Kbd` always renders.

Visible in the 375px previews: `DropdownMenu` (R, ⌘D, ⌫ beside items), `CommandPalette` (footer and ⌘ D, ⌘ N chips), `Tooltip` ("Bold ⌘B").

## Proposal

```tsx
<Kbd hideOnTouch>⌘K</Kbd>                        // default true when rendered as a hint by a component
<CommandPalette hints="auto" />                   // 'auto' (default) | true | false
```

- A shared `useKeyboardLikely()` that is `false` when `(hover: none) and (pointer: coarse)` matches **and** no `keydown` has been seen in the session (a hardware keyboard on a tablet flips it to `true` on first use), and `true` otherwise.
- Components hide shortcut hints when it's `false`: menu shortcuts, `CommandPalette` footer and chips, and `Kbd` rendered by Altitude components. `Kbd` used directly by the app stays visible unless `hideOnTouch` is set, since the app may be documenting shortcuts on purpose.
- Behaviour never changes: shortcuts still work, and `aria-keyshortcuts` stays on the items.

**Additive?** yes for the API. With the defaults, touch-only devices stop showing hints that components render.

## Elevation impact

None. `Kbd` is a flush key cap; hiding it changes no surface.

## Motion and accessibility

No motion. `aria-keyshortcuts` keeps the shortcut available to assistive technology regardless of visibility. Content rule: preview and README copy that says "press ⌘K" should also say the touch way (e.g. "tap Search").

## Done when

- [ ] `useKeyboardLikely` shared; menu shortcuts, `CommandPalette` and component-rendered `Kbd` follow it
- [ ] `Kbd hideOnTouch`, `CommandPalette hints="auto"` in `index.d.ts` and READMEs
- [ ] Checked with `MOBILE=1` ({{04}}) and with a `keydown` sent first
- [ ] `node build.mjs && node previews.mjs` run and committed

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
