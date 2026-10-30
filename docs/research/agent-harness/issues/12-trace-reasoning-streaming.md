<!--
title: Trace: show reasoning while it streams
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`TraceReasoning` (part of `Trace`).

## What you're trying to do

Reasoning models think for seconds or minutes before answering, and harnesses show that it's happening ("Thinking…"), let the person open it to read along, and replace it with "Thought for 12s" when it's done. Some providers return only a summary or redact the reasoning. Today `TraceReasoning` only knows the finished state, so apps show a spinner or AI Elements' `Shimmer` (light sweeping across text), which Altitude rules out.

## Today

`TraceReasoning` takes `duration` and children and renders an `Accordion` titled "Thought for 12s" or "Reasoning", closed by default (`project/components/src/trace.tsx#L114`).

## Proposal

```tsx
<TraceReasoning status={r.status /* 'streaming' | 'complete' | 'redacted' */} duration={r.ms} followWhileOpen>
  <Markdown streaming={r.status === 'streaming'}>{r.text}</Markdown>
</TraceReasoning>
```

- `streaming`: the lid says "Thinking…"; opened, the text follows its end while it arrives (as `Conversation` does); closed by default.
- `complete`: "Thought for 12s" (today's behaviour).
- `redacted`: "Reasoning hidden by the provider", no lid to open.

**Additive?** yes (`status` defaults to `complete`)

## Elevation impact

Reasoning still arriving is "not yet the record", the same as a streaming answer: on the ground under a dashed rule, not lifted, not glowing.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Streaming, closed | Ground (lid) | 0 | `Accordion` lid | "Thinking…", `aria-busy` |
| Streaming, open | compartment | −1 | `Accordion` compartment, dashed `line-control` rule | "Thinking…" |
| Complete | as today | — | — | "Thought for 12s" |
| Redacted | Ground | 0 | flush, no lid | "Reasoning hidden by the provider" |

No ticking elapsed counter in the lid: a counting number is a motion Altitude avoids for values (`Stat`, `FormattedNumber`). The duration is said once, when it's known.

## Motion and accessibility

No shimmer, no pulsing dots. Completion swaps "Thinking…" for "Thought for 12s" with a cross-fade. Reasoning text is never announced; the change to complete is part of the step's throttled announcement. Under reduced motion nothing changes except the cross-fade becoming instant. Forced colours: dashed rule becomes dotted.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #152.
