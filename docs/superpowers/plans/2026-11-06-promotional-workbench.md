# Promotional workbench implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development for bounded tasks and independent review.

**Goal:** Implement the approved interactive promotional homepage in an isolated worktree.

**Architecture:** Keep the existing static React/esbuild publishing pipeline. Separate the workbench scenes from the editorial page; compose the shipped components inside a single provider. Keep CSS for the workbench separate and retain shared rules needed by agent.html.

**Tech Stack:** React 19, TypeScript, Altitude components/tokens, esbuild, browser verification through CUA.

## Chunk 1: Homepage

- [x] Create feat/promotional-workbench at .claude/worktrees/codex-promotional-workbench from fetched origin/main.
- [x] Establish baseline with npm run build-site and npm run typecheck.
- [x] Implement site/workbench.tsx and site/workbench.css: state-preserving scene tabs, real Board with non-drag move controls, real InlineEdit with simulated failed-save retry, real review components with accept/reject and reset. Use token styles and scoped classes. Verify state transitions, duplicate/stale actions, and retained drafts.
- [x] Replace site/main.tsx editorial page: short hero, workbench, example gallery, install/agent setup, compact footer. Reuse CodeBlock and real links. Keep one provider and short copy.
- [x] Update site/site.css for the new composition while retaining the agent-page utilities; update scripts/build-site.mjs for additional CSS, embedded preview images, and metadata. Capture actual example previews into site/assets/ without altering the examples.
- [x] Compile the site and typecheck site entry points in addition to existing typecheck. Inspect the built page, scene interactions, theme switch, links and example images.
- [x] Check 320/390px and desktop layouts, keyboard scene navigation and board movement, note cancellation/failure/retry, review accept/reject/reset, reduced-motion styles, and console errors.
- [x] Request independent spec and code review, resolve actionable findings, repeat only affected checks.
- [x] Commit the isolated work and provide a reviewable local preview and concise validation summary. Keep the branch/worktree available; do not merge or publish.

## Verification record

- `npm run build-site`: passed; homepage, agent demo, eight examples and guidance generated.
- `npm run typecheck`: passed, including the new site TypeScript project.
- `npm run check:tells-lint`: passed after replacing the note demo's decorative zero-padded labels with a semantic bulleted list. This resolves the initial CI run's two LA8 findings.
- `node --test site/workbench-state.test.mjs`: 3/3 passed (invariants, latest-location moves/cancellation, invalid requests).
- `node scripts/build-guidance.mjs` then `node scripts/altitude-cli.mjs check site --json`: no deterministic findings. The contextual two-provider finding is intentional: main.tsx and agent.tsx are independent pages with separate roots.
- `git diff --check`: passed.
- Browser: desktop 1280px, mobile 390px and 320px; both color schemes; no page overflow or console errors; real preview images decoded; setup tabs and anchor work; agent.html retains its layout.
- Interactions: task move buttons; continuous keyboard arrows/drop/Escape at narrow widths; scene keyboard navigation and retained state; note cancel, failed save with retained draft, retry, and reset during save; review approve/reject/replay and reset during approval. Focus stays in the active view.
- Review fixes: restore Report an issue, avoid header wrapping at 320px, reveal keyboard-moved cards using layout offsets despite FLIP animation. Independent spec and final code reviews approved.
- Reduced-motion and forced-color support reviewed in the reused component styles and scoped page CSS; OS media preferences were not changed for runtime emulation.
- Main checkout retained its original unrelated modifications; implementation and dependencies are isolated in codex-promotional-workbench.
