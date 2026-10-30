<!--
title: Trace: nested and parallel steps, for subagents
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Trace` and `TraceStep`.

## What you're trying to do

Agents delegate: a coding agent starts three subagents to research in parallel, each with its own steps; a planner runs a search step that is itself a small agent. The person needs to see "3 running in parallel", open one to see its steps, and know when all of them have finished. `Trace` is one flat ordered list with one current step, so apps either flatten everything (losing who did what) or nest `Trace`s by hand with no rule for how a step holding a run should look.

## Today

`Trace` is a vertical `Stepper`: "done steps are flush in the record with a stamped check, the current one stands raised on its wall, steps to come are imprints" (`project/components/Trace/README.md`). `TraceStep` children are `TraceToolCall` and `TraceReasoning` behind `Accordion` lids (`project/components/src/trace.tsx#L62`).

## Proposal

```tsx
<Trace aria-label="Agent run">
  <TraceStep title="Research pricing pages" status="running">
    <TraceParallel label="Subagents">
      <TraceStep title="Stripe" status="done" duration={8200}><Trace aria-label="Stripe subagent">…</Trace></TraceStep>
      <TraceStep title="Paddle" status="running"><Trace aria-label="Paddle subagent">…</Trace></TraceStep>
      <TraceStep title="Lemon Squeezy" status="failed" error="Page returned 403" onRetry={retry} />
    </TraceParallel>
  </TraceStep>
</Trace>
```

- A `Trace` inside a `TraceStep` is a nested run, behind a lid ("6 steps · 1 running"), closed by default unless it's running or failed.
- `TraceParallel` groups steps that run at once; its summary says "2 of 3 done · 1 failed".
- A parent step is done only when its children are; its status can be derived (`status="auto"`).

**Additive?** yes

## Elevation impact

Stepper has one current step. In parallel, several steps are live at once; each is raised on its wall, because each is in play. That's not two meanings one level apart; it's the same meaning several times, and a word carries the count.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Parallel group | Ground | 0 | a 1px `line-control` bracket (as `FilterBar`'s group) | "3 in parallel · 2 of 3 done" |
| Each running child | Raised | 1 | as a running `TraceStep` | "Running" |
| Nested run, closed | Ground | 0 | `Accordion` lid | "6 steps · 1 running" |
| Nested run, open | Raised lid, sunk compartment | 1 / −1 | `Accordion` | `aria-expanded` |

## Motion and accessibility

None new beyond `Stepper` and `Accordion`. Nested runs are nested `ol`s; the parallel group is a labelled `group`. Announcements stay throttled across all levels ("Done: Stripe (subagent)"), and failures in a subagent are announced immediately with the parent's name.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #152.
