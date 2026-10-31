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
