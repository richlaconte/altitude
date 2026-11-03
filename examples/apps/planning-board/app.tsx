// Example: Sprint 24 planning (#402). The board, a table, the schedule and the epics are four views of one record.
//   Task: a team lead plans the next two weeks: sorts the backlog into the sprint, schedules the review meetings.
//   Lead: the board. Primary action: Start sprint. Next: the sprint's first day on the schedule.
// Moves are optimistic and the server can say no: In progress holds three cards, a card a teammate is holding can't
// move, and a move against an old version is a conflict. Starting the sprint is refused while a planned card has no
// estimate, with the reason in words.
import * as React from 'react';
import { Alert, Button, PageHeader, PageHeaderDescription, PageHeaderTitle, Tabs, TabsContent, TabsList, TabsTrigger, WorkflowStatus } from 'altitude-design';
import { DemoResource, errorMessage, isDemoError, useDemoQuery } from '../shared/react';
import { SPRINT_END, SPRINT_START, service } from './data';
import type { BoardData } from './data';
import { BoardView } from './board';
import { CardSheet } from './card-sheet';
import { EpicsView, ScheduleView, TableView } from './views';

type View = 'board' | 'table' | 'schedule' | 'epics';

export function App() {
  const q = useDemoQuery<unknown, BoardData>(service, 'board.get');
  const [view, setView] = React.useState<View>('board');
  const [open, setOpen] = React.useState<string | null>(null);
  const [date, setDate] = React.useState(SPRINT_START);
  const [status, setStatus] = React.useState('');
  const [starting, setStarting] = React.useState(false);
  const [startError, setStartError] = React.useState('');
  const outcome = React.useRef<HTMLDivElement>(null);
  const started = q.data?.started;

  const start = async () => {
    setStarting(true); setStartError('');
    try { const b = await service.request<BoardData>('sprint.start'); q.setData(() => b); }
    catch (e) {
      let ok = false;
      if (isDemoError(e, 'lost-response')) { try { const b = await service.request<BoardData>('board.get'); q.setData(() => b); ok = b.started; } catch { /* not known */ } }
      if (!ok) { await q.reload(); setStartError(errorMessage(e)); setStarting(false); requestAnimationFrame(() => document.getElementById('pb-start-error')?.focus()); return; }
    }
    setStarting(false);
    setView('schedule'); setDate(SPRINT_START);
    justStarted.current = true;
  };
  // The outcome replaces Start sprint, so it takes focus once it's on the page.
  const justStarted = React.useRef(false);
  React.useEffect(() => { if (started && justStarted.current) { justStarted.current = false; outcome.current?.focus(); } }, [started, view]);

  return (
    <main className="pb-page">
      <PageHeader primary={started ? undefined : <Button variant="primary" loading={starting} onClick={() => void start()}>Start sprint</Button>}>
        <PageHeaderTitle>Sprint 24 planning</PageHeaderTitle>
        <PageHeaderDescription>Monday 9 to Friday 20 November. Sort the backlog into the sprint, then book the meetings.</PageHeaderDescription>
      </PageHeader>
      {startError && <Alert id="pb-start-error" tabIndex={-1} tone="critical" title="Sprint 24 can’t start yet" onDismiss={() => setStartError('')}>{startError}</Alert>}
      {started && (
        <div ref={outcome} tabIndex={-1} className="pb-outcome" role="status">
          <Alert tone="positive" title="Sprint 24 has started">Its first day is Monday 9 November, shown on the schedule. It ends on {SPRINT_END.slice(8)} November with the review.</Alert>
        </div>
      )}
      <DemoResource query={q} noun="the board">
        {() => (
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList aria-label="Views">
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="epics">Epics</TabsTrigger>
            </TabsList>
            <TabsContent value="board"><BoardView q={q} onOpen={setOpen} say={setStatus} /></TabsContent>
            <TabsContent value="table"><TableView q={q} onOpen={setOpen} /></TabsContent>
            <TabsContent value="schedule"><ScheduleView date={date} onDateChange={setDate} say={setStatus} /></TabsContent>
            <TabsContent value="epics"><EpicsView q={q} /></TabsContent>
          </Tabs>
        )}
      </DemoResource>
      <CardSheet q={q} id={open} onClose={() => setOpen(null)} />
      <WorkflowStatus>{status}</WorkflowStatus>
    </main>
  );
}
