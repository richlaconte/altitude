// Audit log pattern (project/framework/patterns/audit-log.md): the workspace audit log is a DataTable of flush entries,
// each one sentence, filtered with a FilterBar and paged by the server; an entry expands to show what changed. A record's
// own activity is a Timeline. Exporting is a job: Progress while it runs, then a toast with the download, and the export
// is itself logged.
// The lines between the preview markers are its "AuditLogPattern" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ACTORS = [{ value: 'Maya Chen', label: 'Maya Chen' }, { value: 'Theo Marsh', label: 'Theo Marsh' }, { value: 'Ines Duarte', label: 'Ines Duarte' }];
const ACTIONS = [{ value: 'role', label: 'Changed a role' }, { value: 'invite', label: 'Invited someone' }, { value: 'key', label: 'Rotated an API key' }, { value: 'export', label: 'Exported data' }];
/** @typedef {{ id: string, actor: string, action: string, resource: string, sentence: string, at: string, ip: string, before: Record<string, string>, after: Record<string, string> }} AuditEvent */
const SEED = Array.from({ length: 22 }, /** @returns {AuditEvent} */ (_, i) => {
  const actor = ACTORS[i % 3].value, kind = ACTIONS[i % 3].value, day = String(28 - Math.floor(i / 3)).padStart(2, '0');
  const at = `2026-10-${day}T${String(17 - (i % 3) * 3).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00Z`;
  if (kind === 'role') return { id: 'e' + i, actor, action: kind, resource: 'Ines Duarte', sentence: `${actor} changed Ines Duarte’s role from Member to Admin`, at, ip: '81.2.69.' + (10 + i), before: { role: 'Member' }, after: { role: 'Admin' } };
  if (kind === 'invite') return { id: 'e' + i, actor, action: kind, resource: `guest${i}@acme.dev`, sentence: `${actor} invited guest${i}@acme.dev as a Viewer`, at, ip: '81.2.69.' + (10 + i), before: { invited: 'No' }, after: { invited: 'Yes, as Viewer' } };
  return { id: 'e' + i, actor, action: kind, resource: 'Production key', sentence: `${actor} rotated the Production API key`, at, ip: '81.2.69.' + (10 + i), before: { key: 'ak_live_EXAMPLE…4f2a' }, after: { key: 'ak_live_EXAMPLE…9c1d' } };
});
/** @type {A.FilterField[]} */
const FIELDS = [{ key: 'actor', label: 'Actor', type: 'enum', options: ACTORS }, { key: 'action', label: 'Action', type: 'enum', options: ACTIONS }, { key: 'at', label: 'Date', type: 'date' }];
const test = (row, f) => {
  if (f.value === undefined || f.value === '') return true;
  const v = f.field === 'at' ? row.at.slice(0, 10) : row[f.field];
  if (f.operator === 'is') return v === f.value;
  if (f.operator === 'is not') return v !== f.value;
  if (f.operator === 'before') return v < f.value;
  if (f.operator === 'after') return v > f.value;
  if (f.operator === 'between' && typeof f.value === 'object') return v >= f.value.start && v <= f.value.end;
  return true;
};
function App() {
  const [log, setLog] = React.useState(SEED);
  const [filters, setFilters] = React.useState(/** @type {A.Filter[]} */ ([]));
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(/** @type {number | null} */ (null));
  const matching = log.filter((r) => filters.every((f) => test(r, f)));
  const pageCount = Math.max(1, Math.ceil(matching.length / 5));
  const rows = matching.slice((page - 1) * 5, page * 5);
  const turn = async (p) => { setLoading(true); await wait(400); setPage(p); setLoading(false); };
  const runExport = async () => {
    for (const pct of [0, 20, 40, 60, 80, 100]) { setExporting(pct); await wait(250); }
    setExporting(null);
    setLog((l) => [{ id: 'x' + l.length, actor: 'Maya Chen', action: 'export', resource: 'Audit log', sentence: `Maya Chen exported ${matching.length} audit log events as CSV`, at: '2026-10-29T09:00:00Z', ip: '81.2.69.4', before: {}, after: { file: 'audit-log.csv' } }, ...l]);
    A.toast({ title: 'Your export is ready', description: `${matching.length} events, audit-log.csv`, tone: 'positive', duration: 0, action: { label: 'Download', onClick: () => {} } });
  };
  return (
    <main className="al-page">
      <h2 className="al-h">Audit log</h2>
      <p className="al-note">Every change in the Acme workspace, kept for 90 days on the Pro plan. Older events are deleted.</p>
      <div className="al-tools">
        <A.FilterBar aria-label="Filter events" fields={FIELDS} value={filters} onValueChange={(f) => { setFilters(f); setPage(1); }} resultCount={matching.length} />
        <A.Button onClick={runExport} disabled={exporting !== null}>Export CSV</A.Button>
      </div>
      {exporting !== null && <div className="al-export"><A.Progress value={exporting} aria-label="Preparing export" /><span role="status">Preparing export, {exporting}%</span></div>}
      <A.DataTable aria-label="Audit log events" noun="events" rows={rows} getRowId={(r) => r.id} getRowLabel={(r) => r.sentence}
        empty="No events match these filters. Remove a filter to see more."
        columns={[
          { key: 'sentence', header: 'Event', width: '46%' },
          { key: 'actor', header: 'Actor' },
          { key: 'at', header: 'Time', cell: (r) => <A.RelativeTime date={r.at} locale="en-IE" /> },
          { key: 'ip', header: 'IP address' },
        ]}
        renderExpanded={(r) => <A.DiffView mode="properties" before={r.before} after={r.after} caption={`${r.resource}: what changed`} />}
        pagination={{ page, pageCount, total: matching.length, onPageChange: turn, loading, noun: 'events' }} />
      <section className="al-record" aria-labelledby="al-activity-h">
        <h3 id="al-activity-h" className="al-sub">Activity on Q4 plan</h3>
        <A.Timeline aria-label="Activity on Q4 plan" groupBy="none" locale="en-IE">
          <A.TimelineItem key="a1" time="2026-10-28T15:10:00Z">Theo Marsh changed the due date to 15 December</A.TimelineItem>
          <A.TimelineItem key="a2" time="2026-10-27T11:02:00Z" detail={<A.DiffView mode="properties" before={{ owner: 'Maya Chen' }} after={{ owner: 'Ines Duarte' }} />}>Maya Chen made Ines Duarte the owner</A.TimelineItem>
          <A.TimelineItem key="a3" time="2026-10-26T09:45:00Z" href="#/docs/q4">Ines Duarte linked the Q4 pricing doc</A.TimelineItem>
        </A.Timeline>
      </section>
      <A.Toaster />
    </main>
  );
}
// preview:end
export default App;
