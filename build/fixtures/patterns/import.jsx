// Import pattern (project/framework/patterns/import.md): upload a CSV, map its columns, fix the rows that have problems,
// review, then import as a job with a receipt. A column's Select fills when it's mapped, so what's left shows; invalid
// cells lie in a trench on critical-soft (DataGrid showInvalid); the problem count is said as it changes; the import
// can be cancelled and ends with what was imported, skipped and why.
// The lines between the preview markers are its "ImportPattern" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const STEPS = [{ title: 'Upload' }, { title: 'Map columns' }, { title: 'Fix problems' }, { title: 'Review' }, { title: 'Import' }];
const SOURCE = [{ key: 'c0', header: 'Full name', sample: 'Ada Lovelace' }, { key: 'c1', header: 'E-mail', sample: 'ada@example.com' }, { key: 'c2', header: 'Company', sample: 'Analytical Ltd' }, { key: 'c3', header: 'Notes', sample: 'Met at the conference' }];
const TARGETS = [{ value: 'name', label: 'Name (required)' }, { value: 'email', label: 'Email (required)' }, { value: 'company', label: 'Company' }, { value: 'skip', label: 'Don’t import' }];
const FILE = [
  ['Ada Lovelace', 'ada@example.com', 'Analytical Ltd', ''], ['Grace Hopper', 'grace@example', 'Navy Labs', 'Follow up'], ['Alan Turing', 'alan@example.com', 'Bletchley', ''],
  ['', 'nameless@example.com', 'Unknown', ''], ['Katherine Johnson', 'katherine@example.com', 'NASA', ''], ['Ada Lovelace', 'ada@example.com', 'Analytical Ltd', 'Duplicate'],
  ['Hedy Lamarr', 'hedy@example.com', 'MGM', ''], ['Edsger Dijkstra', 'edsger@@example.com', 'TU Eindhoven', ''],
].map((r, i) => ({ id: 'r' + i, line: i + 2, c0: r[0], c1: r[1], c2: r[2], c3: r[3] }));
const problemsIn = (row, map) => {
  const col = (t) => Object.keys(map).find((k) => map[k] === t);
  const out = [];
  const n = col('name'), e = col('email');
  if (n && !String(row[n]).trim()) out.push({ key: n, message: 'Enter a name.' });
  if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row[e]))) out.push({ key: e, message: 'This isn’t an email address.' });
  return out;
};
function App() {
  const [step, setStep] = React.useState(0);
  const [queue, setQueue] = React.useState(/** @type {A.UploadItem[]} */ ([]));
  const [map, setMap] = React.useState(/** @type {Record<string, string>} */ ({}));
  const [rows, setRows] = React.useState(FILE);
  const [onlyProblems, setOnlyProblems] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [cancelled, setCancelled] = React.useState(false);
  const stop = React.useRef(false);
  const heading = React.useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const go = (n) => { setStep(n); requestAnimationFrame(() => heading.current?.focus()); };
  const upload = async (name) => {
    setQueue([{ id: 'f', name, state: 'uploading', progress: 40 }]); await wait(300);
    setQueue([{ id: 'f', name, state: 'uploading', progress: 100 }]); await wait(300);
    setQueue([{ id: 'f', name, state: 'done' }]); await wait(300); go(1);
  };
  const missing = ['name', 'email'].filter((t) => !Object.values(map).includes(t)).map((t) => (t === 'name' ? 'Name' : 'Email'));
  const mapped = SOURCE.filter((s) => map[s.key] && map[s.key] !== 'skip');
  const bad = rows.filter((r) => problemsIn(r, map).length);
  const problemCount = rows.reduce((n, r) => n + problemsIn(r, map).length, 0);
  const emailCol = Object.keys(map).find((k) => map[k] === 'email');
  const seen = new Set(), dupes = new Set();
  rows.forEach((r) => { if (problemsIn(r, map).length || !emailCol) return; const e = String(r[emailCol]); if (seen.has(e)) dupes.add(r.id); seen.add(e); });
  const importing = rows.filter((r) => !problemsIn(r, map).length && !dupes.has(r.id));
  const run = async () => {
    go(4); stop.current = false; setCancelled(false);
    for (let i = 1; i <= importing.length; i++) { await wait(350); if (stop.current) { setCancelled(true); return; } setProgress(i); }
    go(5);
  };
  const H = (text) => <h3 ref={heading} tabIndex={-1} className="im-sub">{text}</h3>;
  return (
    <main className="im-page">
      <h2 className="im-h">Import contacts</h2>
      <A.Stepper steps={STEPS} current={step} aria-label="Import steps" onStepChange={step < 4 ? (i) => go(i) : undefined} />
      {step === 0 && <section className="im-step">{H('Upload a CSV file')}
        <A.DropZone accept=".csv,text/csv" multiple={false} onFiles={(f) => f[0] && upload(f[0].name)} queue={queue}>
          <p className="im-note">Drop a .csv file here or choose one. The first row should name the columns.</p>
        </A.DropZone>
        <div><A.Button onClick={() => upload('contacts.csv')}>Use the sample file</A.Button></div>
      </section>}
      {step === 1 && <section className="im-step">{H('Map columns to fields')}
        <p className="im-note">Choose the field each column of contacts.csv goes into.</p>
        <div className="im-map">{SOURCE.map((s) => <A.Field key={s.key} label={s.header} hint={`For example, “${s.sample}”`}>
          <A.Select value={map[s.key] || ''} placeholder="Not mapped" onValueChange={(v) => setMap((m) => ({ ...m, [s.key]: v }))} items={TARGETS} />
        </A.Field>)}</div>
        <p className="im-note" role="status">{missing.length ? `Map these required fields: ${missing.join(', ')}.` : 'Every required field is mapped.'}</p>
        <div><A.Button variant="primary" disabled={missing.length > 0} onClick={() => go(2)}>Continue</A.Button></div>
      </section>}
      {step === 2 && <section className="im-step">{H('Fix problems')}
        <p className="im-note" role="status">{problemCount ? `${problemCount} ${problemCount === 1 ? 'problem' : 'problems'} left in ${bad.length} ${bad.length === 1 ? 'row' : 'rows'}. Rows with problems are skipped.` : 'No problems left.'}</p>
        <A.Switch label="Only rows with problems" checked={onlyProblems} onCheckedChange={setOnlyProblems} />
        <A.DataGrid aria-label="Rows to import" showInvalid rows={onlyProblems ? bad : rows} getRowId={(r) => r.id} getRowLabel={(r) => `row ${r.line}`}
          columns={[{ key: 'line', header: 'Row', align: 'end', width: 64 }, ...mapped.map((s) => ({ key: s.key, header: TARGETS.find((t) => t.value === map[s.key])?.label.replace(' (required)', '') || s.header, editable: true,
            validate: (v, row) => problemsIn({ ...row, [s.key]: v }, map).find((p) => p.key === s.key)?.message }))]}
          onCellSave={({ rowId, key, draft }) => { setRows((all) => all.map((r) => (r.id === rowId ? { ...r, [key]: draft } : r))); return { ok: true }; }} />
        <div className="im-actions"><A.Button onClick={() => go(1)}>Back to mapping</A.Button><A.Button variant="primary" onClick={() => go(3)}>Continue</A.Button></div>
      </section>}
      {step === 3 && <section className="im-step">{H('Review the import')}
        <p className="im-lead">{importing.length} contacts will be imported. {dupes.size + bad.length} rows will be skipped: {dupes.size} {dupes.size === 1 ? 'duplicate' : 'duplicates'} and {bad.length} with problems.</p>
        <div className="im-actions"><A.Button onClick={() => go(2)}>Fix more rows</A.Button><A.Button variant="primary" onClick={run}>Import {importing.length} contacts</A.Button></div>
      </section>}
      {step === 4 && <section className="im-step">{H(cancelled ? 'Import cancelled' : 'Importing contacts')}
        {cancelled ? <><p className="im-lead">{progress} of {importing.length} contacts were imported before you cancelled; the rest weren’t. Importing again skips the ones already imported.</p><div><A.Button onClick={() => { setProgress(0); go(3); }}>Back to review</A.Button></div></> : <>
          <A.Progress value={progress} max={importing.length} aria-label="Importing contacts" />
          <p className="im-note" role="status">Importing {progress} of {importing.length}</p>
          <div><A.Button onClick={() => { stop.current = true; }}>Cancel import</A.Button></div></>}
      </section>}
      {step === 5 && <section className="im-step">{H('Import finished')}
        <dl className="im-receipt"><div><dt>Imported</dt><dd>{importing.length} contacts</dd></div><div><dt>Skipped</dt><dd>{dupes.size} {dupes.size === 1 ? 'duplicate' : 'duplicates'}</dd></div><div><dt>Failed</dt><dd>{bad.length} {bad.length === 1 ? 'row' : 'rows'} with problems</dd></div></dl>
        <div className="im-actions"><A.Button>Download skipped rows (CSV)</A.Button><A.Button variant="ghost" onClick={() => { setQueue([]); setMap({}); setRows(FILE); setProgress(0); go(0); }}>Import another file</A.Button></div>
      </section>}
    </main>
  );
}
// preview:end
export default App;
