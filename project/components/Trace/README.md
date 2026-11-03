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

**Subagents.** A `Trace` inside a `TraceStep` is a nested run: a nested list behind a lid that says how it's going ("6 steps · 1 running"), open while something in it is running, waiting or failed, closed when it's all done. `TraceParallel label="Subagents"` groups steps that run at once, with a bracket and "3 in parallel · 2 of 3 done · 1 failed"; several can be raised at once, each because it's in play. `status="auto"` derives a parent from its children: running while any run, failed once the rest stop, done only when all are. Nested steps announce through the outer Trace with their run's name.

**Reasoning as it streams.** `TraceReasoning status="streaming"` says "Thinking…" on its lid; opened, the text follows its end as it arrives, behind a dashed rule (not the record yet), until the person scrolls up. Complete, it's "Thought for 12s"; `status="redacted"` says "Reasoning hidden by the provider" with nothing to open. No shimmer, pulsing dots or ticking counter.

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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Trace` as first used in its preview:

```tsx
import { Confirmation, Trace, TraceReasoning, TraceStep, TraceToolCall } from 'altitude-design';

<Trace aria-label="Agent run: answer refund question">
  {plan.map((s, i) => (
    <TraceStep key={s.id} title={s.title} status={status(i)} duration={i < at ? s.ms : undefined}
      error={failed && i === at ? 'The billing service timed out.' : undefined} onRetry={failed && i === at ? () => { setRetried(true); setFailed(false); } : undefined}>
      {s.tool && <TraceToolCall name={s.tool.name} input={s.tool.input} output={i < at ? s.tool.output ?? { plan: 'annual', startedDaysAgo: 20 } : undefined} />}
      {s.reasoning && i < at && <TraceReasoning duration={s.ms}>{s.reasoning}</TraceReasoning>}
      {s.approval && <Confirmation state={approval} title="Send reply to Jamie Lee" consequence="Jamie will get an email confirming a full refund of €240." approveLabel="Send reply" rejectLabel="Don't send" runningLabel="Sending…" doneLabel="Sent"
        onApprove={() => { setApproval('running'); setTimeout(() => setApproval('done'), 1000); }} onReject={() => setApproval('rejected')} />}
    </TraceStep>
  ))}
</Trace>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `tc` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Confirmation, Trace, TraceParallel, TraceReasoning, TraceStep, TraceToolCall } from 'altitude-design';

const plan = [
  { id: 's1', title: 'Search the help centre', ms: 820, tool: { name: 'search_documents', input: { query: 'refund policy annual plans', limit: 5 }, output: { results: 3 } } },
  { id: 's2', title: 'Read 3 articles', ms: 1400 },
  { id: 's3', title: 'Check the customer’s plan', ms: 600, fails: true, tool: { name: 'get_subscription', input: { customer: 'cus_EXAMPLE42' } } },
  { id: 's4', title: 'Draft a reply', ms: 2100, reasoning: 'The customer is 20 days into an annual plan, so the 30-day full refund applies. No proration needed.' },
  { id: 's5', title: 'Send the reply', approval: true },
];
export default function App() {
  const [at, setAt] = React.useState(0);
  const [failed, setFailed] = React.useState(false);
  const [retried, setRetried] = React.useState(false);
  const [approval, setApproval] = React.useState('requested');
  React.useEffect(() => {
    if (failed || at >= plan.length - 1) return;
    const step = plan[at];
    const t = setTimeout(() => { if (step.fails && !retried) setFailed(true); else setAt(at + 1); }, step.ms);
    return () => clearTimeout(t);
  }, [at, failed, retried]);
  const status = (i) => (i < at ? 'done' : i > at ? 'planned' : failed ? 'failed' : plan[i].approval ? (approval === 'done' ? 'done' : 'awaiting-approval') : 'running');
  return (
    <div className="col tc">
      <Trace aria-label="Agent run: answer refund question">
        {plan.map((s, i) => (
          <TraceStep key={s.id} title={s.title} status={status(i)} duration={i < at ? s.ms : undefined}
            error={failed && i === at ? 'The billing service timed out.' : undefined} onRetry={failed && i === at ? () => { setRetried(true); setFailed(false); } : undefined}>
            {s.tool && <TraceToolCall name={s.tool.name} input={s.tool.input} output={i < at ? s.tool.output ?? { plan: 'annual', startedDaysAgo: 20 } : undefined} />}
            {s.reasoning && i < at && <TraceReasoning duration={s.ms}>{s.reasoning}</TraceReasoning>}
            {s.approval && <Confirmation state={approval} title="Send reply to Jamie Lee" consequence="Jamie will get an email confirming a full refund of €240." approveLabel="Send reply" rejectLabel="Don't send" runningLabel="Sending…" doneLabel="Sent"
              onApprove={() => { setApproval('running'); setTimeout(() => setApproval('done'), 1000); }} onReject={() => setApproval('rejected')} />}
          </TraceStep>
        ))}
      </Trace>
      <Trace aria-label="Agent run: compare billing providers">
        <TraceStep title="Plan the comparison" status="done" duration={900} />
        <TraceStep title="Research pricing pages" status="auto">
          <TraceParallel label="Subagents">
            <TraceStep title="Stripe" status="auto">
              <Trace aria-label="Stripe subagent">
                <TraceStep title="Open the pricing page" status="done" duration={1200} />
                <TraceStep title="Extract the fees" status="done" duration={3400} />
              </Trace>
            </TraceStep>
            <TraceStep title="Paddle" status="auto">
              <Trace aria-label="Paddle subagent">
                <TraceStep title="Open the pricing page" status="done" duration={1500} />
                <TraceStep title="Extract the fees" status="running" />
              </Trace>
            </TraceStep>
            <TraceStep title="Lemon Squeezy" status="failed" error="The pricing page returned 403." onRetry={() => {}} />
          </TraceParallel>
        </TraceStep>
        <TraceStep title="Weigh the fees" status="running">
          <TraceReasoning status="streaming">{'Stripe charges 2.9% + 30¢ per card payment. Paddle is a merchant of record, so its 5% + 50¢ includes sales tax handling, which'}</TraceReasoning>
        </TraceStep>
        <TraceStep title="Check the provider's notes" status="done" duration={2400}>
          <TraceReasoning status="redacted" />
        </TraceStep>
        <TraceStep title="Write the comparison" status="planned" />
      </Trace>
    </div>
  );
}
```
<!-- /example -->
