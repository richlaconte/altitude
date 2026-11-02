# Model-judged first impression, 2026-11-02

Research E161 has the findings. This folder is the record: `tables.md` and `summary.json` come from `node evals/first-impression/model-judge/analyse.mjs --run <this folder>`, which reproduces them from the files here.

| File | What it is |
|---|---|
| `key.json` | Each random stimulus id with its condition, brief and source. Not given to any judge or coder. |
| `sessions.json` | The seed (`2026-11-02`) and each session's order. |
| `judges.json` | The model for each session: 1–3 Opus 5.5, 4–5 Sonnet 5.5. |
| `answers/` | Each session's 36 answers, as written. |
| `codes.jsonl` | The coder's codes for all 758 cues, then its `new:` labels. |
| `answers-check.jsonl`, `codes-check.jsonl` | The 20% sample (36 answers, drawn with seed `codes-check`) and the second coder's codes for it. |
| `anchor/` | The 8 human-made screens as captured (1200 × 1200), with `capture.mjs`'s index. |

## Deviations from the issue's spec

- **One session, all screens.** Each judge session saw all 36 screens in turn, not one screen per session, so later answers can lean on earlier ones. The orders differ by session.
- **No other model family.** No API key for another vendor's model was available. Three sessions ran on Opus 5.5 and two on Sonnet 5.5, and results are reported per model.
- **A discarded first launch.** In the first launch, the anchor's brand replacement also rewrote the AdminLTE logo's file path, so the logo rendered as broken alt text. It was found while the judges were running, before any answer was read. All sessions were stopped, `anchor.mjs` was changed to edit visible text only, and all five were rerun on the corrected set. Answers from the first launch were deleted unread.
- **The anchor didn't calibrate.** Judges recognised the templates' era and style despite the edits (see E161), so d′ against them isn't reported as discrimination.
- **A stricter bar for new tells.** The issue's bar was 20% of a built condition's "ai" answers. A label also had to be cited by at least 4 of the 5 sessions across both models, on 2 or more briefs, by more than Altitude's builds alone, and not be covered by an existing tell. Two pairs were merged (every section in a card with the page in one card, and clipped text with awkward wrapping).

## Anchor sources

The anchor screenshots are of MIT-licensed templates, with brand names and years replaced:

- Tabler `tabler-ui@0.0.32`. Copyright (c) 2018 Paweł Kuna. MIT License.
- AdminLTE `v3.0.5`. Copyright (c) 2014–2020 ColorlibHQ. MIT License.
