# Conversation

The thread between a person and an assistant: their messages, the assistant's answers (often streamed), copy, regenerate, feedback, versions, and "Jump to latest" once you've scrolled up. Pair it with `PromptInput`.

**Elevation: how settled is a streamed answer?** Settled messages are the record.
- **A person's message** is a flush `accent-soft` sheet on the right.
- **An assistant's complete message** is flush with no bubble and no shadow, with a quiet `line` rule down its left edge.
- **A streaming answer isn't the record yet**, and it isn't a pending write either: nothing you sent is in flight, so it mustn't hover. It rests on the ground with the treatment charts use for data still being counted: **a dashed `line-control` rule**, "Generating…" and a caret. It's `aria-busy`.
- **When it completes**, the rule goes solid and the message settles with one afterglow. The arrival signal is held until the answer is whole, because lifting it for the seconds it takes to stream would be a prolonged rise.
- **Stopped or failed** answers are kept, with "Stopped" or "Couldn't finish" (and a `critical` rule) and Retry.
- **Message actions** are ghost buttons that lift when pointed at. Feedback is a pair of toggles; regenerated answers are versions ("Version 2 of 2"), because a previous answer is a record and isn't overwritten.
- **"Jump to latest message"** floats at level 3 once you've scrolled up. The thread follows new text to the bottom until you scroll up, then lets go.

**Motion.** Text arrives without per-word animation. Completion: one afterglow. Under reduced motion the caret doesn't blink.

**Accessibility.** A `log` region of articles, each headed by who's speaking ("You" visually hidden). **Streamed text isn't announced token by token**: the log's own announcements are off, and each answer is announced once, when it completes ("Assistant: Last week the team shipped…", up to 280 characters). Stopping is announced politely, a failure assertively. The log is focusable so it can be scrolled by keyboard. Under forced colours the streaming rule is dotted and a complete one solid. Under `contrast="more"` the rule is `line-control`.

**Parts:** `Conversation` (`aria-label`); `ConversationContent`; `ConversationScrollButton`; `Message` (`from`, `status` (`'streaming' | 'complete' | 'stopped' | 'error'`), `name`, `onRetry`); `MessageContent`; `MessageActions` (`onCopy`, `onRegenerate`, `onFeedback`, `feedback`, `versions`).

**You provide:** the messages and their status as your stream reports it. Code inside an answer goes in `CodeBlock`.

```tsx
<Conversation aria-label="Assistant">
  <ConversationContent>
    {messages.map((m) => (
      <Message key={m.id} from={m.role} status={m.status}>
        <MessageContent>{m.content}</MessageContent>
        <MessageActions onCopy onRegenerate={() => regen(m.id)} onFeedback={(v) => rate(m.id, v)} />
      </Message>
    ))}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>
```

- Do pass the stream's status, so a finished answer settles and is announced.
- Do keep earlier versions when regenerating.
- Don't fade in text word by word or glow a streaming answer.
- Don't make a streaming answer hover; it isn't a pending write.
