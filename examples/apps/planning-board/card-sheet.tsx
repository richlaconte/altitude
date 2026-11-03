// A card opened in a Sheet: its properties edited where they sit, each saved against the card's version, so a change
// someone else made first comes back as a conflict in words. Status moves the card, under the same rules as the board.
import * as React from 'react';
import { DatePicker, PropertyList, PropertyListItem, Select, Sheet, SheetDescription, SheetHeader, SheetTitle, TagInput } from 'altitude-design';
import type { DemoQuery } from '../shared/react';
import { errorMessage, isDemoError } from '../shared/react';
import { COLUMNS, COLUMN_TITLE, PEOPLE, POINTS, service } from './data';
import type { BoardData, Card, ColumnId } from './data';
import type { Proposals } from './assistant';

type Saved<V> = { ok: true; value: V } | { ok: false; error: string };

export function CardSheet({ q, id, onClose, assistant }: { q: DemoQuery<BoardData>; id: string | null; onClose: () => void; assistant?: Proposals }) {
  // The assistant's open proposals for this card's fields show in place: current struck beside proposed, Accept and Reject.
  const proposal = (kind: 'points' | 'assignee') => assistant?.proposals.find((p) => p.card === id && p.kind === kind && p.status === 'proposed');
  const pts = proposal('points'), who = proposal('assignee');
  const resolved = (p: { id: string } | undefined) => (ok: boolean) => { if (!p) return; if (ok) assistant!.accepted(p.id); else assistant!.reject(p.id); };
  const data = q.data;
  const k = id && data ? data.cards[id] : undefined;
  const column = k && data ? (Object.keys(data.columns) as ColumnId[]).find((c) => data.columns[c].includes(k.id)) : undefined;

  // InlineEdit's contract: resolve with the saved value, then publish it through onValueChange. Changing the record
  // while the save is still in flight would look, to the editor, like someone else's change.
  const stash = React.useRef<(() => void) | null>(null);
  const publish = () => { stash.current?.(); stash.current = null; };

  const update = <K extends keyof Card>(key: K) => async (value: Card[K]): Promise<Saved<Card[K]>> => {
    const now = q.data?.cards[id!];
    if (!now) return { ok: false, error: 'That card no longer exists.' };
    try {
      const saved = await service.request<Card>('cards.update', { id: now.id, patch: { [key]: value }, rev: now.rev });
      stash.current = () => q.setData((d) => (d ? { ...d, cards: { ...d.cards, [saved.id]: saved } } : d));
      return { ok: true, value: saved[key] };
    } catch (e) {
      if (isDemoError(e, 'conflict')) {
        const current = e.current as Card | undefined;
        if (current) q.setData((d) => (d ? { ...d, cards: { ...d.cards, [current.id]: current } } : d));
        return { ok: false, error: 'Someone else changed this card first. Their version is shown; make your change again if you still want it.' };
      }
      if (isDemoError(e, 'lost-response')) {
        try {
          const b = await service.request<BoardData>('board.get');
          stash.current = () => q.setData(() => b);
          const landed = b.cards[now.id]?.[key];
          if (JSON.stringify(landed) === JSON.stringify(value)) return { ok: true, value };
          publish();
        } catch { /* fall through */ }
        return { ok: false, error: 'The connection dropped and the change wasn’t saved. Try again.' };
      }
      return { ok: false, error: errorMessage(e) };
    }
  };

  const moveTo = async (to: string): Promise<Saved<string>> => {
    const now = q.data?.cards[id!];
    if (!now || !q.data) return { ok: false, error: 'That card no longer exists.' };
    try {
      const b = await service.request<BoardData>('cards.move', { id: now.id, column: to, index: q.data.columns[to as ColumnId].length, rev: now.rev });
      stash.current = () => q.setData(() => b);
      return { ok: true, value: to };
    } catch (e) {
      if (isDemoError(e, 'lost-response')) {
        try { const b = await service.request<BoardData>('board.get'); stash.current = () => q.setData(() => b); if (b.columns[to as ColumnId].includes(now.id)) return { ok: true, value: to }; publish(); } catch { /* fall through */ }
      }
      if (isDemoError(e, 'conflict') && e.current) q.setData(() => e.current as BoardData);
      return { ok: false, error: errorMessage(e) };
    }
  };

  return (
    <Sheet open={!!k} onOpenChange={(o) => { if (!o) onClose(); }} size="md">
      {k && column && <>
        <SheetHeader>
          <SheetTitle>{k.title}</SheetTitle>
          <SheetDescription>{k.epic} · in {COLUMN_TITLE[column]}</SheetDescription>
        </SheetHeader>
        <PropertyList aria-label={`${k.title}: details`} proposedBy="The assistant">
          <PropertyListItem label="Title" value={k.title} onSave={update('title')} onValueChange={publish} validate={(v) => (v.trim() ? undefined : 'Give the card a title.')} />
          <PropertyListItem label="Status" value={column as string} renderValue={(v) => COLUMN_TITLE[v as ColumnId]} commit="on-choose" onSave={moveTo} onValueChange={publish}
            editor={(c) => <Select {...c} items={COLUMNS.map((x) => ({ value: x.id, label: x.title }))} />} />
          <PropertyListItem label="Assignee" value={k.assignee ?? ''} emptyLabel="Unassigned" commit="on-choose" onValueChange={publish}
            proposed={who && who.kind === 'assignee' ? who.value : undefined} onProposalResolved={resolved(who)}
            onSave={async (v) => { const r = await update('assignee')(v || null); return r.ok ? { ok: true, value: r.value ?? '' } : r; }}
            editor={(c) => <Select {...c} items={PEOPLE.map((p) => ({ value: p, label: p }))} />} />
          <PropertyListItem label="Estimate" value={k.points == null ? '' : String(k.points)} emptyLabel="No estimate" commit="on-choose" onValueChange={publish}
            proposed={pts && pts.kind === 'points' ? String(pts.value) : undefined} onProposalResolved={resolved(pts)}
            renderValue={(v) => `${v} points`}
            onSave={async (v) => { const r = await update('points')(v ? Number(v) : null); return r.ok ? { ok: true, value: r.value == null ? '' : String(r.value) } : r; }}
            editor={(c) => <Select {...c} items={POINTS.map((p) => ({ value: String(p), label: `${p} points` }))} />} />
          <PropertyListItem<string[]> label="Tags" value={k.tags} emptyLabel="No tags" renderValue={(v) => v.join(', ')} onSave={update('tags')} onValueChange={publish}
            isEqual={(a, b) => a.join() === b.join()}
            editor={(c) => <TagInput id={c.id} value={c.value} onValueChange={c.onValueChange} disabled={c.readOnly || c.disabled} noun={['tag', 'tags']} />} />
          <PropertyListItem<string | null> label="Due" value={k.due} emptyLabel="No due date" renderValue={(v) => v ?? ''} commit="on-choose" onSave={update('due')} onValueChange={publish}
            editor={(c) => <DatePicker id={c.id} value={c.value} onValueChange={c.onValueChange} locale="en-IE" />} />
        </PropertyList>
      </>}
    </Sheet>
  );
}
