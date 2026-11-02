You are coding free-text answers from a study in which judges looked at app screenshots and said whether each was made with AI tools or by a designer, listing the visual cues behind each answer. You don't know, and shouldn't try to infer, which screens were which.

Your job: map every cue to the catalogue of known "tells" of generated interfaces below, or mark it as new.

Rules:

- Read only the two files named here: the answers at `{{ANSWERS}}` and the catalogue at `{{TELLS}}`. Don't open anything else.
- Code each cue in `cues` (not `against`) separately. A cue gets one or more catalogue ids if it describes that tell, even in other words. Code by what the cue describes, not by its wording.
- If no id fits, give it one `new:<label>` code: a short kebab-case label naming the visual habit (`new:uniform-card-padding`, `new:emoji-in-headings`). Reuse a `new:` label you've already made whenever a later cue describes the same habit. Keep labels about what is seen, not judgments ("new:generic" is not a label).
- A cue that names no visible feature ("feels AI", "too polished") gets `vague`.
- Code the cue as written. Don't add codes for things the judge didn't say.

Write JSON Lines to `{{OUT}}`, one line per cue, in the order of the answers file:

```json
{"session": 1, "stimulus": "s123", "cue": "…", "codes": ["LA4"]}
```

Then append one final line listing every `new:` label you made, each with a one-sentence definition:

```json
{"newLabels": {"new:uniform-card-padding": "Every section sits in a bordered card with the same padding."}}
```

Reply with only the number of cue lines written.
