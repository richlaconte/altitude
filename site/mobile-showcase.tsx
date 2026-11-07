import * as React from 'react';
import {
  Button, Field, PrimaryScope, Radio, RadioGroup, Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
  Switch, Tabs, TabsContent, TabsList, TabsTrigger, TimeSlot, TimeSlotPicker,
} from '../project/components/src/index';
import type { BuiltInScheme } from '../project/components/src/index';
import { WritingScene } from './workbench';

type Scene = 'book' | 'tune' | 'edit';
type SceneProps = { onMessage: (message: string) => void };
const SCENES: { id: Scene; label: string }[] = [
  { id: 'book', label: 'Book' }, { id: 'tune', label: 'Tune' }, { id: 'edit', label: 'Edit' },
];
const HINTS: Record<Scene, string> = {
  book: 'Tap an open time. See your choice rise into a review.',
  tune: 'Change a preference. Watch your brief take shape.',
  edit: 'Edit the title. Try a failed save, too.',
};
const TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const timeLabel = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
    .format(Date.UTC(2000, 0, 1, hour, minute));
};

function BookingScene({ active, onMessage }: SceneProps & { active: boolean }) {
  const [time, setTime] = React.useState('');
  const [confirmed, setConfirmed] = React.useState('');
  const [open, setOpen] = React.useState(false);

  // The scene stays mounted to retain its choice. Its portal must not stay open
  // if a parent changes scenes while a modal is active.
  React.useEffect(() => { if (!active) setOpen(false); }, [active]);

  return <div className="ms-book">
    <div className="ms-heading">
      <h3>Book a studio session</h3>
      <p>A sample day. A little room to think together.</p>
    </div>
    <div className="ms-day"><span>30 minutes</span><span>Online</span></div>
    <Field label="Tuesday 10 November">
      <TimeSlotPicker value={time} locale="en-US" onValueChange={value => {
        setTime(value); setConfirmed('');
        onMessage(`${timeLabel(value)} selected. Review your time when you’re ready.`);
      }}>
        {TIMES.map(value => <TimeSlot key={value} value={value} booked={value === '10:00'} />)}
      </TimeSlotPicker>
    </Field>
    <Sheet side="bottom" size="sm" className="ms-sheet" open={active && open} onOpenChange={setOpen}
      trigger={<Button variant="primary" disabled={!time} className="ms-review-trigger">Review time <span aria-hidden="true">↗</span></Button>}>
      <SheetHeader>
        <SheetTitle>Review your time</SheetTitle>
        <SheetDescription>A sample studio session. Confirming only updates this demo.</SheetDescription>
      </SheetHeader>
      <dl className="ms-review-details">
        <div><dt>With</dt><dd>Fieldwork Studio</dd></div>
        <div><dt>When</dt><dd>Tuesday 10 November<br /><strong>{time ? timeLabel(time) : 'Choose a time'}</strong></dd></div>
        <div><dt>Session</dt><dd>30 minutes · Online</dd></div>
      </dl>
      <SheetFooter className="ms-sheet-actions">
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="primary" onClick={() => {
          if (!time) return;
          setConfirmed(time); setOpen(false);
          onMessage(`${timeLabel(time)} confirmed in this demo. No real appointment was booked.`);
        }}>Confirm demo booking</Button>
      </SheetFooter>
    </Sheet>
    {confirmed && <div className="ms-receipt">
      <h4><span aria-hidden="true">✓</span> Confirmed in this demo</h4>
      <p><strong>{timeLabel(confirmed)}</strong> · Tuesday 10 November</p>
      <p>No real appointment was booked.</p>
      <p>Choose another time to try again.</p>
    </div>}
  </div>;
}

const BRIEFS = [
  { value: 'morning', label: 'Morning', time: '8:00 am' },
  { value: 'midday', label: 'Midday', time: '12:00 pm' },
  { value: 'evening', label: 'Evening', time: '5:00 pm' },
];

function PreferencesScene({ onMessage }: SceneProps) {
  const [delivery, setDelivery] = React.useState('morning');
  const [tomorrow, setTomorrow] = React.useState(false);
  const current = BRIEFS.find(brief => brief.value === delivery)!;

  return <div className="ms-preferences">
    <div className="ms-heading"><h3>Your daily brief</h3><p>Set a rhythm that leaves room for the work.</p></div>
    <Field label="Delivery time">
      <RadioGroup value={delivery} onValueChange={value => {
        setDelivery(value);
        onMessage(`Preview set to ${BRIEFS.find(brief => brief.value === value)!.time}. No notifications are sent.`);
      }} className="ms-delivery">
        {BRIEFS.map(brief => <Radio key={brief.value} value={brief.value} label={brief.label} description={brief.time} />)}
      </RadioGroup>
    </Field>
    <Switch label="Include tomorrow" checked={tomorrow} onCheckedChange={checked => {
      setTomorrow(checked);
      onMessage(checked ? 'Tomorrow’s sessions are included in your preview.' : 'Your preview includes today’s plan only.');
    }} />
    <div className="ms-brief" aria-label="Daily brief preview">
      <div className="ms-brief-head"><h4>Brief preview</h4><span>{current.time}</span></div>
      <p>Today’s plan</p>
      <span>Studio session · Project notes</span>
      {tomorrow && <p className="ms-tomorrow">Tomorrow’s sessions</p>}
    </div>
    <p className="ms-local-note">Preview only. No notifications are sent.</p>
  </div>;
}

function MobileScenes({ scene, onMessage }: { scene: Scene; onMessage: (scene: Scene, message: string) => void }) {
  return <>
    <TabsContent value="book" forceMount className="ms-scene"><BookingScene active={scene === 'book'} onMessage={message => onMessage('book', message)} /></TabsContent>
    <TabsContent value="tune" forceMount className="ms-scene"><PreferencesScene onMessage={message => onMessage('tune', message)} /></TabsContent>
    <TabsContent value="edit" forceMount className="ms-scene"><WritingScene onMessage={message => onMessage('edit', message)} /></TabsContent>
  </>;
}

export function MobileShowcase({ scheme, onSchemeChange }: { scheme: BuiltInScheme; onSchemeChange: (scheme: BuiltInScheme) => void }) {
  const [scene, setScene] = React.useState<Scene>('book');
  const [run, setRun] = React.useState(0);
  const [messages, setMessages] = React.useState(HINTS);
  const onMessage = (key: Scene, message: string) => setMessages(previous => ({ ...previous, [key]: message }));

  return <PrimaryScope name="mobile showcase">
    <Tabs variant="segmented" value={scene} onValueChange={value => setScene(value as Scene)} className="ms-tabs">
      <div className="ms-toolbar">
        <TabsList aria-label="Try a mobile task">{SCENES.map(item => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}</TabsList>
        <Button variant="ghost" size="sm" className="ms-scheme" onClick={() => onSchemeChange(scheme === 'daylight' ? 'nightfall' : 'daylight')}
          aria-label={`Switch to ${scheme === 'daylight' ? 'nightfall' : 'daylight'}`}>{scheme === 'daylight' ? 'Nightfall' : 'Daylight'} <span aria-hidden="true">{scheme === 'daylight' ? '◐' : '◑'}</span></Button>
      </div>
      <div className="ms-frame">
        <div className="ms-appbar"><h2>Fieldwork Studio</h2>
          <Button variant="ghost" size="sm" onClick={() => { setRun(value => value + 1); setMessages(HINTS); }}>Reset demo</Button>
        </div>
        <MobileScenes key={run} scene={scene} onMessage={onMessage} />
        <div className="ms-caption"><p role="status">{messages[scene]}</p><span>Local demo · Resets on reload or layout change</span></div>
      </div>
    </Tabs>
  </PrimaryScope>;
}
