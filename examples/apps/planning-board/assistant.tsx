// The assistant on the planning board (#408). It proposes changes to the board's own cards; they show on the cards as
// proposed (nothing has been sent) until a person accepts them, one at a time on the card or all together through the
// Confirmation in the panel. Accepting sends the change against the version the assistant saw, so a card someone else
// moved meanwhile comes back as out of date rather than being overwritten. What it applied keeps its provenance: the
// card wears an AILabel and the panel's activity names the assistant and the approver.
import * as React from 'react';
import {
  AILabel, Alert, Button, Confirmation, Conversation, ConversationContent, Markdown, Message, MessageContent, PromptInput,
  PromptInputSubmit, PromptInputTextarea, PromptInputToolbar, Question, QuestionOption, Select, Suggestion, Suggestions,
  Trace, TraceReasoning, TraceStep, TraceToolCall,
} from 'altitude-design';
import type { ConfirmationState, PromptMessage } from 'altitude-design';
import type { DemoQuery } from '../shared/react';
import { errorMessage, isDemoError } from '../shared/react';
import { COLUMN_TITLE, POINTS, service } from './data';
import type { BoardData, Card, ColumnId } from './data';
import { describe, fold, lastMoment } from './assistant-script';
import type { AgentEvent, ProposalDraft } from './assistant-script';

export type ProposalStatus = 'proposed' | 'pending' | 'applied' | 'rejected' | 'stale' | 'failed';
export type Proposal = ProposalDraft & { status: ProposalStatus; note?: string; from?: ColumnId; edited?: boolean };
export interface Activity { id: string; text: string; at: number }
type Turn =
  | { id: string; from: 'user'; text: string }
  | { id: string; from: 'assistant'; events: AgentEvent[]; k: number; error?: string; context?: boolean; stopped?: boolean; input: Record<string, unknown> };

const MODEL = 'Scripted assistant (no model)';
const TICK = 420;
const locate = (b: BoardData, id: string) => (Object.keys(b.columns) as ColumnId[]).find((c) => b.columns[c].includes(id));
export const describeP = (p: Proposal, b: BoardData) => describe(p, b.cards[p.card]?.title ?? 'a card', p.kind === 'move' ? p.from ?? locate(b, p.card) : undefined);

/** The proposals and how to resolve them, shared by the panel, the board and the card sheet. */
export function useProposals(q: DemoQuery<BoardData>, say: (s: string) => void) {
  const [proposals, setProposals] = React.useState<Proposal[]>([]);
  const [activity, setActivity] = React.useState<Activity[]>([]);
  const list = React.useRef(proposals);
  // Updated eagerly through the ref, so a check that runs before the next render already sees the change.
  const commit = (next: Proposal[]) => { list.current = next; setProposals(next); };
  const patch = (id: string, p: Partial<Proposal>) => commit(list.current.map((x) => (x.id === id ? { ...x, ...p } as Proposal : x)));

  const add = (drafts: ProposalDraft[]) => {
    const b = q.data;
    const fresh = drafts.filter((d) => !list.current.some((x) => x.id === d.id));
    if (!fresh.length) return;
    commit([...list.current, ...fresh.map((d) => ({ ...d, status: 'proposed' as const, from: b ? locate(b, d.card) : undefined }))]);
  };

  // A card that changed after the assistant saw it makes its proposals out of date: the plan was for a board that's gone.
  React.useEffect(() => {
    const b = q.data;
    if (!b) return;
    for (const p of list.current) {
      const k = b.cards[p.card];
      if (p.status === 'proposed' && (!k || k.rev !== p.rev)) {
        patch(p.id, { status: 'stale', note: `Out of date: “${k?.title ?? 'This card'}” changed after the assistant proposed this. Ask again for a fresh plan.` });
        say(`A proposal is out of date: ${k?.title ?? 'a card'} changed.`);
      }
    }
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Sends one proposal. Resolves true when it landed. */
  const apply = async (id: string): Promise<boolean> => {
    const p = list.current.find((x) => x.id === id);
    const b = q.data;
    if (!p || !b || (p.status !== 'proposed' && p.status !== 'failed')) return false;
    const k = b.cards[p.card];
    patch(id, { status: 'pending', note: 'Applying…' });
    const text = describeP(p, b);
    try {
      if (p.kind === 'move') {
        const next = await service.request<BoardData>('cards.move', { id: p.card, column: p.to, index: b.columns[p.to].length, rev: p.rev });
        q.setData(() => next);
        bump(p.card, p.rev, next.cards[p.card].rev);
      } else {
        const saved = await service.request<Card>('cards.update', { id: p.card, patch: { [p.kind]: p.value }, rev: p.rev });
        q.setData((d) => (d ? { ...d, cards: { ...d.cards, [saved.id]: saved } } : d));
        bump(p.card, p.rev, saved.rev);
      }
      landed(id, text);
      return true;
    } catch (e) {
      if (isDemoError(e, 'lost-response')) {
        try {
          const now = await service.request<BoardData>('board.get');
          q.setData(() => now);
          const c = now.cards[p.card];
          const ok = p.kind === 'move' ? locate(now, p.card) === p.to : c && c[p.kind] === p.value;
          if (ok) { bump(p.card, p.rev, c.rev); landed(id, text); return true; }
        } catch { /* not known: say it wasn't applied */ }
      }
      if (isDemoError(e, 'conflict')) {
        patch(id, { status: 'stale', note: `Out of date: someone changed “${k?.title}” first. Nothing was applied. Ask again for a fresh plan.` });
      } else {
        patch(id, { status: 'failed', note: `Not applied: ${errorMessage(e)}` });
      }
      say(`${text}: not applied.`);
      return false;
    }
  };
  // Our own change moves the card's version on: the assistant's other proposals for it follow, rather than going stale.
  const bump = (card: string, from: number, to: number) => {
    commit(list.current.map((x) => (x.card === card && x.rev === from && (x.status === 'proposed' || x.status === 'failed') ? { ...x, rev: to } : x)));
  };
  const landed = (id: string, text: string) => {
    patch(id, { status: 'applied', note: undefined });
    setActivity((a) => [{ id, text, at: Date.now() }, ...a]);
    say(`${text}: done.`);
  };
  const reject = (id: string) => { patch(id, { status: 'rejected', note: undefined }); };
  const edit = (id: string, value: number) => patch(id, { value, edited: true } as Partial<Proposal>);
  /** Mark one accepted elsewhere (the card sheet saved it through its own editor). */
  // A save bumps the card's version by one: the card's other proposals follow it.
  const accepted = (id: string) => { const p = list.current.find((x) => x.id === id); if (p && q.data) { bump(p.card, p.rev, p.rev + 1); landed(id, describeP(p, q.data)); } };
  const applyAll = async () => {
    let ok = true;
    for (const p of list.current.filter((x) => x.status === 'proposed' || x.status === 'failed')) ok = (await apply(p.id)) && ok;
    return ok;
  };

  return { proposals, activity, add, apply, reject, edit, accepted, applyAll };
}
export type Proposals = ReturnType<typeof useProposals>;

export function AssistantPanel({ q, props: P, say, inSheet }: { q: DemoQuery<BoardData>; props: Proposals; say: (s: string) => void; inSheet?: boolean }) {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [applying, setApplying] = React.useState<ConfirmationState | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const timer = React.useRef(0);
  React.useEffect(() => () => window.clearInterval(timer.current), []);
  const n = turns.filter((t) => t.from === 'assistant').length;

  // A turn plays one moment per tick, so reasoning, the tool call and the answer arrive as a stream would.
  const play = (id: string, events: AgentEvent[]) => {
    const end = lastMoment(events);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || !!document.querySelector('[data-motion="reduced"]');
    window.clearInterval(timer.current);
    const step = () => setTurns((ts) => ts.map((t) => {
      if (t.id !== id || t.from !== 'assistant') return t;
      const k = Math.min(end, t.k + 1);
      if (k >= end) { window.clearInterval(timer.current); setBusy(false); }
      return { ...t, k };
    }));
    timer.current = window.setInterval(step, reduced ? TICK / 2 : TICK);
  };

  const ask = async (input: { text: string; mentions?: string[]; answer?: string; fresh?: boolean }, id = `a${Date.now()}`) => {
    setBusy(true);
    const payload = { ...input, turn: n + 1 };
    setTurns((ts) => [...ts.filter((t) => t.id !== id), { id, from: 'assistant', events: [], k: 0, input: payload }]);
    try {
      const events = await service.request<AgentEvent[]>('assistant.turn', payload);
      setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, events, k: 0 } as Turn : t)));
      play(id, events);
    } catch (e) {
      setBusy(false);
      const context = isDemoError(e, 'invalid') && e.field === 'context';
      const error = isDemoError(e, 'lost-response') ? 'The connection dropped before the assistant answered. Nothing on the board changed. Try again.'
        : isDemoError(e, 'rate-limited') ? `The assistant is rate limited. ${errorMessage(e)} Nothing on the board changed.` : errorMessage(e);
      setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, error, context } as Turn : t)));
      say(error);
    }
  };
  const send = (m: PromptMessage) => {
    if (!m.text.trim()) return;
    setTurns((ts) => [...ts, { id: `u${Date.now()}`, from: 'user', text: m.text.trim() }]);
    void ask({ text: m.text.trim(), mentions: m.mentions?.map((x) => x.id) });
  };
  // Stop ends the stream where it is: what arrived stays, marked as stopped; nothing more is proposed.
  const stop = () => { window.clearInterval(timer.current); setBusy(false); setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 && t.from === 'assistant' ? { ...t, stopped: true } : t))); say('Stopped.'); };
  const fresh = () => { window.clearInterval(timer.current); setTurns([]); setAnswers({}); setBusy(false); };

  // Proposals join the board as the turn reaches them; when a turn that proposed something ends, the count is said once.
  const told = React.useRef(new Set<string>());
  React.useEffect(() => {
    P.add(turns.flatMap((t) => (t.from === 'assistant' ? fold(t.events, t.k).proposals : [])));
    for (const t of turns) {
      if (t.from !== 'assistant' || !t.events.length || t.k < lastMoment(t.events) || told.current.has(t.id)) continue;
      told.current.add(t.id);
      if (!fold(t.events, t.k).proposals.length) continue;
      const waiting = new Set([...P.proposals.filter((p) => p.status === 'proposed').map((p) => p.id), ...fold(t.events, t.k).proposals.map((p) => p.id)]).size;
      say(`${waiting === 1 ? '1 change' : `${waiting} changes`} proposed. Review them on the cards or in the assistant panel.`);
    }
  }, [turns]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = P.proposals.filter((p) => p.status === 'proposed' || p.status === 'failed');
  const decided = P.proposals.filter((p) => p.status !== 'proposed' && p.status !== 'failed');
  const b = q.data!;
  const mentionable = (query: string) => Object.values(b.cards).filter((k) => k.title.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    .map((k) => ({ id: k.id, label: k.title, kind: 'record' as const, description: COLUMN_TITLE[locate(b, k.id) ?? 'backlog'] }));
  const estimate = P.proposals.find((p): p is Extract<Proposal, { kind: 'points' }> => p.kind === 'points' && (p.status === 'proposed' || p.status === 'failed'));
  const state: ConfirmationState = applying ?? (open.length ? 'requested' : decided.some((p) => p.status === 'applied') ? 'done' : 'rejected');

  // A new set of proposals is a new decision.
  const count = P.proposals.length;
  React.useEffect(() => { setApplying(null); }, [count]);
  const applyAll = async () => {
    setApplying('running');
    const ok = await P.applyAll();
    setApplying(ok ? 'done' : 'failed');
    say(ok ? 'All changes applied.' : 'Some changes weren’t applied. They say why.');
  };

  return (
    <section className="pb-assistant" aria-labelledby="pb-assistant-title">
      <div className="pb-assistant-head">
        {inSheet ? <span id="pb-assistant-title" className="pb-sr">Assistant</span> : <h2 id="pb-assistant-title" className="pb-h2">Assistant</h2>}
        {turns.length > 0 && <Button size="sm" variant="ghost" onClick={fresh} disabled={busy}>New conversation</Button>}
      </div>
      <p className="pb-hint">Scripted for this example: whatever you ask, it plans Sprint 24. Mention a card with @ to keep it in the sprint.</p>
      <Conversation aria-label="Conversation with the assistant" className="pb-convo">
        <ConversationContent>
          {turns.length === 0 && (
            <Suggestions aria-label="Things to ask" mode="send" onChoose={(text) => send({ text, files: [] })}>
              <Suggestion>Rebalance Sprint 24 so it fits our capacity</Suggestion>
            </Suggestions>
          )}
          {turns.map((t) => {
            if (t.from === 'user') return <Message key={t.id} from="user"><MessageContent>{t.text}</MessageContent></Message>;
            const s = fold(t.events, t.k);
            const done = s.finished && t.k >= lastMoment(t.events);
            const status = t.stopped && !done ? 'stopped' : done ? 'complete' : 'streaming';
            if (t.error) {
              return (
                <Message key={t.id} from="assistant" status="error" onRetry={t.context ? undefined : () => void ask(t.input as never, t.id)}>
                  <MessageContent>
                    <Alert tone="critical" title={t.context ? 'The conversation is full' : 'No answer'} action={t.context ? <Button size="sm" onClick={() => { fresh(); void ask({ text: 'Rebalance Sprint 24 so it fits our capacity', fresh: true }); }}>Start a new conversation</Button> : undefined}>{t.error}</Alert>
                  </MessageContent>
                </Message>
              );
            }
            if (s.refusal) {
              return (
                <Message key={t.id} from="assistant">
                  <MessageContent><p className="pb-prose">{s.refusal}</p><p className="pb-hint">The model declined this request. Nothing on the board changed.</p></MessageContent>
                </Message>
              );
            }
            const first = !(t.input as { answer?: string }).answer;
            return (
              <Message key={t.id} from="assistant" status={status}>
                {first && (
                  <Trace aria-label="What the assistant did">
                    <TraceStep title="Think it through" status={!t.events.length ? 'running' : s.reasoningDone ? 'done' : 'running'} duration={s.reasoningMs}>
                      {s.reasoning && <TraceReasoning status={s.reasoningDone ? 'complete' : 'streaming'} duration={s.reasoningMs}>{s.reasoning}</TraceReasoning>}
                    </TraceStep>
                    <TraceStep title="Read the board" status={!s.tool ? 'planned' : s.tool.output ? 'done' : 'running'}>
                      {s.tool && <TraceToolCall name={s.tool.name} input={s.tool.input} output={s.tool.output} />}
                    </TraceStep>
                    <TraceStep title="Propose changes" status={s.proposals.length ? (done ? 'done' : 'running') : done ? 'done' : 'planned'} />
                  </Trace>
                )}
                {s.text && (
                  <MessageContent>
                    <Markdown streaming={status === 'streaming'}>{s.text}</Markdown>
                    {done && <AILabel subject="This plan" model={MODEL} />}
                  </MessageContent>
                )}
                {s.question && (
                  <Question title={s.question.title} state={answers[s.question.id] ? 'answered' : 'asking'} answer={answers[s.question.id] ? { values: [answers[s.question.id]] } : undefined}
                    answerLabel="Answer" requestedBy="The assistant"
                    onAnswer={(a) => { const v = a.values[0]; setAnswers((x) => ({ ...x, [s.question!.id]: v })); void ask({ text: '', answer: v }); }}>
                    {s.question.options.map((o) => <QuestionOption key={o.value} value={o.value} label={o.label} description={o.description} />)}
                  </Question>
                )}
              </Message>
            );
          })}
        </ConversationContent>
      </Conversation>

      {P.proposals.length > 0 && (
        <Confirmation state={state} title={`Apply ${open.length || P.proposals.length} ${(open.length || P.proposals.length) === 1 ? 'change' : 'changes'} to the board`}
          consequence={open.length ? `${open.map((p) => describeP(p, b)).join('; ')}. Nothing has changed yet.` : 'Every proposal is resolved.'}
          requestedBy="The assistant" approveLabel="Apply changes" rejectLabel="Discard all" runningLabel="Applying…" doneLabel="Applied" failedLabel="Some changes weren’t applied"
          resolvedBy="you" edited={!!estimate?.edited}
          edit={estimate ? (
            <div className="pb-edit">
              <span className="pb-label" id="pb-edit-estimate">Estimate for “{b.cards[estimate.card]?.title}”</span>
              <Select aria-labelledby="pb-edit-estimate" value={String(estimate.value)} onValueChange={(v) => P.edit(estimate.id, Number(v))}
                items={POINTS.map((x) => ({ value: String(x), label: `${x} ${x === 1 ? 'point' : 'points'}` }))} />
            </div>
          ) : undefined}
          details={
            <ul className="pb-proposals" aria-label="Proposed changes">
              {P.proposals.map((p) => (
                <li key={p.id} data-status={p.status}>
                  <span className="pb-proposal-text"><strong>{WORD[p.status]}</strong> {describeP(p, b)}. <span className="pb-hint">{p.note ?? p.why}</span></span>
                  {(p.status === 'proposed' || p.status === 'failed') && applying !== 'running' && (
                    <span className="pb-proposal-actions">
                      <Button size="sm" onClick={() => void P.apply(p.id)} aria-label={`Accept: ${describeP(p, b)}`}>{p.status === 'failed' ? 'Retry' : 'Accept'}</Button>
                      <Button size="sm" variant="ghost" onClick={() => P.reject(p.id)} aria-label={`Reject: ${describeP(p, b)}`}>Reject</Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          }
          onApprove={() => void applyAll()} onReject={() => { open.forEach((p) => P.reject(p.id)); setApplying('rejected'); say('Proposals discarded. Nothing on the board changed.'); }}
          onRetry={() => void applyAll()} />
      )}

      {P.activity.length > 0 && (
        <div className="pb-activity">
          <h3 className="pb-label">Activity</h3>
          <ul>{P.activity.map((a) => <li key={a.id}>{a.text}. <span className="pb-hint">By the assistant, approved by you, {new Date(a.at).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}.</span></li>)}</ul>
        </div>
      )}

      <PromptInput status={busy ? 'streaming' : 'ready'} onSubmit={send} onStop={stop} mentionable={mentionable}>
        <PromptInputTextarea placeholder="Ask the assistant about this sprint" aria-label="Message the assistant" />
        <PromptInputToolbar><PromptInputSubmit /></PromptInputToolbar>
      </PromptInput>
    </section>
  );
}

const WORD: Record<ProposalStatus, string> = { proposed: 'Proposed:', pending: 'Applying:', applied: 'Applied:', rejected: 'Rejected:', stale: 'Out of date:', failed: 'Not applied:' };
