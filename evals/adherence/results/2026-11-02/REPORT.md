# Adherence baseline, 2026-11-02

The first scoring, on builds that already exist: the 30 builds of the [31 Oct distinctiveness run](../../../distinctiveness/results/2026-10-31/REPORT.md). Those are Claude Code (Opus 5.5) with nothing installed, with shadcn/ui, and with Altitude 0.2.1 set up by `altitude init`, eight briefs plus two repeats each. Nothing was generated for this report. Per-build scores are in [scores.json](scores.json).

```sh
node evals/adherence/score.mjs evals/distinctiveness/results/2026-10-31/builds/* --json > evals/adherence/results/2026-11-02/scores.json
```

## Result

| Condition | Builds | Files | Colour literals (builds with any) | Unknown exports | Unknown props | Other `altitude check` errors | Reviews |
|---|---|---|---|---|---|---|---|
| Claude + Altitude | 10 | 33 | **0** (0 of 10) | 2 | 0 | 0 | 2 |
| Claude + shadcn/ui | 10 | 41 | 2 (2 of 10) | n/a | n/a | n/a | n/a |
| Claude, nothing installed | 10 | 10 | 160 (10 of 10; median 18) | n/a | n/a | n/a | n/a |

"Other errors" are the remaining deterministic rules (stylesheet, provider, pie charts, OK and Submit labels), which only apply to an app using Altitude.

- **Tokens.** Altitude builds used no colour literal and no palette class: every colour came from a token. shadcn builds used two Tailwind palette classes in total. Plain builds hard-coded 1–36 colours each, in `index.html`'s styles. Plain apps have no tokens to use, so this mostly shows that the measure separates the conditions, not that Altitude's guidance caused the difference.
- **API.** Two of the ten Altitude builds (both records briefs) import `DataTableColumn`, which the package doesn't export. It's declared in `collections.tsx` but never re-exported (#427). Their bundles still built, because Vite strips type imports without checking them. No build used a prop that doesn't exist.
- **Reviews.** Both are `ALT-PRIMARY-001` in the record-view builds: an "Edit details" primary in the page header and a "Save details" primary in the editor sheet. Whether that breaks "one primary per view" depends on whether the sheet counts as its own view, which is why it's a review and not an error.

## Limits

- **Old package.** The builds used Altitude 0.2.1 (a local tarball from 31 Oct). The scorer judges them against today's sources, so an export renamed since then would count as unknown. None was found: the one unknown export was never exported.
- **One model and few samples.** One model, one sample per brief (two for two briefs), one run. Treat the numbers as a baseline to compare against, not as effects.
- **Source only.** Whether text sits on the right tier, and whether colours pass contrast, are the distinctiveness benchmark's and the framework assessor's measures.

## Next

Generate the comparison #416 and #418 ask for, following the [README](../../README.md#comparing-two-versions-of-what-agents-receive):

1. `main` before #421–#423 against after them (installed visual guidance and the new init block);
2. with and without `altitude check` in the init block (#426);
3. with and without generated examples (#425).

Three samples per brief per label.
