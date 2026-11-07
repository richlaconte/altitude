import * as React from 'react';
import {
  Avatar, Board, BoardCard, BoardColumn, Button, Confirmation, DiffView, InlineEdit, PrimaryScope,
  Switch, Tabs, TabsContent, TabsList, TabsTrigger,
} from '../project/components/src/index';
import type { BoardMove, BuiltInScheme, ConfirmationState } from '../project/components/src/index';
import { COLUMN_TITLES, placeTask, type ColumnId, type Columns } from './workbench-state';

type Scene = 'plan' | 'write' | 'review';
const SCENES: { id: Scene; label: string; context: string; hint: string }[] = [
  { id: 'plan', label: 'Plan a project', context: 'This week / Website', hint: 'Move a task, or pick one up and use the arrow keys.' },
  { id: 'write', label: 'Edit a note', context: 'Workspace / Notes', hint: 'Edit the title. Try a failed save, too.' },
  { id: 'review', label: 'Review a change', context: 'Workspace / Agent', hint: 'You decide which wording to keep.' },
];
const INITIAL_MESSAGES = Object.fromEntries(SCENES.map(scene => [scene.id, scene.hint])) as Record<Scene, string>;
const START: Columns = {
  next: [{ id: 'examples', code: 'WEB–12', title: 'Choose the example apps', owner: 'Mara Quist' }],
  doing: [{ id: 'navigation', code: 'WEB–08', title: 'Try the new navigation', owner: 'Tomás Reyes' }],
  done: [],
};
const BEFORE = 'Welcome to our comprehensive guide to getting started.';
const AFTER = 'Here’s how to get started.';

/** These waits represent a local demo only. Reset/unmount resolves them as cancelled,
 * so a late callback cannot change a new scene or take focus from another view. */
function useDemoDelay() {
  const waits = React.useRef(new Map<ReturnType<typeof setTimeout>, (completed: boolean) => void>());
  React.useEffect(() => () => {
    waits.current.forEach((resolve, timer) => { clearTimeout(timer); resolve(false); });
    waits.current.clear();
  }, []);
  return React.useCallback((ms: number) => new Promise<boolean>(resolve => {
    const timer = setTimeout(() => { waits.current.delete(timer); resolve(true); }, ms);
    waits.current.set(timer, resolve);
  }), []);
}

function PlanningScene({ onMessage }: { onMessage: (message: string) => void }) {
  const [columns, setColumns] = React.useState<Columns>(START);
  const latest = React.useRef(columns);
  const [writes, setWrites] = React.useState<Record<string, 'pending' | 'committed'>>({});
  const sequences = React.useRef(new Map<string, number>());
  const board = React.useRef<HTMLDivElement>(null);
  const delay = useDemoDelay();

  const move = async ({ cardId, to }: BoardMove) => {
    const next = placeTask(latest.current, cardId, to);
    if (next === latest.current) return;
    const task = Object.values(next).flat().find(card => card.id === cardId)!;
    latest.current = next;
    setColumns(next);
    const sequence = (sequences.current.get(cardId) ?? 0) + 1;
    sequences.current.set(cardId, sequence);
    setWrites(current => ({ ...current, [cardId]: 'pending' }));
    onMessage(`Moving “${task.title}”…`);
    // Every keyboard move remains usable, including Escape to the original column.
    // Only the newest move for this card may settle its status.
    if (!await delay(800) || sequences.current.get(cardId) !== sequence) return;
    setWrites(current => ({ ...current, [cardId]: 'committed' }));
    onMessage(`“${task.title}” moved to ${COLUMN_TITLES[to.column as ColumnId].toLowerCase()}.`);
  };

  const moveWithButton = (cardId: string, column: ColumnId, event: React.MouseEvent<HTMLButtonElement>) => {
    const source = (Object.keys(COLUMN_TITLES) as ColumnId[]).find(key => latest.current[key].some(card => card.id === cardId))!;
    const restore = document.activeElement === event.currentTarget;
    void move({ cardId, from: { column: source, index: latest.current[source].findIndex(card => card.id === cardId) }, to: { column, index: latest.current[column].length } });
    if (restore) requestAnimationFrame(() => {
      const button = board.current?.querySelector<HTMLButtonElement>(`[data-move-task="${cardId}"]`);
      if (button && !button.closest('[inert], [aria-hidden="true"]')) button.focus();
    });
  };

  const revealFocusedCard = (event: React.FocusEvent<HTMLDivElement>) => {
    const root = event.currentTarget;
    const target = event.target as HTMLElement;
    if (!target.matches('.alt-board-card-face') || root.closest('[inert], [aria-hidden="true"]')) return;
    const card = target.closest<HTMLElement>('[data-board-card]');
    if (!card) return;
    // Board refocuses after each keyboard move (including Escape) in rAF with
    // preventScroll. Layout offsets locate the destination even while FLIP's
    // transform still draws the card at its previous position.
    let left = 0;
    let node: HTMLElement | null = card;
    while (node && node !== root) {
      left += node.offsetLeft;
      node = node.offsetParent as HTMLElement | null;
      if (node && node !== root) left += node.clientLeft;
    }
    if (node !== root) return;
    const right = left + card.offsetWidth;
    const margin = 8;
    if (left - margin < root.scrollLeft) root.scrollLeft = left - margin;
    else if (right + margin > root.scrollLeft + root.clientWidth) root.scrollLeft = right + margin - root.clientWidth;
  };

  return <div className="wb-plan">
    <Board ref={board} onMove={move} onFocusCapture={revealFocusedCard} aria-label="Fieldwork Studio website board" className="wb-board">
      {(Object.keys(COLUMN_TITLES) as ColumnId[]).map(column => (
        <BoardColumn key={column} id={column} title={COLUMN_TITLES[column]} className="wb-column">
          {columns[column].map(task => (
            <BoardCard key={task.id} id={task.id} label={task.title} status={writes[task.id]} className="wb-task">
              <div className="wb-task-content">
                <span className="wb-task-code">{task.code}</span>
                <p className="wb-task-title">{task.title}</p>
                <div className="wb-person"><Avatar name={task.owner} size={24} status="offline" /><span>{task.owner}</span></div>
                <div className="wb-task-actions">
                  <Button size="sm" variant="secondary" data-move-task={task.id}
                    aria-label={`${column === 'done' ? 'Move back to in progress' : 'Move to done'}: ${task.title}`}
                    onClick={event => moveWithButton(task.id, column === 'done' ? 'doing' : 'done', event)}>
                    {column === 'done' ? 'Move back' : 'Move to done'} <span aria-hidden="true">{column === 'done' ? '↖' : '↗'}</span>
                  </Button>
                  {writes[task.id] === 'pending' && <span className="wb-saving">Moving…</span>}
                </div>
              </div>
            </BoardCard>
          ))}
        </BoardColumn>
      ))}
    </Board>
  </div>;
}

function WritingScene({ onMessage }: { onMessage: (message: string) => void }) {
  const [title, setTitle] = React.useState('A better first day');
  const [failNext, setFailNext] = React.useState(false);
  const failure = React.useRef(false);
  const delay = useDemoDelay();

  return <div className="wb-note">
    <div className="wb-document-heading"><h3>Team notes</h3><span>Getting started</span></div>
    <div className="wb-note-title">
      <InlineEdit label="Note title" value={title} onValueChange={setTitle} required maxLength={70}
        saveLabel="Save title" editLabel="Edit title" pending="value"
        validate={draft => draft.trim() ? undefined : 'Enter a title for this note.'}
        onSave={async draft => {
          const shouldFail = failure.current;
          failure.current = false;
          setFailNext(false);
          onMessage('Saving your title…');
          if (!await delay(1000)) return { ok: false, error: 'This demo was reset.' };
          if (shouldFail) {
            onMessage('That save failed. Your title is kept for another try.');
            return { ok: false, error: 'The demo refused this save. Your title is kept; try again.' };
          }
          onMessage('Your title is saved in this demo.');
          return { ok: true, value: draft.trim() };
        }} />
    </div>
    <p className="wb-note-lead">Start with a small task. Leave room for questions.</p>
    <ul className="wb-note-details">
      <li>Find your way around the workspace.</li>
      <li>Pick something you can finish today.</li>
    </ul>
    <div className="wb-note-fixture">
      <Switch label="Fail next save" checked={failNext} onCheckedChange={checked => { failure.current = checked; setFailNext(checked); }} />
    </div>
  </div>;
}

function ReviewScene({ active, onMessage }: { active: boolean; onMessage: (message: string) => void }) {
  const [state, setState] = React.useState<ConfirmationState>('requested');
  const stateRef = React.useRef(state);
  const [wording, setWording] = React.useState(BEFORE);
  const review = React.useRef<HTMLDivElement>(null);
  const outcome = React.useRef<HTMLDivElement>(null);
  const restore = React.useRef(false);
  const delay = useDemoDelay();
  const transition = (next: ConfirmationState) => { stateRef.current = next; setState(next); };
  const resolved = state === 'done' || state === 'rejected';

  React.useEffect(() => {
    if (resolved && restore.current) {
      restore.current = false;
      if (active && document.hasFocus() && (document.activeElement === document.body || outcome.current?.closest('[role="tabpanel"]')?.contains(document.activeElement))) outcome.current?.focus({ preventScroll: true });
    }
  }, [resolved, active]);

  const approve = async () => {
    if (stateRef.current !== 'requested') return;
    restore.current = true;
    transition('running');
    onMessage('Applying the wording to this demo note…');
    if (!await delay(900)) return;
    setWording(AFTER);
    transition('done');
    onMessage('The shorter introduction is now in the note.');
  };
  const reject = () => {
    if (stateRef.current !== 'requested') return;
    restore.current = true;
    transition('rejected');
    onMessage('The original wording stays in the note.');
  };

  return <div className="wb-review" ref={review} role="group" tabIndex={-1} aria-label="Review suggested wording">
    <Confirmation state={state} title="A shorter introduction" requestedBy="Your coding agent"
      consequence={state === 'done' ? 'The demo note now uses the shorter wording.' : state === 'rejected' ? 'The original wording is unchanged.' : 'Replace the opening sentence in the team note.'}
      approveLabel="Use this wording" rejectLabel="Keep the original" runningLabel="Applying wording…" doneLabel="Wording updated" resolvedBy="you"
      details={<DiffView caption="Team note · proposed wording" before={BEFORE} after={AFTER} />}
      onApprove={approve} onReject={reject} />
    {resolved && <div className="wb-review-result" ref={outcome} tabIndex={-1} aria-label="Current introduction">
      <span className="wb-result-label">Current introduction</span><p>{wording}</p>
      <Button variant="ghost" size="sm" onClick={() => {
        setWording(BEFORE); transition('requested'); onMessage('You decide which wording to keep.');
        // The replay button disappears. Its stable parent provides a deliberate,
        // immediate focus destination, before the new request's actions in Tab order.
        review.current?.focus({ preventScroll: true });
      }}>Try the review again</Button>
    </div>}
  </div>;
}

function Scenes({ scene, onMessage }: { scene: Scene; onMessage: (scene: Scene, message: string) => void }) {
  return <>
    <TabsContent value="plan" forceMount className="wb-scene"><PlanningScene onMessage={message => onMessage('plan', message)} /></TabsContent>
    <TabsContent value="write" forceMount className="wb-scene"><WritingScene onMessage={message => onMessage('write', message)} /></TabsContent>
    <TabsContent value="review" forceMount className="wb-scene"><ReviewScene active={scene === 'review'} onMessage={message => onMessage('review', message)} /></TabsContent>
  </>;
}

export function Workbench({ scheme, onSchemeChange }: { scheme: BuiltInScheme; onSchemeChange: (scheme: BuiltInScheme) => void }) {
  const [scene, setScene] = React.useState<Scene>('plan');
  const [run, setRun] = React.useState(0);
  const [messages, setMessages] = React.useState(INITIAL_MESSAGES);
  const current = SCENES.find(item => item.id === scene)!;
  const onMessage = (key: Scene, message: string) => setMessages(previous => ({ ...previous, [key]: message }));
  return <PrimaryScope name="interactive workbench">
    <Tabs variant="segmented" value={scene} onValueChange={value => setScene(value as Scene)} className="wb-tabs">
      <div className="wb-toolbar">
        <TabsList aria-label="Try Altitude">{SCENES.map(item => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}</TabsList>
        <Button variant="ghost" size="sm" className="wb-scheme" onClick={() => onSchemeChange(scheme === 'daylight' ? 'nightfall' : 'daylight')}
          aria-label={`Switch to ${scheme === 'daylight' ? 'nightfall' : 'daylight'}`}>{scheme === 'daylight' ? 'Nightfall' : 'Daylight'} <span aria-hidden="true">{scheme === 'daylight' ? '◐' : '◑'}</span></Button>
      </div>
      <div className="wb-frame">
        <div className="wb-appbar"><div className="wb-workspace"><h2>Fieldwork Studio</h2><span>{current.context}</span></div>
          <Button variant="ghost" size="sm" onClick={() => { setRun(value => value + 1); setMessages(INITIAL_MESSAGES); }}>Reset demo</Button>
        </div>
        <Scenes key={run} scene={scene} onMessage={onMessage} />
        <div className="wb-caption"><p role="status">{messages[scene]}</p><span>Interactive demo · Changes stay in your browser</span></div>
      </div>
    </Tabs>
  </PrimaryScope>;
}
