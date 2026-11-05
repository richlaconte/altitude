<!--
title: AltitudeProvider: chart defaults for a whole app (inline y labels, direct labels, patterns, banking)
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`AltitudeProvider` (a new `charts` prop) and `ChartContainer`, which reads it. They change together because the provider holds the setting and the container applies it.

## What you're trying to do

Make the guide's recommended chart defaults one setting away for an app, without flipping them for everyone. `yLabels="inline"`, `aspect="banked"`, `patterns`, `directLabels` and `tooltip`'s behaviour are all per chart. E103 kept the gutter default "until people have used the inline layout", and that's right for the package; but an app that has chosen the inline layout now sets it on every chart or gets a mix. Altitude is built for agents, and an agent draws what the defaults give it: the grouped "Requests by service" preview, with none of the opt-ins, is any library's default. The adherence evals (#419) can measure what agents draw before and after.

## Today

`AltitudeProvider` sets `scheme`, `accent`, `density`, `motion`, `contrast`, `loading`. Every chart option is a prop on `ChartContainer` or a chart type (`chart.tsx`, `ChartContainerProps`).

## Proposal

```tsx
<AltitudeProvider scheme="daylight" charts={{ yLabels: 'inline', aspect: 'banked', directLabels: 'auto', patterns: false, locale: 'en-GB' }}>
```

- `charts` holds defaults for `yLabels`, `aspect` (`'banked'` applies to line charts only), `directLabels` (`'auto'`: label series at their marks when there's room, else a legend; `true`/`false`), `patterns`, `locale`, `tooltip`, `views`, and the readout's `indicator`. A prop on a chart still wins.
- **Direct labels `'auto'`** is new behaviour the setting exposes: a line chart's end labels are already direct; `'auto'` extends it to grouped bars (label the first group's bars) and stacks (label the last stack's segments, as `labels="last"` does), and drops the legend when every series is labelled. Charts' "Every part" already says "better still, label the series directly".
- A nested `AltitudeProvider` or a `ChartScope` can override for a region.
- The `altitude init` managed block and the installed guidance recommend the setting, so an agent setting up a project gets it; `altitude check` can report a chart that overrides a default back to the generic one without reason (its own issue).

**Additive?** yes. Without `charts`, every default is as today.

## Elevation impact

None: every setting is one the charts already have. `directLabels: 'auto'` moves words from a legend (flush plates) to the plot (flush labels), both on the ground.

## Motion and accessibility

None new. Direct labels follow E101 (never on a mark) and E38's layout. Forced colours already turn `directLabels` on.

## Out of scope

Flipping the package defaults (E103's condition; the evals decide). Defaults for other components (density already exists).

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the `AltitudeProvider` and `ChartContainer` READMEs and `build/previews.txt` updated (a provider with the recommended defaults around the grouped and stacked previews)
- [ ] `project/framework` guidance and the `altitude init` managed block recommend `charts={{ yLabels: 'inline', directLabels: 'auto' }}`
- [ ] `tsc` clean; `shoot.mjs` clean in both schemes; `checks/chart-axis-text.mjs` extended to the provider default
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered

A CSS variable per default. Layout choices aren't styles, and an agent can't read them back. Flipping the defaults now. Non-additive, and E103 asked for use first.
