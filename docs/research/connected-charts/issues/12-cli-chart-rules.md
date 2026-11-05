<!--
title: CLI: altitude check rules for charts, Altitude's own and Recharts'
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

The CLI (`altitude check`, `altitude explain`) and `project/framework/rules.json`, `evidence.json` and `build/checks/source-check.mjs`. Not a React component; the area is `CLI:` as CONTRIBUTING allows.

## What you're trying to do

Hold agent-built charts to the chart rules the way `altitude check` holds forms to theirs. Today there is one chart rule, `ALT-CHART-001` (no pie or donut charts), and it applies to Recharts, Chart.js, ECharts and Nivo, not to Altitude's own charts. Everything the Charts chapter forbids or asks for (one axis, zero on bars, colour's one job, a title, a takeaway in a report, direct labels, no first-render animation) is unchecked, so the adherence evals (#419) can't measure it and an agent learns nothing from a wrong chart.

## Today

`rules.json`: `ALT-CHART-001`, deterministic, `source-check.mjs`. The chart previews are checked in `build/checks/chart-*.mjs`, but those check the library, not an app.

## Proposal

Add deterministic rules where the source is certain, and contextual ones (reported as review findings, never failures) where it isn't:

| Id | Rule | Class | Finds |
|---|---|---|---|
| `ALT-CHART-002` | One axis per plot | deterministic | two `<YAxis>` in one Recharts chart; `yAxisId` on marks |
| `ALT-CHART-003` | Bars stand on zero | deterministic | `domain={['dataMin', …]}` or `['auto', …]` on a Recharts bar chart's `YAxis`; `yDomain` not including 0 on a `ChartContainer` holding a `BarChart` |
| `ALT-CHART-004` | Marks are flat ink | deterministic | `<defs>` gradients, `filter` drop shadows or `radius` on all four corners under a Recharts `Bar`/`Area`; `style={{ filter }}` on Altitude chart children |
| `ALT-CHART-005` | Colour does one job | deterministic | a series `color` of `accent`, `presence-*`, `positive`/`caution`/`critical` in a `ChartConfig`, or a `--chart-*` not mapped to `data-*` |
| `ALT-CHART-006` | Every chart has a name | deterministic | `ChartContainer` without `title` or `aria-labelledby`; a Recharts chart without an `accessibilityLayer` and a `title` |
| `ALT-CHART-007` | No decorative entrances | deterministic | Recharts marks without `isAnimationActive={false}` or a reduced-motion hook; `animationBegin` staggers |
| `ALT-CHART-008` | Say one thing first | contextual | a `ChartContainer` as a report's lead (`ScreenLayoutReport`, or the first chart in `main`) with no `takeaway` |
| `ALT-CHART-009` | Importance is emphasis | contextual | three or more series with neither `focus` nor a `takeaway` |
| `ALT-CHART-010` | The record says where it came from | contextual | a `ChartContainer` with neither `source` nor `live` (once #05 lands) |

Each rule carries `repair` text in the chapter's words, `verification` (the check that finds it) and `evidenceStatus` as the framework's schema requires; `altitude explain ALT-CHART-003` says why bars stand on zero and cites Research.md.

**Additive?** yes. New rules; `check` gains findings, not failures, for the contextual ones.

## Elevation impact

None; tooling.

## Motion and accessibility

None. `ALT-CHART-006` and `-007` are the two with an accessibility bearing (a name; reduced motion) and should carry the `accessibility` tag in `rules.json` if the schema has one.

## Out of scope

A rule for dual-axis Altitude charts (impossible by construction). Lint for chart form choice (whether a pie should have been a bar is design, not source). Checking data values.

## Done when

- [ ] Rules added to `project/framework/rules.json` and `evidence.json` with schema, reference and freshness checks passing
- [ ] `build/checks/source-check.mjs` finds each deterministic rule in a fixture app, with a true-negative fixture per rule
- [ ] `altitude explain` renders each; the installed-consumer check covers one
- [ ] `project/framework/README.md` and the Charts chapter list the rules; `llms.txt` regenerated
- [ ] `npm run build && npm run check:framework` clean
- [ ] Version bumped (`npm version minor --no-git-tag-version`), since the package's guidance changes

## Alternatives considered

Only documenting the rules. They're documented; agents follow what's checked (CONTRIBUTING, "Why it works this way").
