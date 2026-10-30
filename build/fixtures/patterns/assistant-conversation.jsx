// Assistant conversation pattern (project/framework/patterns/assistant-conversation.md): send, stream, stop, retry and
// recover without losing the person's words. useAssistantTurn holds the turn: a double Enter sends once, Stop keeps the
// partial answer, an answer settles only when the stream says so, a failure keeps the message and says what happened
// in words (offline, rate limited, context full), and an unfinished answer after a reload is "Interrupted". A Meter in
// the toolbar shows how much of the context window is used.
// The lines between the preview markers are its "AssistantConversationPattern" preview (scripts/pattern-previews.mjs
// copies them); build/checks/pattern-types.mjs type-checks this file against the public declarations.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const answer = 'The billing migration is two days behind: the invoice backfill is still running. The EU data residency review needs a decision from legal by Friday.';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** @param {'offline' | 'rate-limited' | 'context-full' | 'none'} failure */
function scripted(failure) {
  /** @param {string} _input @param {AbortSignal} signal */
  return async function* (_input, signal) {
    await wait(350);
    if (failure === 'offline') throw new A.AssistantError('offline');
    if (failure === 'rate-limited') throw new A.AssistantError('rate-limited', undefined, Date.now() + 25 * 60000);
    if (failure === 'context-full') throw new A.AssistantError('context-full');
    for (let n = 0; n < answer.length; n += 6) { if (signal.aborted) return; await wait(45); yield answer.slice(n, n + 6); }
  };
}
/** @param {{ restored?: { input: string, text: string, complete: boolean } }} props */
function Thread({ restored }) {
  const [failure, setFailure] = React.useState(/** @type {'offline' | 'rate-limited' | 'context-full' | 'none'} */ ('none'));
  const [draft, setDraft] = React.useState('');
  const [used, setUsed] = React.useState(64);
  const turn = A.useAssistantTurn({ stream: scripted(failure), restored });
  // A failed send keeps the message: it goes back in the composer.
  React.useEffect(() => { if (turn.state === 'failed' && turn.input) setDraft(turn.input); }, [turn.state]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (turn.state === 'complete') setUsed((u) => Math.min(99, u + 9)); }, [turn.state]);
  return (
    <div className="col ac">
      <A.ToggleGroup type="single" size="sm" aria-label="Make the next send fail" value={failure} onValueChange={(v) => setFailure(/** @type {any} */ (v) || 'none')}>
        <A.ToggleGroupItem value="none">Works</A.ToggleGroupItem>
        <A.ToggleGroupItem value="offline">Offline</A.ToggleGroupItem>
        <A.ToggleGroupItem value="rate-limited">Rate limited</A.ToggleGroupItem>
        <A.ToggleGroupItem value="context-full">Context full</A.ToggleGroupItem>
      </A.ToggleGroup>
      <A.Conversation aria-label="Assistant">
        <A.ConversationContent>
          {turn.input !== undefined && <A.Message from="user"><A.MessageContent>{turn.input}</A.MessageContent></A.Message>}
          {(turn.text || turn.state === 'streaming' || turn.state === 'interrupted') && (
            <A.Message from="assistant" status={turn.messageStatus} onRetry={turn.state === 'stopped' || turn.state === 'interrupted' ? turn.retry : undefined}>
              <A.MessageContent><A.Markdown streaming={turn.state === 'streaming'}>{turn.text}</A.Markdown></A.MessageContent>
              {turn.state === 'interrupted' && <p className="ac-note">Interrupted: the page reloaded before this answer finished.</p>}
            </A.Message>
          )}
        </A.ConversationContent>
      </A.Conversation>
      {turn.state === 'failed' && (
        <A.Alert tone={turn.error?.kind === 'context-full' ? 'caution' : 'critical'} title={turn.errorText}
          action={turn.error?.kind === 'context-full' ? <A.Button size="sm" variant="secondary">Start a new conversation</A.Button> : <A.Button size="sm" variant="secondary" onClick={() => { setFailure('none'); setDraft(''); }}>Try again</A.Button>} />
      )}
      <A.PromptInput status={turn.promptStatus === 'error' ? 'ready' : turn.promptStatus} value={draft} onValueChange={setDraft} onStop={turn.stop}
        onSubmit={({ text }) => { turn.submit(text); }}>
        <A.PromptInputTextarea placeholder="Ask about the release" />
        <A.PromptInputToolbar>
          <A.Meter className="ac-context" label="Context" value={used} max={100} high={80} critical={95} format={(v) => `${v}% of context used`} />
          <A.PromptInputSubmit />
        </A.PromptInputToolbar>
      </A.PromptInput>
    </div>
  );
}
function App() {
  const [reloaded, setReloaded] = React.useState(false);
  return (
    <div className="col">
      <A.Button size="sm" variant="ghost" onClick={() => setReloaded((r) => !r)}>{reloaded ? 'Start fresh' : 'Reload mid-answer'}</A.Button>
      {reloaded
        ? <Thread key="restored" restored={{ input: 'What are the open risks?', text: 'The billing migration is two days behind: the invoice', complete: false }} />
        : <Thread key="fresh" />}
    </div>
  );
}
// preview:end
export default App;
