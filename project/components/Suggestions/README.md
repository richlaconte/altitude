# Suggestions

Prompts to start from or follow up with. An empty conversation offers starting points ("Summarise last week's incidents"); a finished answer offers follow-ups ("Compare with Q2"). Choosing one either fills the composer to edit or sends it at once.

**Elevation: things you press.**
- **Each suggestion** is a small secondary `Button`: raised at level 1 with its wall, lifting to 2 when pointed at, pressed to the ground. Never level 2 at rest: the view's one primary is the composer's Send.
- **Starters** sit in an `EmptyState` (its sunk opening) and are simply there.
- **Follow-ups** sit under the answer, inside its `Message`, and cross-fade in over `dur-onset`; they don't rise, because they only became available.
- **A send-mode suggestion** shows an arrow and is named "…, sends now".

**Accessibility.** A labelled `group` of buttons; with more than four, the toolbar pattern with one tab stop and arrow keys. Enter or Space chooses. After choosing, focus goes to the composer, with the caret at the end when the text was filled in. Follow-ups aren't announced when they arrive; the answer was.

**Props:** `Suggestions`: `aria-label` (required), `mode` (`'fill'` default, or `'send'`), `onChoose(value)`, `arrive` (default true inside a `Message`). `Suggestion`: `value` (filled or sent instead of the label), and button props.

**You provide:** what choosing does. For `fill`, set the composer's value (`PromptInput value`); for `send`, send it.

```tsx
<Message from="assistant">
  <MessageContent>…</MessageContent>
  <Suggestions aria-label="Suggested follow-ups" mode="send" onChoose={send}>
    <Suggestion>Compare with Q2</Suggestion>
    <Suggestion value="List the three biggest risks, with owners">Biggest risks</Suggestion>
  </Suggestions>
</Message>
```

- Do keep them short, and few (three is plenty).
- Do use `fill` when the person will likely want to adjust the prompt.
- Don't make a suggestion the primary button, or animate follow-ups in with a rise.
