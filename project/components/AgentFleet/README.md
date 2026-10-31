# AgentFleet

Every agent working on one job, as a roster: grouped by what they need from you (needs you, working, done), each row saying the agent's state in words, what it's doing in one line, how long it has waited or run, where it is in its plan and what it has spent, with warnings for trouble that's coming (two agents changing one file, an agent making no progress). For supervising several agents at once; see [the research](../../../docs/research/agent-orchestration/README.md).

**Elevation: a record of agents, with live rows.**
- **Rows** are the record: flush at rest, lifting one level when pointed at because selecting one opens it. The open agent is selected, as a table's row is: `accent-soft`, raised one level, `aria-current`.
- **Working** isn't pending (nothing you sent is in flight), so it never hovers: a plate with a steady accent lamp says "Working". No spinner.
- **Needs you** ("Needs approval", "Has a question", "Ready for review") is a caution plate with a lamp, and "waiting 6 min". It doesn't rise: a row can't lift into a card inside a list, and `AgentRequests` holds the raised card.
- **Stalled** ("No progress for 7 min", "Retried the same step 3 times") is a caution plate and a clock mark, in the working group: a suspicion, not a request.
- **Blocked** says on what ("Waiting on Billing API"); **queued** is a neutral plate. **Failed** is a critical plate and leads with the agents that need you, since nothing happens until someone retries or stops it.
- **Done** is stamped: a check, the name in muted ink, "took 9 min". The done group folds away.
- **A conflict** is a flush `caution-soft` strip under the row naming the file and the other agent: never colour alone.
- **Agents an agent started** hang under it in a 1px `line-control` bracket, as `TraceParallel` draws subagents.

**Accessibility.** A region named by `aria-label` ("Agents"). Each group is a list named with its count ("Needs you, 2"); a collapsible group's heading is a button with `aria-expanded`. Each row is a button whose name says everything in order: "Billing API, waiting 6 min, Wants to run the migration on staging, Needs approval, Step 3 of 4, spent $0.38". Up and Down move between rows across groups; Home and End go to the first and last. An agent that starts needing you (or fails) is announced politely once; starting, progress, stalling and finishing aren't.

**Parts:** `AgentFleet` (`aria-label`, `now`, `summary`); `AgentFleetGroup` (`label`, `count`, `collapsible`, `defaultOpen`, `empty`); `AgentFleetItem` (`name`, `state`: `'queued' | 'working' | 'needs-input' | 'blocked' | 'stalled' | 'failed' | 'done' | 'stopped'`, `needs`: `'approval' | 'question' | 'review'`, `activity`, `since`, `startedAt`, `endedAt`, `step`, `blockedBy`, `conflict`, `stalledReason`, `cost`, `output`, `selected`, `onSelect`, `children`). Helpers: `groupAgents(agents, get)` sorts into needs you (longest wait first), working (stalled first) and finished (newest first); `summarizeFleet(states)` writes "2 need you · 3 working · 4 done"; `formatSpan(ms)` writes "6 min".

**You provide:** the agents and their states, a one-line `activity` for each (the agent's last status, or a summary from a small model), when each entered its state, and what selecting does (open it beside the fleet). Detecting a stall or a conflict is yours too: pass `state="stalled"` when an agent has made no progress for a while or repeats a step, and `conflict` when two agents change the same file.

```tsx
const g = groupAgents(agents, (a) => a);
const row = (a) => <AgentFleetItem key={a.id} {...a} selected={a.id === open} onSelect={() => setOpen(a.id)} />;
<AgentFleet summary={summarizeFleet(agents.map((a) => a.state))}>
  <AgentFleetGroup label="Needs you" empty="Nothing needs you.">{g.needsYou.map(row)}</AgentFleetGroup>
  <AgentFleetGroup label="Working">{g.working.map(row)}</AgentFleetGroup>
  <AgentFleetGroup label="Done" collapsible defaultOpen={false}>{g.finished.map(row)}</AgentFleetGroup>
</AgentFleet>
```

- Do sort by need: the agent waiting longest on you goes first.
- Do say every state in words; the lamp and mark only repeat it.
- Don't show a spinner, a ticking counter or make a working row hover.
- Don't lay agents out as a grid of equal cards: the one that needs you gets lost among the ones that don't.
