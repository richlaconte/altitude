# Recognition cues implementation plan

**Goal:** Resolve #617 with affirmative, evidence-scoped recognition guidance and a reviewed existing complete example.

**Architecture:** Keep `Distinctiveness.md` as the visual rationale and `screen-layout.md` as the design-record contract. Metadata identifies a contextual review rule; the Support inbox uses its current public primitives and records the recognition task. Package guidance is generated from these sources.

**Tech stack:** Markdown, JSON metadata, React example, existing Playwright checks and package tooling.

- [x] Update `project/Distinctiveness.md` to distinguish meaningful cues, useful redundancy and decoration, and replace the overcompressed final checklist item.
- [x] Add the recognition/evidence record to `project/framework/patterns/screen-layout.md`, link it from the framework entry, and update metadata/rule/evidence records without deterministic aesthetic linting.
- [x] Document the Support inbox recognition task in its design record and add focused semantic/layout checks to its existing browser suite. Keep seed content and application behavior unchanged.
- [x] Inspect desktop, 320px and forced-color/reduced-motion screenshots; record observations and limits in the research record.
- [x] Bump patch version, regenerate package guidance and design-system artifacts, run typecheck, schema/reference/freshness, complete-example and framework/installed-consumer checks.
- [ ] Review the diff against every #617 acceptance item, commit and push the PR, and request independent review before marking it ready.
