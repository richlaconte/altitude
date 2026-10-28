import * as React from 'react';
import { useEditRecord, useAsyncCollection, useConsequentialAction, useReviewSubmit, ErrorSummary, WorkflowStatus } from '../../project/components/src/index';
import type { EditRecordOptions, ConsequentialActionOptions, ReviewSubmitResult } from '../../project/components/src/index';

export function Contracts() {
  const form = useEditRecord({ initialValue: { name: '', count: 1 }, validationMode: 'blur', validate: value => value.name ? {} : { name: 'Required' },
    save: async value => ({ ok: true, value }) });
  form.setField('name', 'Ada'); form.setField('count', 2);
  // @ts-expect-error Field value type follows its key.
  form.setField('count', 'two');
  // @ts-expect-error Unknown fields cannot enter the draft.
  form.setField('missing', 'value');
  const collection = useAsyncCollection({ initialQuery: '', isFiltered: query => !!query, selection: 'clear-on-query',
    load: async query => [{ id: query || 'a', title: 'Record' }], getKey: item => item.id });
  collection.toggleSelection('a');
  // @ts-expect-error Query types are preserved.
  collection.setQuery(123);
  const action = useConsequentialAction({ target: 'Record', consequence: 'Remove record.', requiresConfirmation: true,
    execute: async () => ({ ok: true, value: 'record-id' }) });
  const review = useReviewSubmit({ initialValue: { name: '' }, validate: value => value.name ? {} : { name: 'Required' },
    submit: async () => ({ ok: true, receipt: { reference: 'accepted-42' } }) });
  const reference: string | undefined = review.receipt?.reference;
  return <><ErrorSummary errors={[]} focusKey={form.submitCount} /><WorkflowStatus>{reference || action.status}</WorkflowStatus></>;
}
// @ts-expect-error Validation timing must be deliberate.
const missingTiming: EditRecordOptions<{name:string}> = { initialValue: {name:''}, validate: () => ({}), save: value => ({ok:true,value}) };
// @ts-expect-error Direct consequential action must supply a real inverse; otherwise require confirmation.
const noRecovery: ConsequentialActionOptions<string> = { target:'Record', consequence:'Remove record.', requiresConfirmation:false, execute:()=>({ok:true,value:'id'}) };
// @ts-expect-error A confirmed intent is not a submission receipt.
const falseCompletion: ReviewSubmitResult<{name:string},{reference:string}> = {ok:true};
void missingTiming; void noRecovery; void falseCompletion;
