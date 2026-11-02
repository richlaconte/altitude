# Question

An agent asks the person something before it carries on: "Which environment should I deploy to?", "Keep the old column or drop it?". The person picks one or several options, or writes their own answer, and the run continues. This is the elicitation half of human-in-the-loop (MCP elicitation, Claude Code's AskUserQuestion); `Confirmation` is the approval half.

**Elevation: status that asks, until it's answered.**
- **Asking** is `Confirmation`'s requested card: raised at level 1 ("The assistant is asking", the question as its title). Nothing has been dispatched, so it's raised, not pending. It arrives with the afterglow.
- **Options** are trenches: a radio group for one, checkboxes for several, with descriptions. **Your own answer** is a field (a well).
- **Answer** is the one primary; **Skip** (`skipLabel`) is a ghost button.
- **Answered**, it presses to the ground as one muted line in the record: "Which layout…? · You chose: Compact · 3 minutes ago". **Expired** says "No longer needed".

**Accessibility.** A section labelled by its question, holding a radio group (arrows) or a group of checkboxes; not a dialog. There's no default answer and nothing is focused for you; the composer keeps focus. Asked, it's announced assertively once ("The assistant is asking: …"), because the run is waiting on it; answered, politely ("Answered: Staging"). Enter in your own answer doesn't submit.

**Props:** `Question`: `title`, `state` (`'asking' | 'answered' | 'expired'`), `multiple`, `allowOther`, `otherLabel`, `answerLabel`, `skipLabel`, `onSkip`, `onAnswer({ values, other })`, `answer`, `answeredAt`, `requestedBy`, `name` (its key in a set). `QuestionOption`: `value`, `label`, `description`. `QuestionSet`: `state`, `onAnswer(answers by name)`, `answerLabel`, `skipLabel`, `onSkip`: several questions answered by one button.

**You provide:** the options, what answering does, and the answer to show once it's answered.

```tsx
<Question title="Which environment should I deploy to?" state={q.state} answer={q.answer} allowOther
  answerLabel="Deploy" skipLabel="Let the assistant decide" onAnswer={(a) => respond(q.id, a)} onSkip={() => skip(q.id)}>
  <QuestionOption value="staging" label="Staging" description="Resets nightly. Safe to try things." />
  <QuestionOption value="production" label="Production" description="Customers will see it immediately." />
</Question>
```

- Do describe what each option means for the run.
- Do offer a way to let the assistant decide when a default exists.
- Don't preselect an option or move focus to the question.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Question` as first used in its preview:

```tsx
import { Question, QuestionOption } from 'altitude-design';

<Question title="Which environment should I deploy to?" state={q.state} answer={q.answer} answeredAt={q.at} allowOther
  answerLabel="Deploy" skipLabel="Let the assistant decide" onSkip={() => setQ({ state: 'expired' })}
  onAnswer={(answer) => setQ({ state: 'answered', answer, at: Date.now() })}>
  <QuestionOption value="staging" label="Staging" description="Resets nightly. Safe to try things." />
  <QuestionOption value="production" label="Production" description="Customers will see it immediately." />
</Question>
```

The full preview, as rendered in Storybook and checked in CI (`qs` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { Question, QuestionOption, QuestionSet } from 'altitude-design';

export default function App() {
  const [q, setQ] = React.useState({ state: 'asking' });
  const [set, setSet] = React.useState({ state: 'asking' });
  return (
    <div className="qs">
      <Question title="Which environment should I deploy to?" state={q.state} answer={q.answer} answeredAt={q.at} allowOther
        answerLabel="Deploy" skipLabel="Let the assistant decide" onSkip={() => setQ({ state: 'expired' })}
        onAnswer={(answer) => setQ({ state: 'answered', answer, at: Date.now() })}>
        <QuestionOption value="staging" label="Staging" description="Resets nightly. Safe to try things." />
        <QuestionOption value="production" label="Production" description="Customers will see it immediately." />
      </Question>
      <QuestionSet state={set.state} onAnswer={(answers) => setSet({ state: 'answered', answers })}>
        <Question name="column" title="Keep the old status column, or drop it?" answer={set.answers?.column}>
          <QuestionOption value="keep" label="Keep it" description="Writes go to both columns until you remove it." />
          <QuestionOption value="drop" label="Drop it" description="The migration removes it after copying." />
        </Question>
        <Question name="notify" title="Who should hear about it?" multiple answer={set.answers?.notify}>
          <QuestionOption value="eng" label="#eng-billing" />
          <QuestionOption value="support" label="#support" />
          <QuestionOption value="owner" label="The account owner" />
        </Question>
      </QuestionSet>
      <Question title="Which layout should I use for the invoice?" state="answered" answer={{ values: ['compact'] }} answeredAt={Date.now() - 3 * 60000}>
        <QuestionOption value="compact" label="Compact" />
        <QuestionOption value="detailed" label="Detailed" />
      </Question>
    </div>
  );
}
```
<!-- /example -->
