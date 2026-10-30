<!--
title: New: Question — an agent asks the person something before it carries on
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

Agents stop to ask: "Which environment should I deploy to?", "Keep the old column or drop it?", "Which of these three layouts?" The person picks one or several options, or writes their own answer, and the run continues. This is the elicitation half of human-in-the-loop (MCP elicitation, Claude Code's AskUserQuestion, AI Elements' `Question`). `Confirmation` only approves or rejects a proposed action; answering in the composer loses the options and the structure.

**Closest existing components:** `Confirmation` (approve/reject, same raised reading), `RadioGroup` / `Checkbox` (choices), `PlanPicker` (choosing among described options).
**Name:** `Question`, `QuestionOption`.

## Elevation story

**What it is:** live (status that asks for action), until answered; then settled
**Signal it carries:** the "Proposed" row's reasoning applies: nothing has been dispatched, so it's raised, not pending
**Relatives it borrows from:** the card is `Confirmation`'s requested state; options are `RadioGroup` (one) or `Checkbox` (several), with descriptions as `PlanPicker`'s; "Other" is a `Textarea` well; answered collapses to a flush line like a resolved `CommentThread`.

| Part / state | Tier | Level | Surface · shadow | Non-height cue (word, icon, ARIA state or border) |
|---|---|---|---|---|
| Asking | Raised | 1 | `surface-raised` · `elev-1` | "The assistant is asking", the question as the title |
| Option, unchosen | Sunk | −2 | `RadioGroup`/`Checkbox` trench | its label and description |
| Option, chosen | Raised mark in a filled trench | 1 | accent poured in, raised white mark | `aria-checked` |
| "Other" answer | Sunk | −1 | `Textarea` well · `well` | label "Your own answer" |
| Answer button | Raised | 2 | `Button variant="primary"` · `elev-2`, `wall-2` | "Answer" or the chosen option's verb ("Deploy to staging") |
| Skip | Ground | 0 | ghost `Button` | "Let the assistant decide" |
| Answered | Ground | 0 | none · none | "You chose: Staging · now", muted |
| Expired (the run moved on) | Ground | 0 | none · none | "No longer needed", muted |

## Motion

Asking arrives lifted and settles (`dur-settle`) like any new content needing notice. Answering presses the card to the ground: it lowers from 1 to 0 over `dur-travel-1` with `ease-sink` and collapses to its one-line record. Under reduced motion it cross-fades to the record.

## Accessibility

**WAI-ARIA pattern:** a labelled `section` holding a [radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) or a group of checkboxes; not a dialog.
**Keyboard:** arrows move between options (radio), Space toggles (checkbox), Enter in "Other" doesn't submit (Shift+Enter for a new line is not needed: it's a one-line answer unless `multiline`); the Answer button submits. As with `Confirmation`, there's **no default action** and nothing is focused automatically; the composer keeps focus.
**Screen reader:** asked: announced assertively once ("The assistant is asking: Which environment should I deploy to?"), because the run is blocked on it. Answered: "Answered: Staging".
**Forced colours:** card has a 1px border; choices use the Switch family's fallback.
**`contrast="more"`:** a hard slab under the card.

## API sketch

```tsx
<Question title="Which environment should I deploy to?" state={q.state} /* 'asking' | 'answered' | 'expired' */
  multiple={false} allowOther answerLabel="Deploy" skipLabel="Let the assistant decide"
  onAnswer={({ values, other }) => respond(q.id, values, other)} answer={q.answer}>
  <QuestionOption value="staging" label="Staging" description="Resets nightly. Safe to try things." />
  <QuestionOption value="production" label="Production" description="Customers will see it immediately." />
</Question>
```

Several questions in one request (AskUserQuestion allows up to four) are several `Question`s in one `QuestionSet`, answered together by one button.

## Rules it strains (optional)

**One primary per view.** While a question is open, the composer's Send is also a primary. Proposal: the composer is `status="awaiting-input"` and its Send is secondary until the question is answered or skipped, because answering is what the run needs. `Confirmation` has the same tension and should resolve it the same way.

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/Question/README.md` in the existing format (what it is, elevation, props, "You provide", do and don't)
- [ ] A section in `build/previews.txt` with an honest `@dsCard` group and subtitle
- [ ] A row in the signals table in `Elevation.md`; new choreography in `Motion.md`; sources and a prototype review in `Research.md`
- [ ] `tsc` clean; `shoot.mjs` renders it in all four schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`
- [ ] Keyboard paths checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed (CI fails otherwise)

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #153 and #174.
