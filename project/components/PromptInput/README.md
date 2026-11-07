# PromptInput

Where a person writes to an assistant or agent: a textarea that grows, attachments as chips, optional tools or a model picker, Send, and Stop while a response is generating.

**Elevation: an opening.** The whole composer is the `Input` well. Empty, its back wall shows and it deepens as the pointer nears; once it holds text its floor rises flush (Completeness and Anticipation, as `Textarea`).
- **Send is the level-2 primary.** With nothing to send (no text, or a file still uploading) it's flush and faint, but stays focusable (`aria-disabled`).
- **While generating, Send becomes Stop in the same slot and size**, held as the live action. Its icon cross-fades without travel, so nothing moves.
- **Attachments are `Tag` plates** above the text. One being uploaded (your `onAttach` returned a promise) hovers as pending, "Uploading". A rejection removes it and says so.
- **Dragging a file over** drops the well to a trench, "Drop to attach", as `DropZone` does. It opens only while something could be dropped.

**Keyboard.** Enter sends. Shift+Enter adds a line. **Enter during IME composition never sends**, because it confirms the composition (Japanese, Chinese, Korean input). Escape stops generating. ⌘U or Ctrl+U attaches. Pasting a file attaches it. After sending, focus stays in the composer.

**Accessibility.** Plain HTML: a `<form>` with a labelled `<textarea>` ("Message" unless you name it) and buttons named "Send message", "Stop generating" and "Attach files". Sending isn't announced, because the conversation announces the response. Stopping is ("Generating stopped", unless `onStop` returns `false` to say nothing stopped), and so are attachments added and removed. Under forced colours the empty well is dashed and a drop target dashed thick. Under reduced motion the composer grows without gliding.

**Parts:** `PromptInput` (`onSubmit({ text, files })`, `status` (`'ready' | 'submitted' | 'streaming' | 'error'`), `onStop` (return `false` when nothing stopped), `value`, `onValueChange`, `onAttach`, `accept`); `PromptInputAttachments`; `PromptInputTextarea` (`placeholder`, `maxHeight`); `PromptInputToolbar`; `PromptInputAttach`; `PromptInputSubmit`.

**Queueing.** With `onQueue`, Enter while the agent works queues the message instead of doing nothing: the button stays Stop, the composer empties and keeps focus, and "Message queued. It will be sent when the assistant finishes." is announced. Show the queue with `ConversationQueue`, and send the first one when the turn ends.

**Context and commands.** With `mentionable(query)`, typing @ opens a list of matches above the composer, grouped by kind (Files, Records, People), ranked as you return them; a promise shows "Searching…". Choosing one puts "@label" in the text and a plate in the composer's context row; Backspace right after it removes it whole, and its plate's remove button does the same. With `commands`, / at the start of an empty composer lists them (best match first). `onSubmit` gets `mentions` and `command` separately; the command is taken out of `text`. The text is a combobox (arrows, Enter or Tab to choose); while generating, the first Escape closes the list and only a second one stops. IME composition never opens or drives it.

**Dictation.** `PromptInputDictate` (in the toolbar) is a microphone toggle; your app supplies the speech recognition (the Web Speech API or a server transcriber) and passes `status`, `interim` and `final`. Listening is latched like a Toggle that's on (a shallow well with accent-soft poured in) with "Listening" and a steady lamp: no pulse, no waveform. Interim words are a ghost under the text in `ink-faint`, like a suggestion, never in the value; `final` words go in at the caret. ⌘D / Ctrl+D toggles from the text; Escape stops listening before it stops generating. "Listening" and "Stopped listening" are announced; interim words aren't. Blocked or unavailable stays focusable and says why.

**Provider and model.** Pass `modelPicker={{ providers, value, onValueChange }}` and place `PromptInputModelSelector` in the toolbar. It shows a visible Provider field and a searchable Model field. A provider change clears the model until explicitly chosen; duplicate model IDs across providers remain distinct. `onSubmit` and `onQueue` receive a copied `message.model` pair (`providerId`, `modelId`). Loading, failed catalogs, missing choices and unavailable choices block both Enter and Send without clearing the draft or attachments. The reason is visible and associated with the fields and Send. Stop still works. `disabled` on the picker locks its controls but does not invalidate an available selection. Omit `modelPicker` to keep the existing composer behavior. See [ModelSelector](../ModelSelector/README.md) for the catalog and ownership contract.

`onSubmit` and `onQueue` may return **false synchronously** when the application refuses dispatch; the composer then retains its draft, files, mentions and command. All other return values retain the existing behavior. Promises are not awaited: an asynchronous failure belongs to the application's recovery flow. `useAssistantTurn` returns the synchronous boolean the composer expects.

**You provide:** sending, stopping, uploading, and the `status` of the response. Leave out `accept` and there are no attachments.

```tsx
<PromptInput onSubmit={(msg) => send(msg)} status={status} onStop={stop} accept="image/*,.pdf"
  modelPicker={{ providers, value: model, onValueChange: setModel }}>
  <PromptInputAttachments />
  <PromptInputTextarea placeholder="Ask about this workspace" />
  <PromptInputToolbar>
    <PromptInputAttach />
    <PromptInputModelSelector />
    <PromptInputSubmit />
  </PromptInputToolbar>
</PromptInput>
```

- Do keep Stop where Send was.
- Do return a promise from `onAttach` so an upload shows it's in flight.
- Don't send on Enter during IME composition (it's handled; don't override `onKeyDown` to send).
- Don't announce "Message sent".

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`PromptInput` as first used in its preview:

```tsx
import { PromptInput, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar } from 'altitude-design';

<PromptInput onSubmit={({ text, mentions, command }) => setSent(`${command ? `/${command} · ` : ''}${text}${mentions ? ` · context: ${mentions.map((m) => m.label).join(', ')}` : ''}`)}
  mentionable={(q) => new Promise((r) => setTimeout(() => r(context.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))), 250))}
  commands={[{ name: 'review', description: 'Review the current changes' }, { name: 'compact', description: 'Summarise the conversation so far' }, { name: 'clear', description: 'Start a new conversation' }]}>
  <PromptInputTextarea placeholder="@ to add context, / for commands" />
  <PromptInputToolbar><PromptInputSubmit /></PromptInputToolbar>
</PromptInput>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `cap`, `pi` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { PromptInput, PromptInputAttach, PromptInputAttachments, PromptInputDictate, PromptInputModelSelector, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar } from 'altitude-design';

const context = [
  { id: 'f1', label: 'pricing.ts', kind: 'file', description: 'src/pricing.ts' },
  { id: 'f2', label: 'plans.test.ts', kind: 'file', description: 'src/plans.test.ts' },
  { id: 'r1', label: 'Q3 report', kind: 'record', description: 'Shared by Maya, 2 days ago' },
  { id: 'p1', label: 'Maya Chen', kind: 'person', description: 'Billing team' },
];
function Pointed() {
  const [sent, setSent] = React.useState('');
  return (
    <div className="col">
      <PromptInput onSubmit={({ text, mentions, command }) => setSent(`${command ? `/${command} · ` : ''}${text}${mentions ? ` · context: ${mentions.map((m) => m.label).join(', ')}` : ''}`)}
        mentionable={(q) => new Promise((r) => setTimeout(() => r(context.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))), 250))}
        commands={[{ name: 'review', description: 'Review the current changes' }, { name: 'compact', description: 'Summarise the conversation so far' }, { name: 'clear', description: 'Start a new conversation' }]}>
        <PromptInputTextarea placeholder="@ to add context, / for commands" />
        <PromptInputToolbar><PromptInputSubmit /></PromptInputToolbar>
      </PromptInput>
      <p className="cap">{sent ? `Sent: ${sent}` : 'Type @ to point at a file, record or person, or / at the start for a command.'}</p>
    </div>
  );
}
// Dictation: here a scripted transcriber stands in for the app's speech recognition.
function Dictated() {
  const [status, setStatus] = React.useState('idle');
  const [interim, setInterim] = React.useState('');
  const [final, setFinal] = React.useState();
  const timers = React.useRef([]);
  const start = () => {
    setStatus('listening');
    const words = 'Summarise the open risks and who owns each one'.split(' ');
    words.forEach((_, k) => timers.current.push(setTimeout(() => setInterim(words.slice(0, k + 1).join(' ')), 180 * (k + 1))));
    timers.current.push(setTimeout(() => { setFinal({ id: Date.now(), text: words.join(' ') + '.' }); setInterim(''); setStatus('idle'); }, 180 * words.length + 400));
  };
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; setInterim(''); setStatus('idle'); };
  return (
    <div className="col">
      <PromptInput onSubmit={() => {}}>
        <PromptInputTextarea placeholder="Type, or press the microphone and speak" />
        <PromptInputToolbar>
          <PromptInputDictate status={status} interim={interim} final={final} onStart={start} onStop={stop} />
          <PromptInputDictate status="denied" label="Dictate (blocked example)" />
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
export default function App() {
  const [status, setStatus] = React.useState('ready');
  const [last, setLast] = React.useState('');
  const [model, setModel] = React.useState({ providerId: 'studio', modelId: 'beam' });
  const providers = [{ id: 'studio', label: 'Studio connection', models: [{ id: 'beam', label: 'Beam' }, { id: 'arc', label: 'Arc' }] },
    { id: 'gateway', label: 'Team gateway', models: [{ id: 'beam', label: 'Beam' }] }];
  const timer = React.useRef();
  const send = ({ text, files, model }) => {
    setLast(`Sent “${text}”${files.length ? ` with ${files.length} file${files.length > 1 ? 's' : ''}` : ''}. Provider: ${model.providerId}; model: ${model.modelId}.`);
    setStatus('submitted');
    timer.current = setTimeout(() => { setStatus('streaming'); timer.current = setTimeout(() => setStatus('ready'), 2500); }, 600);
  };
  return (
    <div className="col pi">
      <PromptInput onSubmit={send} modelPicker={{ providers, value: model, onValueChange: setModel }} status={status} onStop={() => { clearTimeout(timer.current); setStatus('ready'); }} accept="image/*,.pdf,.csv"
        onAttach={() => new Promise((r) => setTimeout(r, 900))}>
        <PromptInputAttachments />
        <PromptInputTextarea placeholder="Ask about this workspace" />
        <PromptInputToolbar>
          <PromptInputAttach />
          <PromptInputModelSelector />
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
      <p className="cap">{status === 'ready' ? (last || 'Enter sends, Shift+Enter adds a line. Paste or drop a file to attach it.') : status === 'submitted' ? 'Sending…' : 'Generating… Escape or Stop ends it.'}</p>
      <Pointed />
      <Dictated />
    </div>
  );
}
```
<!-- /example -->
