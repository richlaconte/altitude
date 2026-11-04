// Example: a support inbox (#404), for working through tickets one at a time.
//   Task: a support agent works through open tickets one at a time and replies.
//   Lead: the open ticket. Primary action: Send reply. Next: the next ticket in the view.
//   Frame: list and detail (screen-layout.md): ResizablePanelGroup with an InboxList and the open ticket. When it's
//   narrow, the list and the ticket are separate screens with Back, and focus returns to the ticket's row.
//
// What it shows: tickets arriving lifted and settling without moving the row you're on (InboxList); a teammate present
// on a ticket, and replying (CommentThread's typing); a reply that hovers while it's sent, drops into a trench with Retry
// if it fails (text kept), and waits offline with "1 reply waiting to send" in a SyncIndicator above the composer, sent
// once when the connection's back; properties edited in place (PropertyList), where a teammate reassigning the ticket
// first is a raised Alert that keeps your draft. Public replies and internal notes are two CommentThreads, told apart by
// their headings and a caution edge on the notes, never by colour alone.
//
// Views are Tabs (Mine, Unassigned, Waiting on customer, All), not SavedViews: SavedViews keeps named drafts of a
// FilterBar and a DataTable, and this list has neither. A simulated send proves nothing about a real mail server.
import * as React from 'react';
import {
  Alert, Badge, Button, CommandPalette, CommentThread, Field, InboxItem, InboxList, Kbd, NotificationCenter, PageHeader,
  PageHeaderDescription, PageHeaderTitle, PrimaryScope, PropertyList, PropertyListItem, RelativeTime, ResizableHandle, ResizablePanel,
  ResizablePanelGroup, Select, Skeleton, Suggestion, Suggestions, SyncIndicator, Tabs, TabsContent, TabsList, TabsTrigger, Textarea,
} from 'altitude-design';
import type { InboxListHandle, ThreadComment, Tone } from 'altitude-design';
import { DemoError, errorMessage, isDemoError, useDemoQuery, useDemoService } from '../shared/react';
import { AGENTS, ME, PRIORITIES, STATUSES, TEAMMATE, service } from './data';
import type { Message, Store, Ticket } from './data';

export { events, service } from './data';

const VIEWS = [
  { id: 'mine', label: 'Mine', test: (t: Ticket) => t.assignee === ME && t.status !== 'Solved' },
  { id: 'unassigned', label: 'Unassigned', test: (t: Ticket) => !t.assignee && t.status !== 'Solved' },
  { id: 'waiting', label: 'Waiting on customer', test: (t: Ticket) => t.status === 'Pending' },
  { id: 'all', label: 'All', test: () => true },
] as const;
const TONE: Record<string, Tone> = { Open: 'caution', Pending: 'neutral', 'On hold': 'neutral', Solved: 'positive' };
const SAVED_REPLIES = [
  { label: 'Refund started', text: 'I’ve started your refund. You’ll see it on your card in 3–5 working days.' },
  { label: 'Need a photo', text: 'Could you send a photo of the damage? It helps us sort this out faster.' },
  { label: 'Password reset', text: 'Try resetting your password from the sign-in screen; the link is valid for an hour.' },
];
type Outgoing = { id: string; ticket: string; body: string; at: number; status: 'pending' | 'waiting' | 'failed'; error?: string };
let n = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${++n}`;

export function App() {
  const snap = useDemoService(service);
  const query = useDemoQuery<Store, Ticket[]>(service, 'tickets.list');
  const mentions = useDemoQuery<Store, Store['mentions']>(service, 'mentions.list');
  const [view, setView] = React.useState<(typeof VIEWS)[number]['id']>('mine');
  const [open, setOpen] = React.useState<string | null>(null);
  const [narrow, setNarrow] = React.useState(false);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [outbox, setOutbox] = React.useState<Outgoing[]>([]);
  const outboxRef = React.useRef(outbox); outboxRef.current = outbox;
  const [online, setOnline] = React.useState(() => service.isOnline());
  const [conflict, setConflict] = React.useState<{ ticket: string; text: string } | null>(null);
  const [said, setSaid] = React.useState('');
  const [palette, setPalette] = React.useState(false);
  const list = React.useRef<InboxListHandle>(null);
  const composer = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => { if (snap.resetRevision) { setOpen(null); setDrafts({}); setOutbox([]); setConflict(null); } }, [snap.resetRevision]);

  const tickets = query.data ?? [];
  const shown = tickets.filter(VIEWS.find((v) => v.id === view)!.test);
  const ticket = tickets.find((t) => t.id === open) ?? null;

  const choose = (id: string) => {
    setOpen(id); setConflict(null);
    const t = tickets.find((x) => x.id === id);
    if (t?.unread) { query.setData((ts) => ts?.map((x) => (x.id === id ? { ...x, unread: false } : x))); void service.request('tickets.read', { ticket: id }).catch(() => undefined); }
  };
  const back = () => { const id = open; setOpen(null); if (id) requestAnimationFrame(() => list.current?.focusItem(id)); };
  const next = () => { const i = shown.findIndex((t) => t.id === open); const n2 = shown[i + 1] ?? shown[0]; if (n2 && n2.id !== open) { choose(n2.id); requestAnimationFrame(() => list.current?.focusItem(n2.id)); } };

  // Sending: idempotent by the reply's id, so a retry after a lost response can't send twice.
  const send = async (o: Outgoing) => {
    const set = (patch: Partial<Outgoing> | null) => setOutbox((all) => (patch === null ? all.filter((x) => x.id !== o.id) : all.map((x) => (x.id === o.id ? { ...x, ...patch } : x))));
    set({ status: 'pending', error: undefined });
    try {
      const m = await service.request<Message>('tickets.reply', { ticket: o.ticket, id: o.id, body: o.body });
      landed(o.ticket, m); set(null); setSaid('Reply sent.');
    } catch (e) {
      const err = e instanceof DemoError ? e : new DemoError('failed', errorMessage(e));
      if (err.kind === 'offline') { set({ status: 'waiting' }); return; }
      if (err.kind === 'lost-response') {
        const now = await service.request<Ticket[]>('tickets.list').catch(() => null);
        const m = now?.find((t) => t.id === o.ticket)?.messages.find((x) => x.id === o.id);
        if (m) { landed(o.ticket, m); set(null); setSaid('Reply sent.'); return; }
        set({ status: 'failed', error: now ? 'It wasn’t sent.' : 'We couldn’t check whether it was sent. Retry won’t send it twice.' }); return;
      }
      set({ status: 'failed', error: err.message }); setSaid(`Your reply wasn’t sent. ${err.message}`);
    }
  };
  const landed = (id: string, m: Message) => query.setData((ts) => ts?.map((t) => (t.id === id ? { ...t, messages: t.messages.some((x) => x.id === m.id) ? t.messages : [...t.messages, m], status: 'Pending' } : t)));
  const reply = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ticket) return;
    const body = (drafts[ticket.id] ?? '').trim();
    if (!body) { composer.current?.focus(); return; }
    const o: Outgoing = { id: newId('r'), ticket: ticket.id, body, at: Date.now(), status: 'pending' };
    setOutbox((all) => [...all, o]); setDrafts((d) => ({ ...d, [ticket.id]: '' }));
    if (!service.isOnline()) { setOutbox((all) => all.map((x) => (x.id === o.id ? { ...x, status: 'waiting' } : x))); return; }
    void send(o);
  };
  // Back online: the waiting replies go, in order, once each.
  React.useEffect(() => service.onConnectivity((on) => {
    setOnline(on);
    if (on) for (const o of outboxRef.current.filter((x) => x.status === 'waiting')) void send(o);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (field: 'assignee' | 'priority' | 'status') => async (value: string | null, { previousValue }: { previousValue: string | null }) => {
    if (!ticket) return { ok: false as const, error: 'No ticket is open.' };
    try {
      const t = await service.request<Ticket>('tickets.update', { ticket: ticket.id, field, value, expected: previousValue });
      query.setData((ts) => ts?.map((x) => (x.id === t.id ? t : x)));
      return { ok: true as const, value: (t[field] ?? null) as string | null };
    } catch (e) {
      if (isDemoError(e, 'conflict')) {
        const now = (e as DemoError).current as Ticket;
        query.setData((ts) => ts?.map((x) => (x.id === now.id ? now : x)));
        const text = field === 'assignee' && now.assignee !== ME ? `${TEAMMATE} reassigned this to ${now.assignee === TEAMMATE ? 'herself' : now.assignee ?? 'nobody'}. Your draft is kept.` : `${TEAMMATE} changed the ${field} first. Your draft is kept.`;
        setConflict({ ticket: now.id, text });
        return { ok: false as const, error: 'Changed by a teammate first.' };
      }
      return { ok: false as const, error: errorMessage(e) };
    }
  };
  // A teammate reassigning the ticket you're on, from a refetch, says so too.
  const lastAssignee = React.useRef<Record<string, string | null>>({});
  React.useEffect(() => {
    for (const t of tickets) {
      const was = lastAssignee.current[t.id];
      if (t.id === open && was === ME && t.assignee && t.assignee !== ME) setConflict({ ticket: t.id, text: `${t.assignee} reassigned this to ${t.assignee === TEAMMATE ? 'herself' : 'themselves'}. Your draft is kept.` });
      lastAssignee.current[t.id] = t.assignee;
    }
  }, [tickets, open]);

  const postNote = async (body: string) => {
    if (!ticket) return;
    const id = newId('n');
    try { const m = await service.request<Message>('tickets.note', { ticket: ticket.id, id, body }); query.setData((ts) => ts?.map((t) => (t.id === ticket.id ? { ...t, notes: [...t.notes, m] } : t))); }
    catch (e) { setSaid(`Your note wasn’t saved. ${errorMessage(e)}`); }
  };

  if (!query.data) {
    return <main className="si"><PageHeader><PageHeaderTitle>Support</PageHeaderTitle></PageHeader>
      {query.error ? <Alert tone="critical" title="We couldn’t load the tickets" action={<Button size="sm" onClick={() => void query.reload()}>Try again</Button>}>{errorMessage(query.error)}</Alert>
        : <div role="status" aria-label="Loading tickets"><Skeleton shape="text" lines={6} /></div>}</main>;
  }

  const mine = outbox.filter((o) => o.ticket === open);
  const waiting = outbox.filter((o) => o.status === 'waiting' || o.status === 'pending');
  const comments: ThreadComment[] = ticket ? [
    ...ticket.messages.map((m) => ({ id: m.id, author: { name: m.author }, body: m.body, createdAt: m.at, mine: m.author === ME })),
    ...mine.map((o) => ({ id: o.id, author: { name: ME }, body: o.body, createdAt: o.at, mine: true, status: (o.status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed' })),
  ] : [];
  const others = ticket?.viewers.filter((v) => v.name !== ME) ?? [];
  const unreadMentions = (mentions.data ?? []).filter((m) => !m.read);

  const detail = ticket ? (
    <section className="si-ticket" aria-labelledby="si-ticket-h">
      {narrow && <Button variant="ghost" size="sm" className="si-back" onClick={back}>Back to tickets</Button>}
      <div className="si-ticket-head">
        <h2 id="si-ticket-h" className="si-h2" tabIndex={-1}>{ticket.subject}</h2>
        <p className="si-meta">{ticket.requester} · {ticket.id} · <Badge tone={TONE[ticket.status]}>{ticket.status}</Badge></p>
        {others.length > 0 && <p className="si-presence">{others.map((v) => `${v.name} is ${v.replying ? 'replying' : 'viewing'}`).join('. ')}.</p>}
      </div>
      {conflict?.ticket === ticket.id && (
        <Alert tone="caution" title="This ticket changed" action={<span className="si-actions"><Button size="sm" onClick={() => setConflict(null)}>Keep working</Button><Button size="sm" onClick={next}>Go to next</Button></span>}>{conflict.text}</Alert>
      )}
      <div className="si-ticket-body">
        <div className="si-convo">
          <h3 className="si-h3">Conversation with {ticket.requester}</h3>
          <CommentThread aria-label={`Conversation with ${ticket.requester}`} comments={comments} typing={others.filter((v) => v.replying).map((v) => v.name)}
            onRetry={(id) => { const o = outbox.find((x) => x.id === id); if (o) void send(o); }} />
          <form className="si-composer" onSubmit={reply}>
            {waiting.length > 0 && !online && <SyncIndicator state="offline" pending={waiting.length} queue={<span>{waiting.length === 1 ? '1 reply waiting to send' : `${waiting.length} replies waiting to send`}</span>} />}
            <Field label={`Reply to ${ticket.requester}`} hint="Sent by email. Use a note below for things only your team should see.">
              <Textarea ref={composer} rows={4} value={drafts[ticket.id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [ticket.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); reply(); } }} />
            </Field>
            <Suggestions aria-label="Saved replies" onChoose={(text) => { setDrafts((d) => ({ ...d, [ticket.id]: `${d[ticket.id] ? `${d[ticket.id]}\n` : ''}${text}` })); composer.current?.focus(); }}>
              {SAVED_REPLIES.map((r) => <Suggestion key={r.label} value={r.text}>{r.label}</Suggestion>)}
            </Suggestions>
            <div className="si-actions"><Button type="submit" variant="primary">Send reply</Button><span className="si-hint"><Kbd hideOnTouch>⌘</Kbd><Kbd hideOnTouch>Enter</Kbd> sends</span></div>
          </form>
          <section className="si-notes" aria-labelledby="si-notes-h">
            <h3 id="si-notes-h" className="si-h3">Internal notes · not sent to the customer</h3>
            {/* The notes are their own part, with their own action (Comment), so they're their own primary scope. */}
            <PrimaryScope name="internal notes">
              <CommentThread aria-label="Internal notes, not sent to the customer" comments={ticket.notes.map((m) => ({ id: m.id, author: { name: m.author }, body: m.body, createdAt: m.at, mine: m.author === ME, mentions: m.body.includes(`@${ME}`) ? [ME] : undefined }))}
                onPost={(body) => void postNote(body)} />
            </PrimaryScope>
          </section>
        </div>
        <PropertyList aria-label="Ticket properties" className="si-props">
          <PropertyListItem<string | null> label="Assignee" value={ticket.assignee} emptyLabel="Unassigned" commit="on-choose" onSave={update('assignee')}
            editor={(c) => <Select {...c} value={c.value ?? ''} onValueChange={(v) => c.onValueChange(v || null)} items={AGENTS.map((a) => ({ value: a, label: a === ME ? `${a} (you)` : a }))} />} />
          <PropertyListItem<string | null> label="Priority" value={ticket.priority} commit="on-choose" onSave={update('priority')}
            editor={(c) => <Select {...c} value={c.value ?? ''} items={PRIORITIES.map((p) => ({ value: p, label: p }))} />} />
          <PropertyListItem<string | null> label="Status" value={ticket.status} commit="on-choose" onSave={update('status')}
            editor={(c) => <Select {...c} value={c.value ?? ''} items={STATUSES.map((p) => ({ value: p, label: p }))} />} />
        </PropertyList>
      </div>
    </section>
  ) : <section className="si-ticket si-empty" aria-label="No ticket open"><p className="si-meta">Choose a ticket to work on.</p></section>;

  return (
    <main className="si">
      <PageHeader actions={<>
        <NotificationCenter items={(mentions.data ?? []).map((m) => ({ id: m.id, title: `${m.by} mentioned you`, body: tickets.find((t) => t.id === m.ticket)?.subject, createdAt: m.at, read: m.read }))}
          onOpen={(item) => { const m = mentions.data?.find((x) => x.id === item.id); if (m) choose(m.ticket); }}
          onMarkRead={(ids) => { mentions.setData((ms) => ms?.map((m) => (ids.includes(m.id) ? { ...m, read: true } : m))); void service.request('mentions.read', { ids }).catch(() => undefined); }}
          onMarkAllRead={() => { const ids = unreadMentions.map((m) => m.id); mentions.setData((ms) => ms?.map((m) => ({ ...m, read: true }))); void service.request('mentions.read', { ids }).catch(() => undefined); }} />
        <Button variant="secondary" onClick={() => setPalette(true)}>Commands <Kbd hideOnTouch>⌘K</Kbd></Button>
      </>}>
        <PageHeaderTitle>Support</PageHeaderTitle>
        <PageHeaderDescription>{shown.filter((t) => t.unread).length} unread in {VIEWS.find((v) => v.id === view)!.label}. ↑ and ↓ move through the list, Enter opens.</PageHeaderDescription>
      </PageHeader>
      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList aria-label="Views">{VIEWS.map((v) => <TabsTrigger key={v.id} value={v.id}>{v.label} ({tickets.filter(v.test).length})</TabsTrigger>)}</TabsList>
        {/* The panes are the chosen view's panel (#492): the tab and the inbox it filters are one sheet. The panel's value
            follows the view, so the panes stay mounted (and keep their sizes and scroll) as the view changes. */}
        <TabsContent value={view} className="si-folder">
          <ResizablePanelGroup className="si-panes" narrowPanel={open ? 1 : 0} onNarrowChange={setNarrow} autoSaveId="support-inbox">
            <ResizablePanel defaultSize={36} minSize={24} aria-label="Tickets" className="si-list">
              {shown.length ? <InboxList<Ticket> ref={list} aria-label={`Tickets: ${VIEWS.find((v) => v.id === view)!.label}`} items={shown} getKey={(t) => t.id}
                selected={open} onSelectedChange={choose}
                renderItem={(t) => <InboxItem title={t.subject} from={t.requester} unread={t.unread} preview={t.messages[t.messages.length - 1]?.body}
                  time={<RelativeTime date={t.updatedAt} tooltip={false} />} status={<Badge tone={TONE[t.status]}>{t.status}</Badge>}
                  viewers={t.viewers.filter((v) => v.name !== ME).map((v) => ({ name: v.name, presence: 2 as const, replying: v.replying }))} />} />
                : <p className="si-meta si-pad">Nothing in {VIEWS.find((v) => v.id === view)!.label}.</p>}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel aria-label="Open ticket" className="si-detail">{detail}</ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>
      </Tabs>
      <CommandPalette open={palette} onOpenChange={setPalette} items={[
        { id: 'go', label: 'Go to ticket', items: tickets.map((t) => ({ id: t.id, label: `${t.subject}`, keywords: [t.id, t.requester], onSelect: () => { choose(t.id); setView('all'); } })) },
        { id: 'act', label: ticket ? `This ticket: ${ticket.subject}` : 'This ticket', items: ticket ? [
          { id: 'assign', label: 'Assign to me', onSelect: () => void update('assignee')(ME, { previousValue: ticket.assignee }) },
          { id: 'solve', label: 'Mark as solved', onSelect: () => void update('status')('Solved', { previousValue: ticket.status }) },
          { id: 'next', label: 'Next ticket', onSelect: next },
        ] : [] },
      ]} />
      <span className="si-sr" role="status">{said}</span>
    </main>
  );
}
