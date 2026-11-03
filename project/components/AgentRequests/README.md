# AgentRequests

Every decision your agents are waiting on, in one queue: approvals, questions, reviews and failures, oldest first, each answerable where it is. Beside an `AgentFleet`, it lets a person supervising several agents clear what's waiting in a row, without opening each agent.

**Elevation: status that asks for action.**
- **A request** is a raised card (level 1), because it asks for action; it arrives lifted and settles with the afterglow. It isn't pending: nothing has been dispatched until it's answered.
- **Its kind** is a plate in words: "Needs approval", "Has a question", "Ready for review" (caution, with a lamp) or "Couldn't finish" (critical). Who's asking and "waiting 6 min" sit beside it.
- **Its answers** are secondary and ghost buttons: the view keeps its one primary. Open is a ghost at the end.
- **Nothing waiting** is said flush with a check ("Nothing needs you"): an all-clear is settled, not an opening.
- **The count** beside the heading is the one part that floats, as any count that wants you does.

**Accessibility.** A section named by its heading ("Needs you"). Requests are an ordered list, longest wait first; each is an `article` named by its ask and described by its kind, agent and wait. Open is named for the agent ("Open Billing API"). A request that arrives is announced politely once ("Billing API: Run the migration on staging?").

**Parts:** `AgentRequests` (`title`, `now`, `empty`); `AgentRequest` (`agent`, `kind`: `'approval' | 'question' | 'review' | 'failed'`, `title`, `detail`, `since`, `actions`, `onOpen`).

**You provide:** the requests (give each a stable `key`), what each answer does, and removing a request once it's answered. For a question with many options or your own answer, or an approval with scopes or edits, use Open and answer in the agent's own `Question` or `Confirmation`.

```tsx
<AgentRequests>
  {waiting.map((r) => (
    <AgentRequest key={r.id} agent={r.agent} kind={r.kind} since={r.since} title={r.title} detail={r.consequence} onOpen={() => open(r.agentId)}
      actions={<><Button size="sm" variant="secondary" onClick={() => approve(r)}>Run migration</Button><Button size="sm" variant="ghost" onClick={() => reject(r)}>Don't run</Button></>} />
  ))}
</AgentRequests>
```

- Do say the consequence of an approval in `detail`.
- Don't offer "approve all": answer each with its consequence in view.
- Don't make an answer primary; the view's one primary stays where it is.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`AgentRequests` as first used in its preview:

```tsx
import { AgentRequest, AgentRequests, Button } from 'altitude-design';

<AgentRequests now={now}>
  {left.map((r) => (
    <AgentRequest key={r.id} agent={r.agent} kind={r.kind} since={r.since} title={r.title} detail={r.detail} onOpen={() => {}}
      actions={<>{r.answers.map((a) => <Button key={a} size="sm" variant="secondary" onClick={() => done(r.id)}>{a}</Button>)}
        {r.decline && <Button size="sm" variant="ghost" onClick={() => done(r.id)}>{r.decline}</Button>}</>} />
  ))}
</AgentRequests>
```

The full preview, as rendered in Storybook and checked in CI (`ar` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { AgentRequest, AgentRequests, Button } from 'altitude-design';

const now = Date.UTC(2026, 9, 31, 14, 20), min = 60000;
const seed = [
  { id: 'emails', agent: 'Renewal emails', kind: 'question', since: now - 4 * min, title: 'Send the offer to every monthly customer, or only the active ones?', answers: ['Active only', 'Everyone'] },
  { id: 'api', agent: 'Billing API', kind: 'approval', since: now - 9 * min, title: 'Run the plans-table migration on staging?', detail: 'Adds annual price columns to 4 plans on staging. Production isn\'t touched.', answers: ['Run migration'], decline: "Don't run" },
  { id: 'qa', agent: 'QA', kind: 'failed', since: now - 1 * min, title: 'Checkout tests failed', detail: '2 of 14 failed: the annual total shows $290/yr, expected $290/year.', answers: ['Retry'] },
];
export default function App() {
  const [left, setLeft] = React.useState(seed);
  const done = (id) => setLeft((l) => l.filter((r) => r.id !== id));
  return (
    <div className="ar">
      <AgentRequests now={now}>
        {left.map((r) => (
          <AgentRequest key={r.id} agent={r.agent} kind={r.kind} since={r.since} title={r.title} detail={r.detail} onOpen={() => {}}
            actions={<>{r.answers.map((a) => <Button key={a} size="sm" variant="secondary" onClick={() => done(r.id)}>{a}</Button>)}
              {r.decline && <Button size="sm" variant="ghost" onClick={() => done(r.id)}>{r.decline}</Button>}</>} />
        ))}
      </AgentRequests>
    </div>
  );
}
```
<!-- /example -->
