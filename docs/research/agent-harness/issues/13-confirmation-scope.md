<!--
title: Confirmation: approve once, for the session, or always
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Confirmation`.

## What you're trying to do

An agent asks to run `npm test` for the fifth time. Approving it every time trains people to approve without reading; never asking is unsafe. Coding harnesses (Claude Code's permission prompts, Cursor's allowlist) offer a scope: allow once, allow this tool or command for the rest of the session, or always allow it (saved to settings). The scope chosen needs to be recorded, because "approved for the session" is a different fact from "approved this once".

## Today

`Confirmation` has a single Approve (`approveLabel`, `onApprove()`), plus `escalate` for consequential actions (`project/components/Confirmation/README.md`).

## Proposal

```tsx
<Confirmation state={call.state} title="Run npm test" consequence="Runs the test suite in this workspace."
  approveLabel="Run once"
  scopes={[
    { value: 'session', label: 'Allow npm test for this session' },
    { value: 'always', label: 'Always allow npm test', description: 'Saved to this project’s settings' },
  ]}
  onApprove={(scope /* 'once' | 'session' | 'always' */) => respond(call.id, true, scope)}
  resolvedScope={call.scope} />
```

- With `scopes`, Approve becomes a `SplitButton`: the main face approves once, the menu holds the wider scopes.
- The resolved line names the scope: "Ran · allowed for this session by you".
- `scopes` is ignored when `escalate` is set: an action consequential enough to need a hold or a dialog is never pre-approved.

**Additive?** yes

## Elevation impact

None new: `SplitButton` is "an action with alternatives" (one slab, two faces, alternatives in a floating menu). The card's states are unchanged.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Approve with scopes | Raised | 2 | `SplitButton` primary · `elev-2` | "Run once"; "More ways to approve" on the menu face |
| Scope menu | Floating | 3 | `DropdownMenu` · `elev-3` | each scope's label and description |
| Resolved with a scope | Ground | 0 | as today | "allowed for this session by you" |

## Motion and accessibility

None new. The menu face is named "More ways to approve"; each scope is a `menuitem` with its description. The outcome announcement includes the scope.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #153 and #174.
