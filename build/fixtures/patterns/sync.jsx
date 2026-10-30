// Sync pattern (project/framework/patterns/sync.md): each change stays pending until the server acknowledges it, and the
// SyncIndicator counts the queue; offline, changes wait and nothing claims to be saved; a conflict shows both versions,
// theirs in their presence colour with their name, and asks keep mine, keep theirs or keep both; an expiring session
// asks in a stationary dialog and keeps the draft.
// The lines between the preview markers are its "SyncPattern" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function App() {
  const [online, setOnline] = React.useState(true);
  const live = React.useRef(true); live.current = online;
  const [tasks, setTasks] = React.useState([
    { id: 't1', title: 'Draft the launch email', done: true }, { id: 't2', title: 'Book the venue', done: false }, { id: 't3', title: 'Send the press kit', done: false },
  ]);
  const [writes, setWrites] = React.useState(/** @type {Record<string, 'pending' | 'committed' | 'failed'>} */ ({}));
  const [syncedAt, setSyncedAt] = React.useState(new Date());
  const [conflict, setConflict] = React.useState(/** @type {{ mine: string, theirs: string } | null} */ (null));
  const [brief, setBrief] = React.useState('Launch on 4 December, in Lisbon.');
  const [message, setMessage] = React.useState('');
  const [expiring, setExpiring] = React.useState(false);
  const [left, setLeft] = React.useState(120);
  React.useEffect(() => { if (!expiring) return; const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, [expiring]);
  const queue = Object.keys(writes).filter((k) => writes[k] === 'pending');
  const send = async (ids) => {
    await wait(700);
    if (!live.current) return;
    setWrites((w) => { const n = { ...w }; ids.forEach((id) => { n[id] = 'committed'; }); return n; });
    setSyncedAt(new Date());
  };
  const toggle = (id, done) => { setTasks((l) => l.map((t) => (t.id === id ? { ...t, done } : t))); setWrites((w) => ({ ...w, [id]: 'pending' })); void send([id]); };
  const goOnline = (v) => { setOnline(v); live.current = v; if (v && queue.length) void send(queue); };
  const resolve = (choice) => {
    if (!conflict) return;
    setBrief(choice === 'mine' ? conflict.mine : choice === 'theirs' ? conflict.theirs : `${conflict.mine}\n${conflict.theirs}`);
    setMessage(choice === 'mine' ? 'Kept your version. Jane Park’s version is in the history.' : choice === 'theirs' ? 'Kept Jane Park’s version. Yours is in the history.' : 'Kept both versions, one after the other.');
    setConflict(null); setSyncedAt(new Date());
    requestAnimationFrame(() => document.getElementById('sy-brief-h')?.focus());
  };
  const minutes = Math.ceil(left / 60);
  return (
    <main className="sy-page">
      <header className="sy-head"><h2 className="sy-h">Launch plan</h2>
        <A.SyncIndicator state={conflict ? 'conflict' : !online ? 'offline' : queue.length ? 'saving' : 'saved'} pending={queue.length} conflicts={conflict ? 1 : 0} lastSyncedAt={syncedAt}
          onOpenConflicts={() => document.getElementById('sy-conflict-h')?.focus()} />
      </header>
      <div className="sy-demo">
        <A.Switch label="Online" checked={online} onCheckedChange={goOnline} />
        <A.Button size="sm" disabled={!!conflict} onClick={() => setConflict({ mine: 'Launch on 4 December, in Lisbon.', theirs: 'Launch on 11 December, in Porto.' })}>Simulate a conflict</A.Button>
        <A.Button size="sm" onClick={() => { setLeft(120); setExpiring(true); }}>Simulate session expiry</A.Button>
      </div>
      <section aria-labelledby="sy-tasks-h" className="sy-section"><h3 id="sy-tasks-h" className="sy-sub">Tasks</h3>
        <ul className="sy-tasks">{tasks.map((t) => <li key={t.id}><A.Surface level={0} status={writes[t.id]} className="sy-task">
          <A.Checkbox label={t.title} checked={t.done} onCheckedChange={(v) => toggle(t.id, v)} />
          <span className="sy-state">{writes[t.id] === 'pending' ? (online ? 'Saving…' : 'Waiting to sync') : ''}</span>
        </A.Surface></li>)}</ul>
      </section>
      <section aria-labelledby="sy-brief-h" className="sy-section"><h3 id="sy-brief-h" tabIndex={-1} className="sy-sub">Brief</h3>
        {conflict ? <A.Surface level={1} className="sy-conflict" role="group" aria-labelledby="sy-conflict-h">
          <h4 id="sy-conflict-h" tabIndex={-1} className="sy-ch">Changed by Jane Park while you were editing</h4>
          <div className="sy-versions">
            <div className="sy-version"><div className="sy-who">Your version</div><p>{conflict.mine}</p></div>
            <div className="sy-version" data-presence="2"><div className="sy-who"><A.Avatar name="Jane Park" size={20} /> Jane Park’s version</div><p>{conflict.theirs}</p></div>
          </div>
          <div className="sy-actions"><A.Button onClick={() => resolve('mine')}>Keep mine</A.Button><A.Button onClick={() => resolve('theirs')}>Keep theirs</A.Button><A.Button onClick={() => resolve('both')}>Keep both</A.Button></div>
        </A.Surface> : <p className="sy-brief">{brief}</p>}
      </section>
      <p className="sy-note" role="status">{message}</p>
      <A.Dialog open={expiring} background="stationary" dismissible={false} size="sm" onOpenChange={setExpiring}
        title={left > 0 ? `Your session ends in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : 'Your session ended'}
        description={left > 0 ? 'Stay signed in to keep working. Your unsaved changes are kept on this device either way.' : 'Sign in again to continue. Your unsaved changes are kept on this device.'}
        footer={<><A.Button onClick={() => setExpiring(false)}>Sign out</A.Button><A.Button variant="primary" onClick={() => setExpiring(false)}>{left > 0 ? 'Stay signed in' : 'Sign in again'}</A.Button></>} />
    </main>
  );
}
// preview:end
export default App;
