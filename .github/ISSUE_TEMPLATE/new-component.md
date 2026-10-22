---
name: New component
about: Propose a component Altitude doesn't have yet
title: "New: <Name> — <what it's for, in a few words>"
labels: enhancement
---

<!-- Read CONTRIBUTING.md ("Issues") before filling this in. Delete these comments and any section marked optional that you leave empty. -->

## What it's for

<!-- The job it does for the person using the interface, in two or three sentences. Name the closest existing components and say why they can't do this job. -->

**Closest existing components:**
**Name:** <!-- Use shadcn/ui's name and sub-part names when shadcn has the component (e.g. SheetHeader, SheetTitle). -->

## Elevation story

<!-- The ground is the record. Say which of the three things each part is: settled (ground), live (raised or floating), or an opening (sunk). See project/Elevation.md. -->

**What it is:** settled / live / an opening
**Signal it carries:** <!-- an existing row of the signals table in Elevation.md, or a new one, and why -->
**Relatives it borrows from:** <!-- e.g. "the trigger is built like Input; the list rises like DropdownMenu, with its gliding highlight" -->

| Part / state | Tier | Level | Surface · shadow | Non-height cue (word, icon, ARIA state or border) |
|---|---|---|---|---|
| | | | | |

## Motion

<!-- Each change of level, how many levels it travels, and the duration and easing tokens that follow (dur-travel-n, ease-rise / ease-sink / ease-settle / ease-glide). Anything that rises: is it within the attention budget (riseDelay)? What stays under reduced motion? See project/Motion.md. -->

## Accessibility

**WAI-ARIA pattern:** <!-- name and link the APG pattern, or "plain HTML: <element>" -->
**Keyboard:**
**Screen reader:** <!-- names, states, live-region announcements -->
**Forced colours:** <!-- the fallback by tier: dashed for sunk, 1px for raised, 2px for floating, double for modal -->
**`contrast="more"`:**

## API sketch

```tsx
// Props and sub-parts, and one realistic use. Additive only: no changes to existing components' APIs.
```

## Rules it strains (optional)

<!-- If a rule in the design guide blocks a good design, say which rule and why, rather than designing around it quietly. -->

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/<Name>/README.md` in the existing format (what it is, elevation, props, "You provide", do and don't)
- [ ] A section in `build/previews.txt` with an honest `@dsCard` group and subtitle
- [ ] A row in the signals table in `Elevation.md`; new choreography in `Motion.md`; sources and a prototype review in `Research.md`
- [ ] `tsc` clean; `shoot.mjs` renders it in all four schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`
- [ ] Keyboard paths checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed (CI fails otherwise)

## Open questions (optional)
