# Detail surfaces implementation plan

> **For agentic workers:** Use the executing-plans workflow in this isolated worktree; the parent coordinates independent issue agents and cross-review.

**Goal:** Resolve #616 with a scoped detail chooser and an existing records example whose source correspondence and focus recovery are checked.

**Architecture:** Canonical Markdown owns the chooser; JSON owns contextual rule/evidence metadata. The existing AppSkeleton composes public components and owns its disappearing-source focus fallback. Generated guidance and previews stay derived.

**Tech Stack:** Markdown/JSON, React fixture, Playwright, existing guidance/package builders.

- [x] Add the scoped chooser and design-record contract to `project/framework/patterns/screen-layout.md`; update `screen-layout.json`, `rules.json` (`ALT-LAYOUT-002`) and `evidence.json` with source authority and limits.
- [x] Route `project/framework/app-skeleton.md`, relevant component guides and edit-record guidance to the chooser. Correct Sheet level 4 versus the level-5 summit and retain the current modal example with an explicit rationale.
- [x] Add a complete design record to `build/fixtures/patterns/app-skeleton.jsx`. Extend `build/checks/app-skeleton.mjs` with removed-source recovery first; run it and observe failure on the old fixture.
- [x] Implement application-owned source capture and named focus fallback after modal isolation releases, preserving a newer focus destination. Re-run the regression and add source-update, long-content, keyboard/narrow/reduced-motion checks.
- [x] Extend `build/checks/package-consumer.mjs` so the installed guidance resolves the chooser/rule and their source metadata.
- [x] Run `node scripts/pattern-previews.mjs`, `node build.mjs && node previews.mjs` in `build/`, and `npm run build`; bump patch version with `npm version patch --no-git-tag-version` before the final package build.
- [x] Run `npm run typecheck`, `npm run check:framework`, AppSkeleton both-scheme renders/checks, and freshness checks. Inspect screenshots. Record commands, scope and limitations in the research validation record; commit and push; parent cross-reviews before marking ready.
