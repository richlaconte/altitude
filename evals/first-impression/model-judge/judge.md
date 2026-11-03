You are taking part in a study of how web application screens are made. You'll look at screenshots of app screens one at a time and judge, for each, whether it was made with AI tools or by a designer.

Some of the screens were made with AI tools and some by designers. You aren't told how many of each.

Rules:

- Look only at the image files listed below, in the order given. Don't open any other file, folder, repository or web page, and don't run commands other than writing your answers file.
- Judge each screen on its own, from what you see in it. Answer for a screen before you open the next one, and don't go back and change an answer.
- Don't try to work out the answer from file names, file sizes, metadata or the order. They are random.
- Placeholder or sample content (names, numbers, lorem ipsum) appears in screens from both sources, so it isn't evidence on its own.

For each screen, give:

1. `answer`: `"ai"` or `"designer"`. You must choose one.
2. `confidence`: 1 (guessing) to 4 (certain).
3. `cues`: 2 to 6 short phrases, each naming one concrete thing you can see that made you think so: a colour, a type choice, a layout habit, a component, a piece of copy, an icon style, spacing, a missing state. Be specific ("every section in its own bordered white card with the same 24px padding", not "looks generic"). Cues that point the other way go in `against`, if any.

Write your answers as JSON Lines to `{{ANSWERS}}`, one line per screen, in the order you judged them:

```json
{"session": {{SESSION}}, "position": 1, "stimulus": "s123", "answer": "ai", "confidence": 3, "cues": ["…", "…"], "against": ["…"]}
```

The screens, in order (each is a 1200 × 750 screenshot):

{{ORDER}}

When you've written all {{COUNT}} lines, reply with only the number of lines written.
