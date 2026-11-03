# DiffView

What changed between two versions: version history, audit-log detail ("Plan: Pro → Business"), config changes before a deploy, and edits an AI proposes to a document or record.

**Elevation.** Both versions are the record, so it lies flush on the ground with a `line` rim, as `CodeBlock` does. It has no height of its own. **Never colour alone.**
- **Additions** are `positive-soft`, with a `+` sign and "Added" in their name (`<ins>`).
- **Removals** are `critical-soft`, struck through, with a `−` sign and "Removed" (`<del>`).
- **Words that changed** inside a line take a stronger tint. A removal and the addition that replaces it are paired in order, within a block of changed lines.
- **Long unchanged runs** fold behind a lid ("6 unchanged lines"), keeping `context` lines around each change. A single unchanged line is never folded.
- **In `mode="properties"`**, each changed field shows its old value struck through beside the new.

**Restoring a version is a consequential action**, not something the diff does: follow the consequential-action pattern (a confirmation, then a receipt).

**Accessibility.** A `figure` named by its caption, with a summary first ("3 additions, 2 removals", "2 properties changed"). Previous change and Next change move focus from change to change, and so do the `n` and `p` keys while focus is inside. Signs are hidden; "Added" and "Removed" are read. Under forced colours the tints are dropped, and the signs and strike-through carry the meaning. Under `contrast="more"` each changed line gets a 2px edge in its tone.

**Props:** `mode` (`'text' | 'properties'`); `before`, `after` (texts, or records); `fields` (`{ key, label, format? }[]`, for properties); `context` (default 3); `caption`; `hunks` (precomputed line operations for large inputs; `diffLines(before, after)` makes them).

**Reviewing a proposed change.** With `review` (text mode), each change is a labelled group ("Change 3 of 7, lines 40 to 52") raised as a proposal, with Accept and Reject; the header counts "3 of 7 changes reviewed" and offers Accept all and Reject all; n and p (or ] and [) move between undecided changes. `decisions` is yours (by id, `change-1` in order; `diffChanges` lists them), as is applying them. Accepted lands flush with one afterglow; rejected is muted and collapses to "Rejected · show" after `dur-linger`. Decisions are announced ("Change 3 accepted. 4 left."). Property diffs aren't reviewable yet.

**You provide:** the two versions and a caption that names them.

```tsx
<DiffView caption="Version 4 → 5" before={v4.body} after={v5.body} context={3} />
<DiffView mode="properties" caption="Subscription changed" before={prev} after={next} fields={[{ key: 'plan', label: 'Plan' }]} />
```

- Do say which versions are compared in the caption.
- Do keep a little context around changes, so they can be read.
- Don't show a diff in red and green alone.
- Don't restore from inside the diff without a confirmation.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`DiffView` as first used in its preview:

```tsx
import { DiffView, diffChanges, diffLines } from 'altitude-design';

<DiffView caption="src/pricing.ts · proposed by the assistant" before={pricingBefore} after={pricingAfter} review decisions={decisions}
onDecide={(id, d) => setDecisions({ ...decisions, [id]: d })}
onDecideAll={(d) => setDecisions(Object.fromEntries(diffChanges(diffLines(pricingBefore, pricingAfter)).map((c) => [c.id, decisions[c.id] ?? d])))} />
```

The full preview, as rendered in Storybook and checked in CI (`dv` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { DiffView, diffChanges, diffLines } from 'altitude-design';

const v4 = `# Deploy settings
region: eu-central-1
replicas: 2
memory: 512Mi
timeout: 30s
retries: 3
logging: info
metrics: enabled
tracing: disabled
cache: 5m
health: /healthz
owner: platform-team`;
const v5 = `# Deploy settings
region: eu-central-1
replicas: 4
memory: 1Gi
timeout: 30s
retries: 3
logging: info
metrics: enabled
tracing: disabled
cache: 5m
health: /healthz
owner: platform-team
alerts: on-call`;
const pricingBefore = `export const plans = {
  starter: { monthly: 9, seats: 1 },
  pro: { monthly: 29, seats: 5 },
  business: { monthly: 99, seats: 25 },
};
export const trialDays = 14;
export const currency = 'USD';`;
const pricingAfter = `export const plans = {
  starter: { monthly: 9, seats: 1 },
  pro: { monthly: 32, seats: 5 },
  business: { monthly: 99, seats: 25, sso: true },
};
export const trialDays = 30;
export const currency = 'USD';`;
function Review() {
  const [decisions, setDecisions] = React.useState({ 'change-2': 'accept' });
  return <DiffView caption="src/pricing.ts · proposed by the assistant" before={pricingBefore} after={pricingAfter} review decisions={decisions}
    onDecide={(id, d) => setDecisions({ ...decisions, [id]: d })}
    onDecideAll={(d) => setDecisions(Object.fromEntries(diffChanges(diffLines(pricingBefore, pricingAfter)).map((c) => [c.id, decisions[c.id] ?? d])))} />;
}
export default function App() {
  return (
    <div className="dv">
      <DiffView caption="deploy.yaml · version 4 → 5" before={v4} after={v5} context={1} />
      <DiffView mode="properties" caption="Subscription changed by Maya" before={{ plan: 'Pro', seats: 12, billing: 'Monthly' }} after={{ plan: 'Business', seats: 25, billing: 'Monthly' }}
        fields={[{ key: 'plan', label: 'Plan' }, { key: 'seats', label: 'Seats' }, { key: 'billing', label: 'Billing' }]} />
      <Review />
    </div>
  );
}
```
<!-- /example -->
