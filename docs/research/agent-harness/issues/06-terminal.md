<!--
title: New: Terminal — a command's output as it runs, with its exit status
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

Coding agents run commands (`npm test`, `git status`, a migration) and the person watches the output arrive, then reads how it ended. AI Elements has `Terminal`; Claude Code and Cursor show the command, its streaming output, stderr, the exit code and the duration, with Stop for a long run. `CodeBlock streaming` covers code being written, but not a process: it has no exit status, no stderr, doesn't follow the bottom, and can't be stopped.

**Closest existing components:** `CodeBlock` (flush mono record, streaming rule, copy), `Conversation` (follows the bottom until you scroll up), `TraceToolCall` (where a command call is shown inside a step).
**Name:** `Terminal`.

## Elevation story

**What it is:** settled once finished; "not yet the record" while running
**Signal it carries:** "Code" and "Streaming"
**Relatives it borrows from:** the frame is `CodeBlock` (flush, 1px `line` rim, mono, no shadow); running uses `CodeBlock`'s dashed rule; following the bottom and "Jump to latest" are `Conversation`'s; Stop is `PromptInput`'s held live action.

| Part / state | Tier | Level | Surface · shadow | Non-height cue (word, icon, ARIA state or border) |
|---|---|---|---|---|
| Frame | Ground | 0 | `surface-ground` · none, 1px `line` rim | `figure` named by the command |
| Command line | Ground | 0 | none | `$ npm test`, mono |
| Running | Ground | 0 | dashed `line-control` rule down the left | "Running", `aria-busy` |
| Stop (while running) | Raised | 1 | ghost-to-secondary `Button` · `elev-1` | "Stop command" |
| stdout | Ground | 0 | none | — |
| stderr lines | Ground | 0 | a `critical` mark in the gutter | "stderr" in the line's accessible text |
| Exited 0 | Ground | 0 | solid rule; one afterglow | check icon, "Exited with 0 · 4.2s" |
| Exited non-zero | Ground | 0 | `critical` rule | status icon, "Exited with 1 · 4.2s" |
| Stopped | Ground | 0 | solid `line` rule | "Stopped by you" |
| Truncated | Ground | 0 | none | "Show 1,204 earlier lines" |
| Jump to latest | Floating | 3 | `ConversationScrollButton` · `elev-3` | "Jump to latest output" |

## Motion

Output appends without animation. Finishing: one afterglow (as `Message`). "Jump to latest" rises to level 3 when you scroll up (as `ConversationScrollButton`). Under reduced motion nothing travels.

## Accessibility

**WAI-ARIA pattern:** a `figure` containing a `log` region with `aria-live="off"`, focusable for keyboard scrolling (as `CodeBlock`'s overflow region).
**Keyboard:** Tab reaches the region, Copy and Stop; arrows scroll; Escape (inside it) stops a running command only if `stopOnEscape`.
**Screen reader:** output isn't announced line by line; completion is announced once ("npm test exited with 1 after 4.2 seconds"). stderr lines are prefixed in accessible text.
**Forced colours:** rim `CanvasText`; running rule dotted; stderr mark becomes a `Mark` glyph.
**`contrast="more"`:** rim and rules `line-control`.

## API sketch

```tsx
<Terminal command="npm test" output={chunks /* string | { text, stream: 'stdout' | 'stderr' }[] */}
  status={run.status /* 'running' | 'exited' | 'stopped' */} exitCode={run.code} duration={run.ms}
  onStop={run.status === 'running' ? stop : undefined} maxLines={400} ansi />
```

`ansi`: map ANSI colours to `ink`, `ink-muted`, `accent-ink`, and the status inks for red, yellow and green; strip the rest.

## Rules it strains (optional)

ANSI red, yellow and green would put `critical`, `caution` and `positive` on text. The README says those are for status, which a failing test line arguably is, but they must clear 4.5:1 as text on `surface-ground` in all four schemes before this is allowed; otherwise map them all to `ink` and keep the meaning in the exit line.

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/Terminal/README.md` in the existing format (what it is, elevation, props, "You provide", do and don't)
- [ ] A section in `build/previews.txt` with an honest `@dsCard` group and subtitle
- [ ] A row in the signals table in `Elevation.md`; new choreography in `Motion.md`; sources and a prototype review in `Research.md`
- [ ] `tsc` clean; `shoot.mjs` renders it in all four schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`
- [ ] Keyboard paths checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed (CI fails otherwise)

## Open questions (optional)

- A `CodeBlock` variant (`kind="output"`) instead of a new component? A process has state that code doesn't (exit, stop, stderr, follow), which argues for its own component sharing `CodeBlock`'s frame.

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #152.
