<!--
title: Message: edit a sent message, keeping the earlier one as a version
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Message` and `MessageActions` (the edit action and the version switch live on the person's message).

## What you're trying to do

A person notices a typo or wants to ask differently three turns back. Every major harness lets them edit that message and resend, which starts a new branch from that point; the earlier exchange is kept and can be switched back to ("2 of 2", assistant-ui's `EditComposer` and `BranchPicker`). Today Altitude only versions regenerated answers, so apps either re-send a copy at the bottom or overwrite history.

## Today

`MessageActions` has `onCopy`, `onRegenerate`, `onFeedback`, `feedback` and `versions` for assistant answers ("Version 2 of 2", because "a previous answer is a record and isn't overwritten", `project/components/Conversation/README.md`). There's no edit action and no version switch on a person's message.

## Proposal

```tsx
<Message from="user">
  <MessageContent>{m.text}</MessageContent>
  <MessageActions onEdit={(text) => editAndResend(m.id, text)}
    versions={{ count: m.branches.length, current: m.branch, onChange: (i) => showBranch(m.id, i) }} />
</Message>
```

- `onEdit` adds an Edit action. Editing opens the message in place, as `InlineEdit` does with multi-line text: the text stays where it is while a `Textarea` well opens around it, with Cancel and "Send edit".
- Sending creates a new branch: the messages after it are those of the new branch, and the version switch on the edited message moves between branches. Nothing is deleted.
- `versions` (already the shape used for answers) accepts an `onChange` so both the person's and the assistant's versions can be switched.

**Additive?** yes

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Person's message being edited | Sunk | −1 | `Textarea` well inside the `accent-soft` sheet · `well` | label "Edit message" |
| Send edit | Raised | 1 | `Button variant="secondary" size="sm"` · `elev-1` | "Send edit" (the composer's Send keeps the view's one primary) |
| Cancel | Ground | 0 | ghost `Button` | "Cancel" |
| Edited message, sent | Ground | 0 | `accent-soft` sheet, flush | "Edited" in its caption; "Version 2 of 2" |
| Later turns of the other branch | not shown | — | — | reachable through the version switch |

"Editing is temporary local input; it is not a pending write" (README, Actions in place), so nothing hovers until the edit is sent.

## Motion and accessibility

Opening the editor: the well opens in place (as `InlineEdit`, nothing moves). Switching branches cross-fades the turns below over `dur-travel-1`. Escape cancels; ⌘Enter / Ctrl+Enter sends the edit; IME composition rules as `PromptInput`. Focus returns to the Edit action on cancel and to the composer after sending. Switching a branch is announced ("Showing version 1 of 2").

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #151.
