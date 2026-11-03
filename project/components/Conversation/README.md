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

**Parts:** `Conversation` (`aria-label`); `ConversationContent`; `ConversationScrollButton`; `Message` (`from`, `status` (`'streaming' | 'complete' | 'stopped' | 'error'`), `name`, `onRetry`); `MessageAttachments` (`items`: `{ name, type?, size?, url?, alt?, href?, onOpen?, unavailable? }`), before the content: what was sent with the message, images as 64px thumbnails and other files as settled Tag plates with type and size, acting when they have `href` or `onOpen`; `MessageContent`; `MessageActions` (`onCopy`, `onRegenerate`, `onFeedback`, `feedback`, `versions`, `onEdit`); `Message edited`.

**Editing a sent message.** Give a person's message `MessageActions onEdit`: Edit opens it in place (the text stays where it is while a Textarea well opens around it), with Cancel and "Send edit"; Escape cancels, Ctrl/⌘+Enter sends. Sending calls `onEdit(text)`: start a new branch from that message, keep the earlier one, and show its `versions` ("Version 2 of 2") and `edited` ("Edited"). Switching versions is announced; render the turns of the branch shown. Nothing is deleted.

**The queue.** `ConversationQueue` (`items`, `onSendNow`, `onEdit`, `onRemove`) goes between the thread and the composer and lists messages queued while the agent works (`PromptInput onQueue`), in order, each with Send now (stop the turn and send it), Edit (in place) and Remove. A queued message is written but not dispatched, so it doesn't hover: it's the person's sheet, flush, with a dashed rim and "Queued · 1 of 2". When the turn ends, send the first; it becomes an ordinary message in the log.

**Checkpoints.** `ConversationCheckpoint` (`label`, `at`, `consequence`, `onRestore`, `onReturn`) marks a point between messages to go back to: a divider reading "Checkpoint · Before editing 6 files · 2:14 PM" with Restore, described by the consequence. It follows the consequential-action contract: with `onReturn` (real recovery), Restore runs at once and leaves "Return to where you were"; without it, Restore asks in a Dialog. Restoring hovers as pending, settles once when done, and sinks into a trench with Retry if it fails; the outcome is announced. Set the later turns aside as a branch rather than deleting them.

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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Conversation` as first used in its preview:

```tsx
import { Conversation, ConversationCheckpoint, ConversationContent, ConversationScrollButton, Message, MessageActions, MessageAttachments, MessageContent } from 'altitude-design';

<Conversation aria-label="Assistant">
  <ConversationContent>
    {msgs.map((m) => m.kind === 'checkpoint' ? (
      <ConversationCheckpoint key={m.id} label={m.label} at={m.at} onRestore={() => restore(m.id)} onReturn={giveBack}
        consequence="The messages after this will be set aside. You can return to them." />
    ) : (
      <Message key={m.id} from={m.from} status={m.status} edited={m.v > 0} onRetry={m.status === 'stopped' ? () => { setStatus('streaming'); stream(m.id); } : undefined}>
        {m.files && <MessageAttachments items={m.files} />}
        <MessageContent>{m.text}</MessageContent>
        {m.from === 'assistant' ? <MessageActions onCopy onRegenerate={() => {}} onFeedback={() => {}} />
          : <MessageActions onEdit={(t) => edit(m.id, t)} versions={m.versions && { index: m.v + 1, total: m.versions.length, onChange: (k) => showVersion(m.id, k - 1) }} />}
      </Message>
    ))}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>
```

The full preview, as rendered in Storybook and checked in CI (`cv` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { Conversation, ConversationCheckpoint, ConversationContent, ConversationQueue, ConversationScrollButton, Message, MessageActions, MessageAttachments, MessageContent, PromptInput, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar } from 'altitude-design';

const answer = 'Last week the team shipped 14 changes. Two risks are open: the billing migration is two days behind, and the EU data residency review needs a decision from legal by Friday.';
export default function App() {
  const [msgs, setMsgs] = React.useState([
    { id: 1, from: 'user', text: 'What changed in the Atlas workspace this month?', files: [
      { name: 'atlas-usage.png', type: 'image/svg+xml', url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='64'%3E%3Crect width='120' height='64' fill='%23e8edf5'/%3E%3Cpath d='M8 52 L32 36 L56 42 L80 20 L112 12' stroke='%233b6fd8' stroke-width='3' fill='none'/%3E%3C/svg%3E", onOpen: () => {} },
      { name: 'Atlas changelog.pdf', type: 'application/pdf', size: 482113, href: '#changelog' },
    ] },
    { id: 'cp1', kind: 'checkpoint', label: 'Before the Atlas summary', at: '2026-10-30T14:14:00' },
    { id: 2, from: 'assistant', text: 'Atlas moved to the new permission model on 3 October, and its storage limit was raised to 2 TB. Three people joined: Maya, Theo and Ada.', status: 'complete' },
  ]);
  const [status, setStatus] = React.useState('ready');
  const timer = React.useRef();
  // Messages written while the assistant works wait in the queue; the first is sent when the turn ends.
  const [queued, setQueued] = React.useState([]);
  const queuedRef = React.useRef(queued); queuedRef.current = queued;
  const sendRef = React.useRef();
  const stream = (id) => {
    let n = 0;
    const tick = () => {
      n += 6;
      setMsgs((ms) => ms.map((m) => (m.id === id ? { ...m, text: answer.slice(0, n), status: n >= answer.length ? 'complete' : 'streaming' } : m)));
      if (n < answer.length) timer.current = setTimeout(tick, 60);
      else {
        setStatus('ready');
        const next = queuedRef.current[0];
        if (next) { setQueued((q) => q.slice(1)); setTimeout(() => sendRef.current({ text: next.text }), 0); }
      }
    };
    tick();
  };
  const enqueue = ({ text }) => setQueued((q) => [...q, { id: String(Date.now()), text }]);
  const send = ({ text }) => {
    const id = Date.now();
    setMsgs((ms) => [...ms, { id: id - 1, from: 'user', text }, { id, from: 'assistant', text: '', status: 'streaming' }]);
    setStatus('streaming');
    stream(id);
  };
  // Editing a sent message starts a branch from it; the earlier exchange is kept as version 1.
  const edit = (id, text) => {
    const i = msgs.findIndex((m) => m.id === id), m = msgs[i];
    const versions = (m.versions ?? [{ text: m.text, files: m.files }]).map((v, k) => (k === (m.v ?? 0) ? { ...v, rest: msgs.slice(i + 1) } : v));
    const aid = Date.now();
    setMsgs([...msgs.slice(0, i), { ...m, text, files: undefined, versions: [...versions, { text }], v: versions.length }, { id: aid, from: 'assistant', text: '', status: 'streaming' }]);
    setStatus('streaming');
    stream(aid);
  };
  const showVersion = (id, k) => {
    const i = msgs.findIndex((m) => m.id === id), m = msgs[i];
    const versions = m.versions.map((v, j) => (j === m.v ? { ...v, rest: msgs.slice(i + 1) } : v));
    setMsgs([...msgs.slice(0, i), { ...m, text: versions[k].text, files: versions[k].files, versions, v: k }, ...(versions[k].rest ?? [])]);
  };
  const sendNow = (id) => {
    const q = queued.find((x) => x.id === id);
    setQueued((qs) => qs.filter((x) => x.id !== id));
    stop();
    setTimeout(() => sendRef.current({ text: q.text }), 0);
  };
  // Restoring a checkpoint sets the turns after it aside; returning brings them back.
  const aside = React.useRef([]);
  const restore = (id) => new Promise((done) => setTimeout(() => { setMsgs((ms) => { const i = ms.findIndex((m) => m.id === id); aside.current = ms.slice(i + 1); return ms.slice(0, i + 1); }); done(); }, 900));
  const giveBack = () => { setMsgs((ms) => [...ms, ...aside.current]); aside.current = []; };
  const stop = () => { clearTimeout(timer.current); setStatus('ready'); setMsgs((ms) => ms.map((m) => (m.status === 'streaming' ? { ...m, status: 'stopped' } : m))); };
  sendRef.current = send;
  return (
    <div className="cv">
      <Conversation aria-label="Assistant">
        <ConversationContent>
          {msgs.map((m) => m.kind === 'checkpoint' ? (
            <ConversationCheckpoint key={m.id} label={m.label} at={m.at} onRestore={() => restore(m.id)} onReturn={giveBack}
              consequence="The messages after this will be set aside. You can return to them." />
          ) : (
            <Message key={m.id} from={m.from} status={m.status} edited={m.v > 0} onRetry={m.status === 'stopped' ? () => { setStatus('streaming'); stream(m.id); } : undefined}>
              {m.files && <MessageAttachments items={m.files} />}
              <MessageContent>{m.text}</MessageContent>
              {m.from === 'assistant' ? <MessageActions onCopy onRegenerate={() => {}} onFeedback={() => {}} />
                : <MessageActions onEdit={(t) => edit(m.id, t)} versions={m.versions && { index: m.v + 1, total: m.versions.length, onChange: (k) => showVersion(m.id, k - 1) }} />}
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <ConversationQueue items={queued} onSendNow={sendNow} onEdit={(id, text) => setQueued((qs) => qs.map((q) => (q.id === id ? { ...q, text } : q)))} onRemove={(id) => setQueued((qs) => qs.filter((q) => q.id !== id))} />
      <PromptInput onSubmit={send} status={status} onStop={stop} onQueue={enqueue}>
        <PromptInputTextarea placeholder="Ask about this workspace" />
        <PromptInputToolbar><PromptInputSubmit /></PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
```
<!-- /example -->
