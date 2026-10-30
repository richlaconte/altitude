---
name: Feature request
about: New behaviour or a new prop for a component that already exists
title: "<Component>: <what it should do>"
labels: enhancement, needs-design
---

<!-- Read CONTRIBUTING.md ("Issues") before filling this in. Delete these comments and any section marked optional that you leave empty. If this is part of a bigger issue or can't start until another lands, link it as a sub-issue or "blocked by" after filing (CONTRIBUTING.md, "How work is organised"). -->

## Component

<!-- One component per issue (e.g. Select). If the change spans a family (Select and Combobox), name both and say why they must change together. -->

## What you're trying to do

<!-- The situation, in plain words. What you can't do today, and how you're working around it. -->

## Today

<!-- What the component does now. Link its README (project/components/<Name>/README.md) or the source (project/components/src/<file>.tsx#L<line>). -->

## Proposal

```tsx
// The new prop, option or sub-part, and one realistic use.
```

**Additive?** yes / no <!-- Existing props, defaults and behaviour must keep working. If not, say what breaks and why it's worth a major version. -->

## Elevation impact

<!-- Does this change any part's tier, level, surface or shadow, or add a state? If yes, fill the table; if no, say "none" and why. -->

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| | | | | |

## Motion and accessibility

<!-- New transitions (levels travelled → dur-travel-n, easing), keyboard and ARIA changes, forced colours, reduced motion. "None" is a fine answer. -->

## Out of scope (optional)

<!-- What this issue deliberately doesn't cover, so whoever picks it up doesn't widen it. Link a separate issue for anything that should follow. -->

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in both schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered (optional)
