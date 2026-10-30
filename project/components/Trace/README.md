# Trace

The steps an agent takes (searching, calling tools, reasoning, waiting for approval), so people can see what it did, what it's doing, what it plans, and where it failed.

**Elevation: a process, drawn as a vertical `Stepper`.** Stepper's rule, verbatim: "done steps are flush in the record with a stamped check, the current one stands raised on its wall, steps to come are imprints."
- **Done:** flush, stamped check, "Done · 820ms".
- **Running:** raised on its wall, "Running", `aria-current="step"`. **No spinner:** loading in Altitude is a held press or an imprint, never a spinner. The mark holds a small steady lamp.
- **Planned:** an imprint, "Planned". If the agent can't know its plan, leave planned steps out: steps then appear as they start, with the afterglow (at most four at once).
- **Failed:** drops to a trench with a `critical` rim, the reason, and Retry.
- **Waiting for approval:** raised like a running step, holding a `Confirmation`, the "Proposed" reading.
- **Detail** sits under its step behind `Accordion` lids: `TraceToolCall` (the tool's name; input and output in `CodeBlock`s) and `TraceReasoning` ("Thought for 2.1s", closed by default).

**Accessibility.** An ordered list (as `Stepper`), each step's state in words. Step changes are announced politely and throttled ("Done: Read 3 articles"), because an agent can finish several steps a second. Failures and approval requests are announced at once. Under forced colours a failed step is dashed thick.

**Parts:** `Trace` (`aria-label`); `TraceStep` (`title`, `status` (`'planned' | 'running' | 'done' | 'failed' | 'awaiting-approval'`), `duration` (ms), `error`, `onRetry`); `TraceToolCall` (`name`, `input`, `output`, `defaultOpen`); `TraceReasoning` (`duration`).

**You provide:** the steps and their status from your agent's events.

```tsx
<Trace aria-label="Agent run">
  {run.steps.map((s) => (
    <TraceStep key={s.id} title={s.title} status={s.status} duration={s.ms}
      onRetry={s.status === 'failed' ? () => retry(s.id) : undefined}>
      {s.tool && <TraceToolCall name={s.tool.name} input={s.tool.input} output={s.tool.output} />}
    </TraceStep>
  ))}
</Trace>
```

- Do say why a step failed.
- Do put an approval request in the step that's waiting.
- Don't draw spinners or nested cards.
- Don't invent planned steps the agent hasn't planned.
