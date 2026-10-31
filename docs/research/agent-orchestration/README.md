# An orchestration view in Altitude: research and design

October 2026 · a research pass on what a person needs when several agents work at once, and the view Altitude builds from it: three new components (`AgentFleet`, `AgentRequests`, `AgentLanes`) and a working example, `build/fixtures/patterns/agent-orchestration.jsx`, shown on the "Altitude for agents" page under the single-run harness.

**The question.** The agent harness (#286, `docs/research/agent-harness/`) covers one person and one agent run: a conversation, a trace, approvals, review. Agent products have since moved to running many at once: a lead agent that splits work into tasks, several coding agents in parallel worktrees, background sessions you check in on. What does a person need to supervise them, and what does Altitude have to add?

**The short answer.** Supervising is a different job from conversing. You aren't watching one stream; you're spending a small amount of attention across many, and most of the time nothing needs you. The view has to (1) route your attention to what's waiting on you, longest wait first; (2) let you answer in place, without opening each agent; (3) catch trouble early (two agents changing one file, an agent making no progress, a failure); (4) say what each agent is doing in one line; (5) let you open one to steer it; and (6) show where the time went, above all the time agents spent waiting on you, the cost a fleet hides.

---

## 1. Method

| Step | What was done |
|---|---|
| Read the system | `Elevation.md` (every agent row and "States that don't rise"), `Charts.md`, the agent harness research and fixture, `ThreadList`, `Trace`, `Confirmation`, `Question`. |
| Surveyed products | Claude Code's agent view (`claude agents`, its documentation), GitHub's Agent HQ and Mission Control (launch posts and the orchestration guide), Cursor's Agents window (its forum requests and replies), Vibe Kanban, and open-source orchestrators (Orchestra, Agent Orchestrator, Mission Control by builderz-labs). Agent observability: AgentOps' timeline, LangSmith-based dashboards. |
| Read the human factors | Supervisory control of multiple robots and aircraft (Crandall et al. 2011 on attention allocation; work on a single operator commanding several vehicles, with observability and directability as principles), Endsley's three levels of situation awareness, interruption and resumption-lag research (Iqbal and Horvitz 2007; Cutrell et al. 2000). |

Not done: no user study. The design choices below are argued from the sources and from Altitude's rules, not measured.

## 2. What the field converged on

**Group by what the agent needs from you, not by when it started.** Claude Code's agent view groups sessions as Pinned, Ready for review, Needs input, Working, Completed; the header counts what's awaiting input, and the terminal tab says "2 awaiting input". Cursor's users asked for exactly this ("one agent might be waiting for user approval without me knowing it's stuck"), and its answer is a status grouping with a "Needs attention" section. Vibe Kanban uses board columns (In progress, Review, Done). Waiting on you is the state that leads everywhere.

**One line per agent, written for you.** Claude Code's rows carry a state icon, the name, a one-line summary of the current activity, question or result (written by a small model, refreshed at most every 15 seconds), the age, and a PR label coloured by its checks. Cursor's users ask for descriptive titles rather than the first prompt.

**Answer without attaching.** Claude Code's peek panel shows the full question and takes a reply, a number for a choice, without opening the session. GitHub's Mission Control has steering controls (pause, refine, restart) beside the log.

**What to watch for.** GitHub's guide lists when to intervene: failing tests or repeated auth failures, unexpected files in the diff, changes to shared configuration, scope creep, misread intent, and circular behaviour (retrying the same failing approach). It says to intervene early rather than waiting for the agent to finish, and to partition work so agents don't touch the same files.

**Isolation and collisions.** Every coding orchestrator gives each agent its own worktree or branch, which postpones collisions to merge time rather than removing them. Surfacing an overlap while both agents are still working is cheaper than a conflict later.

**Spend.** Fleet tools track cost per agent and in total (Mission Control's governance view, AgentOps' token counts per span). A budget matters more with many agents, since spend grows with the number running.

**Where the time went.** AgentOps and LangSmith dashboards draw timelines of spans. None of the products surveyed show how long agents waited on the person, though waiting is the bottleneck a fleet creates: once several agents run, the person is the slowest part of the system.

## 3. What the human factors say

- **Attention is the scarce resource.** Operators supervising several autonomous agents saturate quickly (studies cite capacity on the order of a handful of entities). Telling operators where to look helps, but dictating it isn't enough: they need to see the whole set to use their own judgment (Crandall et al.). → A queue of what's waiting **and** a complete roster, not one or the other.
- **Observability and directability** are the two properties a supervisory interface needs: you can see what each agent is doing and why, and you can redirect it at the level you choose (the whole job, one agent). → A line per agent, and a detail with its plan and a way to steer.
- **Situation awareness has three levels** (Endsley): perceiving the elements, comprehending what they mean together, projecting what happens next. A list of statuses is level 1. The roster's grouping and summary ("2 need you · 3 working") is level 2. Conflicts, stalls and "Waiting on Pricing page" are level 3: they say what will go wrong or what's next. Automation that hides its state causes out-of-the-loop problems: you can't catch a failure in something you can't see.
- **Interruptions cost most mid-task**, and people defer switching until a subtask ends (Iqbal and Horvitz; Cutrell et al.). → Announce an agent that starts needing you once, politely; never announce starting, progress or finishing; gather requests in one queue so they can be answered in a batch, at a moment the person chooses.

## 4. The view

| Need | Built as | Why this way |
|---|---|---|
| See who needs you | `AgentRequests`: every decision waiting, longest wait first, with "oldest waiting 6 min" | A wait costs more the longer it runs; oldest-first stops one request starving behind newer ones. |
| Answer in place | each `AgentRequest` carries its answers (Run migration / Don't run, Active only / Everyone, Retry, Review changes) and Open | Peek-and-reply without attaching. Answers are secondary and ghost: the view keeps one primary. |
| The whole fleet | `AgentFleet`, grouped Needs you, Working, Done (folded), with a summary in words | The roster is complete even when the queue is empty; grouping is the comprehension step. |
| What each is doing | a row: state mark, name, time, one line of activity, a plate in words, "Step 2 of 4", spend | Claude Code's row, plus the plan position, so progress is comparable across agents. |
| Trouble before it lands | `conflict` ("Also changing src/content/pricing.ts: Docs"), `stalled` ("Retried the same step 3 times"), `blocked` ("Waiting on Pricing page and Billing API"), failed joins the queue | GitHub's intervention signals, made visible on the row rather than found in a log. |
| Hierarchy | a lead agent's row above; agents an agent started hang in a bracket (`children`) | The lead/worker split of orchestrators, drawn as TraceParallel draws subagents. |
| Steer one | the open agent's plan as a `Trace`, what it made, spend, Stop, and a composer ("say what to change, where, and why") | Directability; GitHub's advice to steer specifically. |
| Spend | a `Meter` against the job's budget, spend on each row | Composition; no new part needed. |
| Where the time went | `AgentLanes`: a lane per agent on one clock, working, waiting on you (hatched), waiting on another agent (outline), failed; the takeaway leads with how long agents waited on you | The bottleneck the products don't show. A chart, so its marks are flat (Charts). |
| Interruptions | an agent that starts needing you is announced once; nothing else is | Interruption cost; ThreadList's rule, kept. |

## 5. Elevation

| Part | Reading |
|---|---|
| Fleet rows | the record: flush; destinations lift one level when pointed at. Working never hovers (a lamp plate says it); nothing you sent is in flight. |
| The open agent | selected, as a table's row: `accent-soft` and raised one level, `aria-current`. |
| Needs you, in the roster | a caution plate and a word, not a lift: a row can't rise into a card inside a list without breaking it, and the queue already holds the raised version. |
| Stalled | a caution plate with a clock mark, in the working group: a suspicion, not a request, so it doesn't join the queue. |
| Failed | a critical plate; it joins the queue, because nothing happens until someone retries or stops it. |
| Done | stamped: a check, muted name, "took 9 min"; folded away. |
| A request | status that asks for action: a raised card (level 1) that arrives lifted and settles with the afterglow. Not pending: nothing has been dispatched. |
| Nothing waiting | said flush, with a check: an all-clear is settled, not an opening. |
| Lanes | a chart: equal-height flat bars on each lane's ground line; told apart by fill and pattern and named in words; a 1px "Now" rule ends the record; never height for an amount. |

## 6. Rejected

- **Approve all.** Batching answers saves time, but a blanket approval is how a person stops reading consequences. The queue gathers requests so they can be answered in a row, one at a time, each with its consequence.
- **A grid of agent cards.** Asked for on Cursor's forum, and a board is what Vibe Kanban uses. A grid of equal cards gives every agent the same weight (the LA4 tell) and hides the one that needs you among the ones that don't. A list sorted by need puts it first.
- **Colour for state.** Every state is a word on a plate; colour and the mark only repeat it.
- **Live token counters and spinners.** A ticking number pulls the eye for no decision. Spans are in words ("6 min") and refresh every 30 seconds.
- **Raising rows that need you.** It would duplicate the queue's raised card and break the list.
- **A Gantt with dependencies drawn as arrows.** Dependencies are said on the waiting agent ("Waiting on Billing API"); arrows across lanes don't survive a phone or a screen reader.

## 7. Not done

- **Grouping by repository or directory** (Claude Code's alternate grouping). `AgentFleetGroup` takes any label, so it's a choice for the app; no helper groups by directory.
- **Pinning and manual order.** Not built; the sort is by need.
- **Generated summaries.** `activity` is the app's to write (a small model, or the agent's last status line).
- **A live example against real agents.** The view is scripted, like the harness, so every state is reachable and identical in CI.
