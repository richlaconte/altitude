# Distinctiveness benchmark, 2026-10-31

The first run of the benchmark ([README](../../README.md)): four tasks, each in two product domains, built by Claude Code with nothing installed, with shadcn/ui, and with Altitude, plus Altitude's own pattern previews. The tables are in [tables.md](tables.md), every screen is in [screens/](screens/), and every build's prompt, session and source is in [builds/](builds/).

## Result

**Building with Altitude did not move Claude's screens measurably further from what plain Claude or shadcn produce.** On UIClip, Altitude builds sit 0.0945 from the baselines' screens of the same briefs, and the two baselines sit 0.0937 from each other. Repeat builds of a single prompt differ by 0.021–0.031, so the gap is far inside the noise. Altitude's own previews sit further out (0.111), but by less than one noise floor.

What Altitude does do is pull builds toward its own look. Altitude builds are closer to Altitude's previews (0.067) than to either baseline (0.087 shadcn, 0.102 plain). The pull goes toward Altitude's look, not away from the generated centre. Read together, the two say Altitude's difference is in what a 224-pixel embedding can't resolve: elevation tiers in place of borders, type weights, the takeaway as a chart's heading, the order of a screen. The screens show this by eye ([dashboard-a](screens/claude-altitude--dashboard-a.png) leads with one chart and its takeaway; [plain](screens/claude-plain--dashboard-a.png) and [shadcn](screens/claude-shadcn--dashboard-a.png) open on a row of equal stat cards). The visual measure, as Design Theater used it, doesn't separate them.

## By measure

| | Noise floor | Altitude builds from the centre | Previews from the centre | Baselines from each other |
|---|---|---|---|---|
| Visual | 0.021–0.031 | 0.0945 | 0.1113 | 0.0937 |
| Colour (ΔE) | 0.83–1.50 | 2.78 | 3.10 | 4.00 |
| Layout | 0.38–0.50 | 0.673 | 0.710 | 0.648 |

- **Colour.** Plain Claude chose a palette per product: a dark sidebar for project management, a brown primary for the restaurant. Its creative range on colour is 6.36 ΔE, against 1.52 for Altitude and 0.70 for shadcn. Altitude and shadcn both hold a neutral ground with one accent, and they sit 0.90 apart: as close as any two systems on any measure. A design system holding its palette across products is what it is for, so Design Creativity Bench's reading of creative range ("models vary too little") doesn't carry over to colour here. Colour does name one exposure: on a light scheme, Altitude's Daylight and shadcn's neutral are hard to tell apart at a glance (tell CO8 is already on watch).
- **Layout.** The measure barely separates systems: two builds of one prompt in one condition already differ by 0.38–0.50, against 0.65–0.72 between systems. Task range (does a system's frame change with the task, tell LA5) is 0.744 for Altitude, 0.727 plain and 0.698 shadcn: in the right order, but within noise. LA5 stays on watch; this run can't settle it.
- **Creative range.** Altitude is lowest on visual (0.053) and layout (0.486), but each gap to shadcn (0.056, 0.545) is smaller than the noise floor.

## What the builds did

All 30 runs (24, plus a second sample of settings-a and dashboard-a in each condition) completed and built, for 21.52 USD and 1–5 minutes each. Every dashboard run in the plain and shadcn conditions, and the first Altitude dashboard run, called Claude Code's built-in `dataviz` skill; one shadcn run called `run`. These skills ship with Claude Code, so they are part of the default being measured, and each run records the skills it could see and the ones it called. Every Altitude run read the installed guidance before writing (the pattern docs, the type declarations, and twice `altitude patterns`), and most opened the matching pattern fixture (`screen-layout-report.jsx`, `settings.jsx`, `screen-layout-editor.jsx`) and worked from it. That is why Altitude builds sit closest to the previews.

## Limits

- **The baseline is only Claude.** v0 and Lovable need accounts. Until their builds are added under `baselines/`, "the centre" is two Claude conditions, and "distance from the centre" for each baseline is its distance to the other.
- **One sample per cell,** apart from the two briefs built twice. The noise floor rests on six pairs.
- **The previews are framed differently.** Each renders inside a 960-pixel preview frame, not as a full screen, which by itself puts some distance between them and the builds.
- **Layout is read from the DOM,** not parsed from pixels as Design Theater did with OmniParser, and repeated siblings are folded. Its scale isn't theirs, and neither is the colour scale (their pairwise means were 20.6–39.7). Compare these numbers with later runs of this benchmark, not with the papers.
- **One model.** Every build is Claude Opus 5.5 (`claude-opus-5-5`), Claude Code 2.1.314, on 2026-10-31.

## Next

1. Add v0, Lovable and Bolt builds of the eight briefs under `baselines/2026-10-31/`, then rerun capture and measure. This is the comparison the issue asks for, and the one this run is missing.
2. Build every brief three times, so each cell has its own noise floor. That costs about 45 USD a run at today's prices.
3. A visual measure that sees detail: UIClip on 224-pixel tiles of the screen (as UIClip itself was trained), or per-segment matching as Design Creativity Bench does. Add it beside the published one, never in its place, so runs stay comparable.
