<!--
title: DropdownMenu, Select, Combobox: open as a bottom sheet on narrow touch screens
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`DropdownMenu`, `Select` and `Combobox`, which must change together because they share the menu surface, the gliding highlight and `MenuPanel` (`overlays.tsx:112`). `DatePicker`'s panel and `SplitButton`'s menu would follow. Part of the mobile work ({{01}}, principle 6 and constraint M7).

## What you're trying to do

Choose from a list on a phone. Today a `Select` on a 375px screen opens a 280px-tall list anchored under its trigger: rows are 30–36px, the list may open off the bottom of the screen or under the keyboard (for `Combobox`), and its right edge can pass the screen's (`max-width: max(100%, 360px)`). The thumb is at the bottom of the screen; the list is wherever the trigger happened to be.

Native `<select>` on iOS and Android opens a bottom picker for this reason, and `AppShell` and `NotificationCenter` already turn into `Sheet`s when narrow. Menus are the obvious next case.

## Today

`DropdownMenu`, `Select` and `Combobox` always open anchored (`.alt-pop`, `.alt-select-list` at `bundle.css:2177`). There is no narrow mode. The collision bug is {{05}}; this issue is the form change.

## Proposal

```tsx
<Select presentation="auto" … />   // 'auto' (default) | 'anchored' | 'sheet'
<DropdownMenu presentation="auto" … />
<Combobox presentation="auto" … />
```

`auto` opens as a bottom sheet when the viewport is under `breakpoint-compact` (640px, from {{02}}) **and** `(pointer: coarse)`, otherwise anchored. The sheet:

- rises from the bottom edge with `Sheet`'s choreography, full width minus `space-2`, `max-height: 70dvh`, with safe-area padding ({{09}});
- has a title (the field's label, or the trigger's accessible name) and a "Close" button; tapping outside or swiping down closes it;
- uses rows at `--size-row-md` (44px coarse) with the same gliding highlight and check mark;
- for `Combobox`, puts the search field at the top of the sheet and keeps it above the keyboard ({{08}});
- keeps the same roles (`menu`/`listbox`), keyboard model and announcements.

**Additive?** yes for desktop. On phones the default `auto` changes presentation, which is the intent; `presentation="anchored"` restores today's behaviour.

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Menu / list as a sheet | Floating | 3 (the menu's level, **not** the sheet's 4) | `surface-floating` · `elev-3` | `role="menu"`/`listbox`, title, "Close" button |
| Scrim behind it | n/a | n/a | none, or `scrim` at half strength | n/a |
| Selected option | Raised (in the list) | as today | as today | check icon, `aria-selected` |

Open question: is a menu that has moved to the bottom edge still a menu (level 3), or a sheet (level 4)? This proposal keeps it at 3. It's the same temporary choice and shouldn't climb a tier for changing edges. If the maintainers prefer 4, it becomes a plain `Sheet`.

## Motion and accessibility

Rise: `Sheet`'s, at `dur-travel-3` (three levels from the ground) with `ease-rise`; close with `ease-sink`. Reduced motion: fades. Focus moves to the selected option (or the search field), is trapped while open, and returns to the trigger. VoiceOver and TalkBack need a device check. Forced colours: 2px border for floating.

## Done when

- [ ] `presentation` on all three; `auto` uses the shared breakpoint and `(pointer: coarse)`
- [ ] `index.d.ts`, the three READMEs and their `build/previews.txt` sections updated (a phone-width preview of each)
- [ ] `Elevation.md` says where a menu-as-sheet sits; `Motion.md` covers its rise
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes at 375 with `MOBILE=1` ({{04}}); keyboard and touch checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered (optional)

- **Fall back to native `<select>` on touch.** Gets the platform picker for free, but loses descriptions, icons, groups and the search in `Combobox`, and the native picker can't be styled into the system.
- **Only fix collisions ({{05}}).** Necessary anyway, but a 30px-row list anchored mid-screen is still hard to use with a thumb.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
