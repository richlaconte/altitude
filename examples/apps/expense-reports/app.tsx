// Example: October's expense report, seen by the employee who submits it and the manager who approves it (#407).
//   Employee (Sam Okafor). Task: turn this month's card transactions into a report and submit it.
//     Lead: the transactions grid. Primary action: Submit report. Next: the report waiting on his manager.
//     Frame: records (the grid) with the import pattern's steps before it.
//   Manager (Dana Kim). Task: approve or return a submitted report.
//     Lead: the choice and its consequence. Primary action: Approve. Next: the next report waiting.
//     Frame: decision (screen-layout.md): the question as the title, the consequence and the two choices under it,
//     the evidence after. Returning asks its reason in place; once decided, the outcome replaces the choice.
// The drawer's "View as" switch changes who's looking; both read the same report from the same server.
//
// Grid compositions (agreed in #407): the receipt is a flush plate in its column, and Enter on that cell opens a Sheet
// with one DropZone, never a drop zone inside a cell; one project per transaction, a Select editor; the amount is the
// column's parse/format/validate with a FormattedNumber, not a stepper. Rows missing receipts are listed in an
// ErrorSummary whose links focus each Receipt cell (DataGrid cellId, #469).
//
// Fixtures it handles: the sample CSV's two bad rows (fixed in place, or skipped, before anything is imported); a lost
// response on Submit (read back, so it's never submitted twice); the manager returning the report while the employee is
// still editing (the next cell save is refused as a conflict; the edit is kept and saved again, and an Alert gives the
// reason); slow on Approve (busy only while in flight). Receipts stay in memory: no real file storage (#407, out of scope).
// At phone width the grid keeps DataGrid's narrow layout (it scrolls sideways inside its own frame, #260) rather than
// becoming a list of rows; the page itself never scrolls sideways, and the receipt Sheet is the same on every width.
import * as React from 'react';
import {
  Alert, Badge, BarList, Button, DataGrid, DropZone, ErrorSummary, Field, FormattedNumber, Link, PageHeader, PageHeaderDescription,
  PageHeaderTitle, Select, Sheet, SheetDescription, SheetHeader, SheetTitle, Skeleton, Stepper, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow, Textarea,
} from 'altitude-design';
import type { DataGridColumn, DataGridEditorControl } from 'altitude-design';
import { DemoError, errorMessage, isDemoError, useDemoQuery } from '../shared/react';
import {
  CATEGORIES, EMPLOYEE, MANAGER, PERIOD, PROJECTS, SAMPLE_CSV, categoryLabel, money, projectLabel, service, totalOf, viewAs,
} from './data';
import type { Report, Transaction } from './data';

export { events, service } from './data';

export function App() {
  const view = React.useSyncExternalStore(viewAs.subscribe, viewAs.get, viewAs.get);
  const query = useDemoQuery<Report, Report>(service, 'report.get');
  if (!query.data) {
    return <main className="er"><PageHeader><PageHeaderTitle>{PERIOD} expenses</PageHeaderTitle></PageHeader>
      {query.error ? <Alert tone="critical" title="We couldn’t load the report" action={<Button size="sm" onClick={() => void query.reload()}>Try again</Button>}>{errorMessage(query.error)}</Alert>
        : <div role="status" aria-label="Loading the report"><Skeleton shape="text" lines={6} /></div>}</main>;
  }
  const set = (r: Report) => query.setData(() => r);
  return view === 'manager' ? <Manager report={query.data} onChange={set} reload={query.reload} /> : <Employee report={query.data} onChange={set} reload={query.reload} />;
}

const STATUS_PLATE: Record<Report['status'], { tone: 'neutral' | 'caution' | 'positive'; word: string }> = {
  draft: { tone: 'neutral', word: 'Draft' }, submitted: { tone: 'neutral', word: `Submitted · waiting on ${MANAGER}` },
  returned: { tone: 'caution', word: 'Returned' }, approved: { tone: 'positive', word: 'Approved' },
};
const cellId = (rowId: string, key: string) => `er-${rowId}-${key}`;
const dayOf = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/* ───────────── The employee ───────────── */

function Employee({ report, onChange, reload }: { report: Report; onChange: (r: Report) => void; reload: () => Promise<void> }) {
  const [returned, setReturned] = React.useState<string | null>(null);
  const [summaryKey, setSummaryKey] = React.useState(0);
  const [showMissing, setShowMissing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const [receiptFor, setReceiptFor] = React.useState<{ id: string; done: (name: string | null) => void } | null>(null);
  const known = React.useRef(report.status); known.current = report.status;
  // Returned while you're here (a refetch after the manager's decision, or a save refused as a conflict): say why, once.
  const was = React.useRef(report.status);
  React.useEffect(() => {
    if (was.current === 'submitted' && report.status === 'returned') setReturned(report.decision?.reason ?? '');
    was.current = report.status;
  }, [report.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const plate = STATUS_PLATE[report.status];
  const missing = report.transactions.filter((t) => !t.receipt);
  const locked = report.status === 'approved';

  // One cell. If the manager decided meanwhile, the edit is kept: re-read, say what happened, and save it again.
  const saveCell = async (id: string, key: keyof Transaction, value: unknown): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const t = await service.request<Transaction>('transaction.update', { id, key, value, knownStatus: known.current });
      onChange({ ...report, transactions: report.transactions.map((x) => (x.id === t.id ? t : x)) });
      return { ok: true };
    } catch (e) {
      if (isDemoError(e, 'conflict')) {
        const now = (e as DemoError).current as Report;
        known.current = now.status; onChange(now);
        if (now.status === 'returned') setReturned(now.decision?.reason ?? '');
        return saveCell(id, key, value);
      }
      if (isDemoError(e, 'lost-response')) {
        const now = await service.request<Report>('report.get').catch(() => null);
        const t = now?.transactions.find((x) => x.id === id);
        if (now && t && t[key] === value) { onChange(now); return { ok: true }; }
      }
      return { ok: false, error: errorMessage(e) };
    }
  };

  const submit = async () => {
    setSubmitError('');
    if (missing.length) { setShowMissing(true); setSummaryKey((k) => k + 1); return; }
    setSubmitting(true);
    try { onChange(await service.request<Report>('report.submit')); setReturned(null); setShowMissing(false); }
    catch (e) {
      if (isDemoError(e, 'lost-response')) {
        // Read back before offering Retry: if it's submitted, it lands as submitted. It can't be submitted twice.
        const now = await service.request<Report>('report.get').catch(() => null);
        if (now?.status === 'submitted') { onChange(now); setReturned(null); }
        else setSubmitError(now ? 'It wasn’t submitted. Try again.' : 'We couldn’t check whether it was submitted. Trying again won’t submit it twice.');
      } else setSubmitError(errorMessage(e));
    } finally { setSubmitting(false); }
  };

  if (!report.imported) return <ImportFlow onImported={onChange} />;

  const columns: DataGridColumn<Transaction>[] = [
    { key: 'date', header: 'Date', cell: (t) => dayOf(t.date), width: 88 },
    { key: 'merchant', header: 'Merchant', editable: !locked, validate: (v) => (String(v ?? '').trim() ? undefined : 'Name the merchant.') },
    { key: 'category', header: 'Category', editable: !locked, format: (v) => categoryLabel(String(v)), cell: (t) => categoryLabel(t.category),
      editor: (c: DataGridEditorControl) => <Select {...c} items={CATEGORIES} size="sm" defaultOpen /> },
    { key: 'project', header: 'Project', editable: !locked, format: (v) => projectLabel(String(v)), cell: (t) => projectLabel(t.project),
      editor: (c: DataGridEditorControl) => <Select {...c} items={PROJECTS} size="sm" defaultOpen /> },
    { key: 'amount', header: 'Amount', align: 'end', editable: !locked, width: 112,
      parse: (text) => { const n = Number(text.replace(/[€,\s]/g, '')); return text.trim() === '' || !Number.isFinite(n) ? NaN : Math.round(n * 100) / 100; },
      format: (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : String(v ?? '')),
      validate: (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? undefined : 'Use an amount of 0 or more, like 12.50.'),
      cell: (t) => <FormattedNumber value={t.amount} format="currency" currency="EUR" minorUnits={false} locale="en-IE" /> },
    // The receipt: a flush plate. Enter (or a double click) opens the Sheet with one DropZone; choosing a file commits.
    { key: 'receipt', header: 'Receipt', editable: !locked, width: 180,
      cell: (t) => (t.receipt ? <span className="er-receipt">{t.receipt}</span> : <Badge tone="caution">Missing</Badge>),
      format: (v) => String(v ?? ''),
      editor: (c: DataGridEditorControl) => <ReceiptEditor control={c} open={(id, done) => setReceiptFor({ id, done })} /> },
  ];

  const byCategory = CATEGORIES.map((c) => ({ name: c.label, value: totalOf(report.transactions.filter((t) => t.category === c.value)) })).filter((x) => x.value > 0);
  const transaction = receiptFor ? report.transactions.find((t) => t.id === receiptFor.id) : undefined;

  return (
    <main className="er">
      <PageHeader breadcrumb={<Link href="#">Expenses</Link>}
        primary={report.status === 'draft' || report.status === 'returned' ? <Button variant="primary" loading={submitting} onClick={() => void submit()}>Submit report</Button> : undefined}
        actions={<Badge tone={plate.tone}>{plate.word}</Badge>}>
        <PageHeaderTitle>{PERIOD} expenses</PageHeaderTitle>
        <PageHeaderDescription>
          {report.transactions.length} transactions, <FormattedNumber value={totalOf(report.transactions)} format="currency" currency="EUR" minorUnits={false} locale="en-IE" /> in all.
          {report.status === 'submitted' ? ` ${MANAGER} has it. You can still attach receipts.` : report.status === 'approved' ? ` Approved by ${MANAGER}; it’s paid with your next salary.` : ' Every transaction needs a receipt before you submit.'}
        </PageHeaderDescription>
      </PageHeader>

      {returned !== null && report.status === 'returned' && (
        <Alert tone="caution" title={`${MANAGER} returned this report`} onDismiss={() => setReturned(null)}>
          “{report.decision?.reason}” Your edits are kept, and the report is back with you. Fix it and submit again.
        </Alert>
      )}
      {report.status === 'returned' && returned === null && report.decision?.reason && (
        <p className="er-note"><strong>Returned by {report.decision.by}:</strong> {report.decision.reason}</p>
      )}
      {report.status === 'approved' && report.decision && (
        <p className="er-stamp" role="status">Approved by {report.decision.by} · {new Date(report.decision.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {money(report.decision.total)}</p>
      )}
      {submitError && <Alert tone="critical" title="The report wasn’t submitted">{submitError}</Alert>}
      {showMissing && missing.length > 0 && (
        <ErrorSummary title="Before you submit" focusKey={summaryKey}
          errors={missing.map((t) => ({ id: cellId(t.id, 'receipt'), label: `${t.merchant}, ${dayOf(t.date)}`, message: 'add a receipt' }))} />
      )}

      <div className="er-layout">
        <section className="er-grid" aria-labelledby="er-tx-h">
          <h2 id="er-tx-h" className="er-h2">Transactions</h2>
          <DataGrid aria-labelledby="er-tx-h" rows={report.transactions} columns={columns} getRowId={(t) => t.id} getRowLabel={(t) => `${t.merchant}, ${dayOf(t.date)}`}
            cellId={cellId} onCellSave={({ rowId, key, draft }) => saveCell(rowId, key as keyof Transaction, draft)} maxHeight={520} />
          <p className="er-hint">Arrows move, Enter edits. On a Receipt cell, Enter opens the receipt.</p>
        </section>
        <section className="er-side" aria-labelledby="er-cat-h">
          <h2 id="er-cat-h" className="er-h2">By category</h2>
          <BarList aria-labelledby="er-cat-h" data={byCategory} format={money} noun="categories" />
        </section>
      </div>

      <Sheet open={!!receiptFor} onOpenChange={(o) => { if (!o && receiptFor) { receiptFor.done(null); setReceiptFor(null); } }}>
        {transaction && <>
          <SheetHeader>
            <SheetTitle>Receipt for {transaction.merchant}</SheetTitle>
            <SheetDescription>{dayOf(transaction.date)} · {money(transaction.amount)}. A photo or PDF of the itemised receipt.</SheetDescription>
          </SheetHeader>
          <div className="er-sheet">
            {transaction.receipt && <p className="er-note">Attached: {transaction.receipt}. Choosing another replaces it.</p>}
            <DropZone accept="image/*,.pdf" multiple={false} onFiles={(f) => { if (f[0] && receiptFor) { receiptFor.done(f[0].name); setReceiptFor(null); } }}>
              <p className="er-note">Drop a receipt here or choose a file.</p>
            </DropZone>
            <div><Button onClick={() => { if (receiptFor) { receiptFor.done(`receipt-${transaction.id}.jpg`); setReceiptFor(null); } }}>Use a sample photo</Button></div>
          </div>
        </>}
      </Sheet>
    </main>
  );
}

/** The Receipt column's editor: it opens the Sheet, and commits what's chosen there (or the old value, if closed). */
function ReceiptEditor({ control, open }: { control: DataGridEditorControl; open: (id: string, done: (name: string | null) => void) => void }) {
  React.useEffect(() => {
    // Which transaction: the cell's id is cellId(rowId, 'receipt').
    const cell = document.getElementById(control.id)?.closest<HTMLElement>('[role="gridcell"]');
    const id = cell?.id.replace(/^er-/, '').replace(/-receipt$/, '');
    if (id) open(id, (name) => control.onValueChange(name ?? control.value));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <span id={control.id} className="er-receipt" aria-label={control['aria-label']}>{control.value ?? 'Choosing a receipt…'}</span>;
}

/* ───────────── The import pattern, bounded ───────────── */

const STEPS = [{ title: 'Upload' }, { title: 'Map columns' }, { title: 'Fix problems' }, { title: 'Review' }, { title: 'Import' }];
const FIELDS = [{ value: 'date', label: 'Date' }, { value: 'merchant', label: 'Merchant' }, { value: 'amount', label: 'Amount' }, { value: 'category', label: 'Category' }, { value: 'skip', label: 'Don’t import' }];
const TYPE_TO_CATEGORY: Record<string, string> = { Travel: 'travel', Lodging: 'lodging', Meals: 'meals', Software: 'software', Office: 'office' };
type Row = { id: string; line: number; date: string; merchant: string; amount: string; category: string };
const problem = (r: Row, key: 'date' | 'amount') => key === 'date'
  ? (/^\d{4}-\d{2}-\d{2}$/.test(r.date) && !Number.isNaN(Date.parse(r.date)) ? undefined : 'This isn’t a date. Use 2026-10-31.')
  : (Number.isFinite(Number(r.amount)) && r.amount.trim() !== '' ? undefined : 'This isn’t a number. Use 38.00.');

function ImportFlow({ onImported }: { onImported: (r: Report) => void }) {
  const [step, setStep] = React.useState(0);
  // Guessed from the headers, as importers do; each guess is shown and can be changed.
  const [map, setMap] = React.useState<Record<string, string>>({ Posted: 'date', Description: 'merchant', 'Amount (EUR)': 'amount', Type: 'category' });
  const [rows, setRows] = React.useState<Row[]>(() => SAMPLE_CSV.rows.map((r, i) => ({ id: `r${i}`, line: i + 2, date: r[0], merchant: r[1], amount: r[2], category: r[3] })));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const heading = React.useRef<HTMLHeadingElement>(null);
  const go = (n: number) => { setStep(n); requestAnimationFrame(() => heading.current?.focus()); };
  const bad = rows.filter((r) => problem(r, 'date') || problem(r, 'amount'));
  const good = rows.filter((r) => !bad.includes(r));
  const missing = ['date', 'merchant', 'amount'].filter((f) => !Object.values(map).includes(f));
  const run = async () => {
    setBusy(true); setError(''); go(4);
    const transactions: Transaction[] = good.map((r) => ({ id: `t-${r.id}`, date: r.date, merchant: r.merchant, amount: Math.round(Number(r.amount) * 100) / 100, category: TYPE_TO_CATEGORY[r.category] ?? 'other', project: 'none', receipt: null }));
    try { onImported(await service.request<Report>('transactions.import', { importId: SAMPLE_CSV.name, transactions })); }
    catch (e) {
      if (isDemoError(e, 'lost-response')) { const now = await service.request<Report>('report.get').catch(() => null); if (now?.imported) { onImported(now); return; } }
      setError(errorMessage(e)); go(3);
    } finally { setBusy(false); }
  };
  const H = (t: string) => <h2 ref={heading} tabIndex={-1} className="er-h2">{t}</h2>;
  return (
    <main className="er">
      <PageHeader breadcrumb={<Link href="#">Expenses</Link>}>
        <PageHeaderTitle>{PERIOD} expenses</PageHeaderTitle>
        <PageHeaderDescription>Start from your card’s export: import its transactions, then attach a receipt to each.</PageHeaderDescription>
      </PageHeader>
      <Stepper steps={STEPS} current={step} aria-label="Import steps" onStepChange={step < 4 ? (i) => go(i) : undefined} />
      {step === 0 && <section className="er-step">{H('Upload your card’s export')}
        <DropZone accept=".csv,text/csv" multiple={false} onFiles={(f) => f[0] && go(1)}><p className="er-note">Drop a .csv file here or choose one.</p></DropZone>
        <div><Button onClick={() => go(1)}>Use the sample file ({SAMPLE_CSV.name})</Button></div>
      </section>}
      {step === 1 && <section className="er-step">{H('Map columns to fields')}
        <div className="er-map">{SAMPLE_CSV.columns.map((c, i) => <Field key={c} label={c} hint={`For example, “${SAMPLE_CSV.rows[0][i]}”`}>
          <Select value={map[c] ?? ''} placeholder="Not mapped" onValueChange={(v) => setMap((m) => ({ ...m, [c]: v }))} items={FIELDS} />
        </Field>)}</div>
        <p className="er-note" role="status">{missing.length ? `Map these: ${missing.map((m) => FIELDS.find((f) => f.value === m)!.label).join(', ')}.` : 'Every field you need is mapped.'}</p>
        <div className="er-actions"><Button variant="primary" onClick={() => { if (!missing.length) go(2); }} aria-describedby={undefined}>Continue</Button></div>
      </section>}
      {step === 2 && <section className="er-step">{H('Fix problems')}
        <p className="er-note" role="status">{bad.length ? `${bad.length} ${bad.length === 1 ? 'row has a problem' : 'rows have problems'}. Fix them here, or they’re skipped.` : 'No problems left.'}</p>
        <DataGrid aria-label="Rows to import" showInvalid rows={rows} getRowId={(r) => r.id} getRowLabel={(r) => `row ${r.line}`}
          columns={[{ key: 'line', header: 'Row', align: 'end', width: 64 }, { key: 'date', header: 'Date', editable: true, validate: (v, r) => problem({ ...r, date: String(v) }, 'date') },
            { key: 'merchant', header: 'Merchant' }, { key: 'amount', header: 'Amount', align: 'end', editable: true, validate: (v, r) => problem({ ...r, amount: String(v) }, 'amount') }, { key: 'category', header: 'Type' }]}
          onCellSave={({ rowId, key, draft }) => { setRows((all) => all.map((r) => (r.id === rowId ? { ...r, [key]: String(draft) } : r))); return { ok: true }; }} />
        <div className="er-actions"><Button onClick={() => go(1)}>Back to mapping</Button><Button variant="primary" onClick={() => go(3)}>Continue</Button></div>
      </section>}
      {step === 3 && <section className="er-step">{H('Review the import')}
        {error && <Alert tone="critical" title="Nothing was imported">{error}</Alert>}
        <p className="er-lead">Import {good.length} transactions.{bad.length ? ` ${bad.length} ${bad.length === 1 ? 'row' : 'rows'} will be skipped: ${bad.map((r) => `row ${r.line} (${problem(r, 'date') ? 'a date that isn’t a date' : 'an amount that isn’t a number'})`).join(', ')}.` : ''}</p>
        <div className="er-actions"><Button onClick={() => go(2)}>Fix more rows</Button><Button variant="primary" loading={busy} onClick={() => void run()}>Import {good.length} transactions</Button></div>
      </section>}
      {step === 4 && <section className="er-step">{H('Importing')}<p className="er-note" role="status">Importing {good.length} transactions…</p></section>}
    </main>
  );
}

/* ───────────── The manager ───────────── */

function Manager({ report, onChange, reload }: { report: Report; onChange: (r: Report) => void; reload: () => Promise<void> }) {
  const [phase, setPhase] = React.useState<'deciding' | 'declining'>('deciding');
  const [reason, setReason] = React.useState('');
  const [reasonError, setReasonError] = React.useState('');
  const [sending, setSending] = React.useState<'approved' | 'returned' | null>(null);
  const [error, setError] = React.useState('');
  const outcome = React.useRef<HTMLDivElement>(null);
  const declineRef = React.useRef<HTMLButtonElement>(null);
  const first = EMPLOYEE.split(' ')[0];
  const total = totalOf(report.transactions);

  const decide = async (result: 'approved' | 'returned') => {
    if (result === 'returned' && !reason.trim()) { setReasonError(`Say why, so ${first} knows what to fix.`); document.getElementById('er-reason')?.focus(); return; }
    setSending(result); setError('');
    try { onChange(await service.request<Report>('report.decide', { outcome: result, reason })); }
    catch (e) {
      if (isDemoError(e, 'lost-response')) {
        const now = await service.request<Report>('report.get').catch(() => null);
        if (now?.decision) { onChange(now); return; }
      }
      if (isDemoError(e, 'conflict')) { await reload(); }
      setError(errorMessage(e));
    } finally { setSending(null); }
  };
  const cancel = () => { setPhase('deciding'); setReasonError(''); requestAnimationFrame(() => declineRef.current?.focus()); };

  const header = (title: React.ReactNode, desc: React.ReactNode) => (
    <PageHeader breadcrumb={<Link href="#">Reports to approve</Link>}><PageHeaderTitle>{title}</PageHeaderTitle><PageHeaderDescription>{desc}</PageHeaderDescription></PageHeader>
  );

  const decided = !!report.decision && report.status !== 'submitted';
  // Once decided, the outcome replaces the choice and takes focus (only on the change, never on arriving at a decided report).
  const wasDecided = React.useRef(decided);
  React.useLayoutEffect(() => { if (decided && !wasDecided.current) outcome.current?.focus(); wasDecided.current = decided; }, [decided]);
  if (report.status === 'draft' || (report.status === 'returned' && !report.decision)) {
    return <main className="er">{header('Nothing waiting for you', `${EMPLOYEE} hasn’t submitted his ${PERIOD} report yet.`)}</main>;
  }
  return (
    <main className="er er-decision">
      {header(<>Approve {EMPLOYEE}’s {PERIOD} expenses, {money(total)}?</>, report.submittedAt ? `Submitted ${new Date(report.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}, ${report.transactions.length} transactions, every one with a receipt.` : '')}
      {decided ? (
        <div className="er-choice" role="status" tabIndex={-1} ref={outcome}>
          <p className="er-stamp">{report.decision!.outcome === 'approved' ? `Approved by ${report.decision!.by}` : `Returned to ${first} by ${report.decision!.by}`} · {new Date(report.decision!.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {money(report.decision!.total)}</p>
          <p className="er-consequence">{report.decision!.outcome === 'approved' ? `${money(report.decision!.total)} is paid to ${first} with his next salary.` : `${first} has your reason: “${report.decision!.reason}”`}</p>
          <div><Link href="#">Next report: Priya Natarajan, {money(642.1)} (1 more waiting)</Link></div>
        </div>
      ) : (
        <section className="er-choice" aria-labelledby="er-choice-h">
          <h2 id="er-choice-h" className="er-sr">Your decision</h2>
          <p className="er-consequence">Approving pays {money(total)} to {first} with his next salary and closes the report. It can’t be changed after that.</p>
          {error && <Alert tone="critical" title="That didn’t go through">{error}</Alert>}
          {phase === 'declining' ? <>
            <Field label="Why are you returning it?" hint={`${first} will see this.`} error={reasonError || undefined}>
              <Textarea id="er-reason" rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(''); }} onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }} />
            </Field>
            <div className="er-actions">
              <Button variant="primary" loading={sending === 'returned'} onClick={() => void decide('returned')}>Return to {first}</Button>
              <Button onClick={() => void decide('approved')} disabled={!!sending}>Approve instead</Button>
              <Button variant="ghost" onClick={cancel} disabled={!!sending}>Cancel</Button>
            </div>
          </> : (
            <div className="er-actions">
              <Button variant="primary" loading={sending === 'approved'} onClick={() => void decide('approved')}>Approve</Button>
              <Button ref={declineRef} onClick={() => { setPhase('declining'); requestAnimationFrame(() => document.getElementById('er-reason')?.focus()); }} disabled={!!sending}>Return to {first}</Button>
            </div>
          )}
        </section>
      )}
      <section className="er-evidence" aria-labelledby="er-ev-h">
        <h2 id="er-ev-h" className="er-h2">What’s on it</h2>
        <BarList aria-label="By category" data={CATEGORIES.map((c) => ({ name: c.label, value: totalOf(report.transactions.filter((t) => t.category === c.value)) })).filter((x) => x.value > 0)} format={money} noun="categories" />
        <Table aria-labelledby="er-ev-h">
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Merchant</TableHead><TableHead>Category</TableHead><TableHead>Project</TableHead><TableHead align="end">Amount</TableHead><TableHead>Receipt</TableHead></TableRow></TableHeader>
          <TableBody>
            {report.transactions.map((t) => <TableRow key={t.id}>
              <TableCell>{dayOf(t.date)}</TableCell><TableCell>{t.merchant}</TableCell><TableCell>{categoryLabel(t.category)}</TableCell><TableCell>{projectLabel(t.project)}</TableCell>
              <TableCell align="end"><FormattedNumber value={t.amount} format="currency" currency="EUR" minorUnits={false} locale="en-IE" /></TableCell>
              <TableCell>{t.receipt ?? <Badge tone="caution">Missing</Badge>}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
