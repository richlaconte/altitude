<!--
title: ChartContainer: play a series by ear from the keyboard path
label: enhancement, accessibility
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`ChartContainer` (the keyboard path from #63 and the frame's controls), for every chart type that reports `chartPoint`s: `LineChart`, `AreaChart`, `BarChart`, `ScatterChart`, `DotPlot`, `Histogram` when it lands.

## What you're trying to do

Give a blind or low-vision reader, or anyone whose eyes are elsewhere, the shape of a series without stepping through 200 points by arrow key. Charts' rule 8 says a chart never travels alone; the keyboard path (after Olli and Data Navigator) is one path and the summary is words. Audio data narratives that interleave description with sonification produced more insights than either alone (Siu et al., CHI 2022). Apple's Audio Graphs and Highcharts ship it; no React chart library gives it free.

## Today

The keyboard path announces each point's name (series, label, value, change from the one before). There's no audio. `ChartContainer` has a `pausable` switch and a `views` control in its frame (`chart.tsx`).

## Proposal

```tsx
<ChartContainer config={config} data={rows} x="t" sonify>
  <LineChart data={rows} x="t" />
</ChartContainer>
// sonify?: boolean | { duration?: number; narrate?: boolean }
```

- **A "Play" control in the frame**, beside `views`, as a `Button` that becomes "Stop" in place (as `PromptInput`'s Send becomes Stop). Shortcut `P`... no: `P` pins (E107); use `Space` while the plot has focus, on the summary or a series node.
- **Pitch for value, time for x**, one series at a time (the focused one, or the first), over `duration` (default 3s, scaled to 6s past 200 points). Web Audio, a plain sine, a two-octave range mapped to the y domain so the ground line is the lowest note; a short click at each gridline crossing; silence for a gap (null), which is never bridged (rule: a gap is a gap).
- **Narrated**, after Siu et al.: the series name and range before, the extremes as they pass ("highest, 86"), the trend after, through the same polite live region the keyboard path uses; `narrate: false` plays tone only.
- **Scrub:** while playing, ←/→ step the keyboard path and the tone follows, so the reader can stop at a point and hear its name. Playing starts from the focused point if there is one.
- **Multi-series:** ↑/↓ change which series plays; a stack plays its total. `focus` plays the focused series first.
- **Never on its own.** Nothing plays without a press; `live` data never triggers audio. WCAG 1.4.2: the Stop control is the same button, and Escape stops.

**Additive?** yes. Without `sonify`, nothing is added.

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Play / Stop button | raised | 1 | secondary `Button` | the words; `aria-pressed` |
| The playing position | ground | 0 | the crosshair (1px `line-control`) moving with time | the current point's name in the live region at extremes |

## Motion and accessibility

The crosshair moves at the playback rate, linear, no easing; it's the pointer, not a change. Under reduced motion it still moves (it is the playhead) unless the reader stops it; nothing else travels. `prefers-reduced-motion` doesn't govern sound. Forced colours: the crosshair is `CanvasText`. Screen reader: the live region says "Playing Error rate, 0 to 3.7%, 180 points" then the extremes and the trend; the tone and speech don't overlap (speech pauses the tone by 300ms).

## Out of scope

Stereo panning for x (headphone-dependent). Chords for several series at once. Haptics on touch. A sonified `Sparkline` or `Stat` (words suffice at that size).

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, `ChartContainer`'s README (a "By ear" section) and `build/previews.txt` updated (the error-rate chart with `sonify`)
- [ ] `Charts.md` rule 8 and "Accessibility" gain the path by ear; `Research.md` carries the sources
- [ ] `tsc` clean; `shoot.mjs` clean in both schemes; Play, scrub, Stop and Escape checked with `ACT` (audio asserted through an `AudioContext` stub)
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered

Sonifying on hover. Hover is a promise; sound on every pointer pass would be noise. A separate component. The path is `ChartContainer`'s; the sound follows it.
