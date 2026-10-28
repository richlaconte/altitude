/** Runnable compositions. Import PatternWorkflows inside one AltitudeProvider.
 * This controlled in-memory service demonstrates behavior, not server durability or authorization.
 * Replace the adapters with your application operations and retain their accepted-result contracts.
 */
import * as React from 'react';
import { Button, Field, Input, Dialog, ErrorSummary, WorkflowStatus, useEditRecord, useAsyncCollection,
  useConsequentialAction, useReviewSubmit } from 'altitude-design';
import type { EditRecordResult } from 'altitude-design';
type RecordValue = { name: string };
export function EditRecordExample({ initialValue, save }: { initialValue: RecordValue; save: (value: RecordValue) => Promise<EditRecordResult<RecordValue>> }) {
  const form = useEditRecord({ initialValue, save, validationMode: 'submit', validate: value => value.name.trim() ? {} : { name: 'Enter a name.' } });
  const [left, setLeft] = React.useState(false);
  const id = React.useId();
  if (left) return <p>You left the editor.</p>;
  return <section aria-label="Edit record"><h2>Edit workspace</h2><form noValidate onSubmit={event => { event.preventDefault(); void form.submit(); }}>
    <ErrorSummary errors={form.errors.name ? [{ id, label: 'Workspace name', message: form.errors.name }] : []} focusKey={form.submitCount} />
    <Field label="Workspace name" error={form.errors.name}><Input id={id} value={form.draft.name} onChange={event => form.setField('name', event.target.value)} onBlur={() => form.validateField('name')} /></Field>
    <Button type="submit" loading={form.phase === 'submitting'}>Save changes</Button>
    <Button type="button" disabled={form.phase === 'submitting'} onClick={async () => { if (await form.requestLeave('cancel', () => window.confirm('Discard your unsaved changes?'))) setLeft(true); }}>Cancel editing</Button>
  </form><WorkflowStatus>{form.status}</WorkflowStatus></section>;
}
export function AsyncCollectionExample({ load }: { load: (query: string, context: { signal: AbortSignal }) => Promise<readonly { id: string; name: string }[]> }) {
  const collection = useAsyncCollection({ initialQuery: '', load, getKey: item => item.id, isFiltered: query => !!query, selection: 'preserve' });
  return <section aria-label="Search records"><h2>Records</h2>
    <Field label="Search records"><Input value={collection.query} onChange={event => collection.setQuery(event.target.value)} /></Field>
    <Button onClick={collection.reset}>Reset search</Button><Button onClick={collection.refresh}>Refresh records</Button>
    <WorkflowStatus>{collection.status}</WorkflowStatus>
    {collection.phase === 'failed' && <Button onClick={collection.refresh}>Retry loading</Button>}
    <ul aria-busy={collection.phase === 'loading' || collection.phase === 'refreshing'}>{collection.items.map(item => <li key={item.id}>
      <label><input type="checkbox" checked={collection.selectedKeys.has(item.id)} onChange={() => collection.toggleSelection(item.id)} />{item.name}</label>
    </li>)}</ul><p>{collection.selectedKeys.size} selected, including records outside this view.</p><Button onClick={collection.clearSelection}>Clear selection</Button>
  </section>;
}
export function ConsequentialActionExample({ remove, restore }: { remove: () => Promise<{ ok: true; value: string } | { ok: false; error: string }>;
  restore: (id: string) => Promise<{ ok: true } | { ok: false; error: string }> }) {
  const fallback = React.useRef<HTMLHeadingElement>(null);
  const action = useConsequentialAction({ target: 'Draft proposal', consequence: 'Move Draft proposal to trash. You can restore it here.',
    requiresConfirmation: true, execute: remove, undo: restore, focusFallback: () => fallback.current });
  const open = ['confirming', 'pending'].includes(action.phase) || (action.phase === 'failed' && !action.canUndo);
  return <section><h2 ref={fallback} tabIndex={-1}>Manage proposal</h2>
    {action.phase !== 'succeeded' && <Button onClick={action.request}>Delete Draft proposal</Button>}
    <Dialog open={open} returnFocus={() => fallback.current} title={`Delete ${action.target}?`} description={action.consequence} dismissible={action.phase !== 'pending'}
      onOpenChange={next => { if (!next) action.cancel(); }} footer={<>
        <Button disabled={action.phase === 'pending'} onClick={action.cancel}>Keep proposal</Button>
        <Button variant="danger" loading={action.phase === 'pending'} onClick={action.phase === 'failed' ? action.retry : action.confirm}>Delete proposal</Button>
      </>}><p>{action.error || 'Review the target before continuing.'}</p></Dialog>
    <WorkflowStatus>{action.status}</WorkflowStatus>
    {action.canUndo && <Button onClick={action.undo}>Restore proposal</Button>}
    {action.phase === 'failed' && action.canUndo && <Button onClick={action.retry}>Retry restoration</Button>}
  </section>;
}
export function ReviewSubmitExample({ send }: { send: (draft: RecordValue) => Promise<{ ok: true; receipt: { reference: string } } | { ok: false; error: string }> }) {
  const form = useReviewSubmit({ initialValue: { name: '' }, validate: value => value.name.trim() ? {} : { name: 'Enter a name.' }, submit: send });
  const id = React.useId();
  const heading = React.useRef<HTMLHeadingElement>(null);
  const previousPhase = React.useRef(form.phase);
  React.useEffect(() => {
    if (previousPhase.current !== form.phase) {
      if (form.phase === 'editing') document.getElementById(id)?.focus();
      else if (form.phase === 'review' || form.phase === 'complete') heading.current?.focus();
      previousPhase.current = form.phase;
    }
  }, [form.phase, id]);
  return <section aria-label="Review and send"><h2 ref={heading} tabIndex={-1}>{form.phase === 'editing' ? 'Your answers' : form.phase === 'complete' ? 'Request received' : 'Review your answers'}</h2><p>Step {form.phase === 'editing' ? '1 of 2: Your answers' : form.phase === 'complete' ? '2 of 2: Complete' : '2 of 2: Review your answers'}</p>
    {form.phase === 'editing' ? <form noValidate onSubmit={event => { event.preventDefault(); form.review(); }}><ErrorSummary errors={form.errors.name ? [{ id, label: 'Your name', message: form.errors.name }] : []} focusKey={form.submitCount} />
      <Field label="Your name" error={form.errors.name}><Input id={id} value={form.draft.name} onChange={event => form.setField('name', event.target.value)} /></Field>
      <Button type="submit">Review answers</Button></form> : form.phase === 'complete' ? <p>Confirmation: {form.receipt?.reference}</p> : <>
      <dl><dt>Your name</dt><dd>{form.draft.name}</dd></dl>
      <Button disabled={form.phase === 'submitting'} onClick={form.correct}>Correct your answers</Button><Button loading={form.phase === 'submitting'} onClick={form.submit}>Send request</Button>
    </>}<WorkflowStatus>{form.status}</WorkflowStatus></section>;
}
export function PatternWorkflows() {
  const data = React.useRef({ record: { name: 'Northwind' }, proposal: true, submissions: [] as RecordValue[] });
  const fail = React.useRef(false);
  const delay = () => new Promise<void>((resolve, reject) => setTimeout(() => { if (fail.current) { fail.current = false; reject(Error('Controlled failure')); } else resolve(); }, 350));
  return <main><h1>Workflow examples</h1><p>This demo stores records in memory; reloading resets its data.</p>
    <Button onClick={() => { fail.current = true; }}>Fail the next operation</Button>
    <EditRecordExample initialValue={data.current.record} save={async value => { await delay(); data.current.record = { name: value.name.trim() }; return { ok: true, value: data.current.record }; }} />
    <AsyncCollectionExample load={async query => { await delay(); return [{id:'workspace',name:data.current.record.name}].filter(item => item.name.toLowerCase().includes(query.toLowerCase())); }} />
    <ConsequentialActionExample remove={async () => { await delay(); data.current.proposal = false; return {ok:true,value:'proposal'}; }} restore={async () => { await delay(); data.current.proposal = true; return {ok:true}; }} />
    <ReviewSubmitExample send={async value => { await delay(); data.current.submissions.push(value); return {ok:true,receipt:{reference:`Request ${data.current.submissions.length}`}}; }} />
  </main>;
}
