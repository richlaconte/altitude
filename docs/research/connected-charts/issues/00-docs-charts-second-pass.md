<!--
title: Docs: Charts chapter, second pass — one record, many views; claims you can check
label: documentation, enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

The design guide: `project/Charts.md` (new rules, a longer form chooser and new rows in "Every part, by its build" and "Signals a chart can carry"), with matching entries in `Elevation.md` (the signals table), `Motion.md` ("Charts"), `Research.md` (sources and the reviews) and `project/framework` (the chart rules `altitude check` reports). This is the umbrella for the connected-charts work; every other issue in the set cites a principle written here.

## What you're trying to do

Make a page of Altitude charts behave as one record with several views, make what a chart says about itself checkable, and make the guide's recommendations the defaults an agent gets. The October pass ([Charts with Altitude's voice](https://github.com/richlaconte/altitude/blob/main/docs/research/charts/README.md), #184–#194) made one chart say what it means. The November pass ([Connected charts](https://github.com/richlaconte/altitude/blob/main/docs/research/connected-charts/README.md)) found that every chart is still alone: no shared slice, pointer, window or palette across a page (F1); small multiples and indexing promised by rule 6 with nothing to build them (F2); a takeaway the reader must take on trust (F3); no source or time on a settled chart (F4); no form for spread, drop-off or frequency (F5); no path by ear (F6); every Altitude-specific move an opt-in (F7); one chart rule in `altitude check` (F8).

## Today

`Charts.md` has nine rules, a form chooser of nine rows, and a "Dashboards" section that asks for one slice in words but gives no build. Every rule the first pass added is there (takeaway, focus, compare, since, pins, banking, inline labels).

## Proposal

Add these principles to `Charts.md`, in the chapter's voice, and keep each sub-issue to one of them:

1. **One record, many views.** Charts that share a page share a slice, a pointer, a window and a palette, and say the slice in words once. A selection anywhere is a filter everywhere, in the filter's own language (35%, positions held). *(ChartScope)*
2. **Two measures are two charts.** When series differ in scale or number, juxtapose them: small multiples with one axis, or index them to a base named in words. Never a second axis. *(ChartGrid; a common base)*
3. **A claim points at its mark.** A figure in a takeaway or summary is a citation: it lights the mark it came from and lands a reading there. A figure that isn't in the data is a defect. *(ChartCite)*
4. **The record says where it came from.** Source, time read and count are part of the chart, at caption weight, and stale is said in words. *(source, asOf; definitions)*
5. **The form fits the question.** Spread is a histogram or a quantile dot plot; a process is a funnel of aligned bars with the drop-off in words; a frequency is counted marks. Never area for a count. *(Histogram, Funnel, UnitChart)*
6. **A path by ear is a path.** A chart can be played: pitch for value, one series at a time, narrated at its extremes, from the same keyboard path. *(sonify)*
7. **The default is the rule.** What the guide recommends is what the chart does unless told otherwise, set once for an app; what the guide forbids, `altitude check` reports. *(provider chart defaults; CLI rules)*

The form chooser gains three rows (how values are spread; where people leave a process; how many in a hundred) and one note (two measures of different scale: `ChartGrid` or a common base). "Every part, by its build" gains the scope's shared crosshair, a citation plate, the source line and the play control.

**Additive?** yes: rules and rows are added; nothing existing is reworded except the "Dashboards" section, which gains the build it describes.

## Elevation impact

None in this issue; each sub-issue carries its own table. The chapter's one rule stands: the data is the record, and only chrome has height.

## Motion and accessibility

None here. Each sub-issue states its own.

## Out of scope

The sub-issues themselves. This issue closes when the chapter carries the seven principles and each links to the issue that builds it.

## Done when

- [ ] `Charts.md` carries the seven principles, the three chooser rows and the new "Every part" rows, each linking its issue
- [ ] `Elevation.md` signals table and `Motion.md` ("Charts") updated as the sub-issues land
- [ ] `Research.md` carries the sources in the research pass's §4
- [ ] `llms.txt` / `llms-full.txt` regenerated so agents read the new rules
- [ ] `node build.mjs && node previews.mjs` run and committed if any preview changed

## Alternatives considered

Filing the principles only in the research README. The guide is what agents and the package ship; the research is its history. Both, as the first pass did.
