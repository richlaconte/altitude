// Recipe page: one recipe in the kitchen's recipe book. Design record: src/DESIGN.md.
//   Task: a cook or sous chef reads a recipe before prep or service, and corrects its details when they change.
//   Lead: the ingredients. Primary action: Edit details. Next: back to the recipe book.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Alert, Badge, Breadcrumb, Button, DiffView, ErrorSummary, Field, Input, NumberInput, PageHeader,
  PageHeaderDescription, PageHeaderTitle, PropertyList, PropertyListItem, Select, Sheet, SheetDescription, SheetFooter,
  SheetHeader, SheetTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, Timeline,
  TimelineItem, WorkflowStatus, useEditRecord,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './recipe.css';
import {
  DETAIL_LABELS, INGREDIENT_GROUPS, INITIAL_CHANGES, INITIAL_DETAILS, RECIPE_ID, STATIONS, duration, formatDetail,
  stationLabel, type RecipeChange, type RecipeDetails, type Station,
} from './recipe-data';
import { currentRevision, saveRecipeDetails } from './recipe-service';

type Draft = { [K in keyof RecipeDetails]: RecipeDetails[K] extends number ? number | null : RecipeDetails[K] };

const FIELD_IDS: Record<keyof RecipeDetails, string> = {
  name: 'rd-name', station: 'rd-station', yieldPortions: 'rd-yield', prepMinutes: 'rd-prep',
  cookMinutes: 'rd-cook', shelfLifeDays: 'rd-shelf', allergens: 'rd-allergens', holding: 'rd-holding',
};

function validate(d: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.name.trim()) errors.name = 'Enter the recipe’s name.';
  if (d.yieldPortions == null || d.yieldPortions < 1) errors.yieldPortions = 'Enter how many portions it makes, 1 or more.';
  if (d.prepMinutes == null || d.prepMinutes < 0) errors.prepMinutes = 'Enter the prep time in minutes, 0 or more.';
  if (d.cookMinutes == null || d.cookMinutes < 0) errors.cookMinutes = 'Enter the cook time in minutes, 0 or more.';
  if (d.shelfLifeDays == null || d.shelfLifeDays < 0) errors.shelfLifeDays = 'Enter the shelf life in days, 0 or more.';
  return errors;
}

function changeSentence(change: RecipeChange) {
  const keys = Object.keys(change.after) as (keyof RecipeDetails)[];
  if (keys.length === 1) {
    const key = keys[0];
    const label = DETAIL_LABELS[key].toLowerCase();
    if (key === 'holding' || key === 'allergens' || key === 'name') return `${change.actor} changed the ${label}`;
    return `${change.actor} changed the ${label} from ${formatDetail(key, change.before[key])} to ${formatDetail(key, change.after[key])}`;
  }
  const labels = keys.map(k => DETAIL_LABELS[k].toLowerCase());
  return `${change.actor} changed the ${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function App() {
  const [details, setDetails] = React.useState<RecipeDetails>(INITIAL_DETAILS);
  const [changes, setChanges] = React.useState<RecipeChange[]>(INITIAL_CHANGES);
  const [open, setOpen] = React.useState(false);
  const [outcome, setOutcome] = React.useState('');
  const [discard, setDiscard] = React.useState<null | ((accept: boolean) => void)>(null);
  const discardRef = React.useRef<HTMLDivElement>(null);
  // The revision the draft was started from; the service refuses a save made on top of someone else's.
  const baseRevision = React.useRef(currentRevision());

  const form = useEditRecord<Draft>({
    initialValue: INITIAL_DETAILS,
    validationMode: 'submit',
    validate,
    save: async draft => {
      try {
        const result = await saveRecipeDetails(draft as RecipeDetails, baseRevision.current);
        baseRevision.current = result.revision;
        setDetails(result.details);
        if (result.change) setChanges(list => [result.change!, ...list]);
        return { ok: true, value: result.details };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'The details couldn’t be saved. Try again.' };
      }
    },
    messages: { saving: 'Saving recipe details…', saved: 'Recipe details saved.', failed: 'The details weren’t saved.' },
  });

  // Reload and tab close: browsers show their own words and may not ask in every case.
  React.useEffect(() => {
    if (!form.dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [form.dirty]);

  const openEditor = () => {
    if (!form.dirty) { form.reset(details); baseRevision.current = currentRevision(); }
    setOutcome('');
    setOpen(true);
  };

  // A real decision, made inside the sheet: Keep editing leaves the draft intact; Discard drops it deliberately.
  const askDiscard = () => new Promise<boolean>(resolve => {
    setDiscard(() => (accept: boolean) => { setDiscard(null); resolve(accept); });
    requestAnimationFrame(() => discardRef.current?.focus());
  });

  const close = async () => {
    if (discard) return;
    if (await form.requestLeave('cancel', askDiscard)) {
      form.reset(details);
      setOpen(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await form.submit();
    if (result?.ok) {
      setOpen(false);
      setOutcome('Recipe details saved. The change is at the top of Recent changes.');
    }
  };

  const errorList = (Object.keys(form.errors) as (keyof RecipeDetails)[])
    .filter(k => form.errors[k])
    .map(k => ({ id: FIELD_IDS[k], label: DETAIL_LABELS[k], message: form.errors[k]! }));
  const pending = form.phase === 'submitting';

  return (
    <main className="rp-page">
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Recipe book', href: '#/recipes' }, { label: 'Mains', href: '#/recipes/mains' }, { label: details.name }]} />}
        primary={<Button variant="primary" onClick={openEditor}>Edit details</Button>}
      >
        <PageHeaderTitle>{details.name}</PageHeaderTitle>
        <PageHeaderDescription>
          {RECIPE_ID} · {stationLabel(details.station)} station · makes {details.yieldPortions} portions
        </PageHeaderDescription>
      </PageHeader>

      <WorkflowStatus className="rp-outcome">{outcome}</WorkflowStatus>

      <div className="rp-body">
        <section className="rp-lead" aria-labelledby="rp-ingredients-h">
          <div className="rp-lead-head">
            <h2 id="rp-ingredients-h" className="rp-h2">Ingredients</h2>
            <p className="rp-quiet">For {details.yieldPortions} portions</p>
          </div>
          {INGREDIENT_GROUPS.map(group => (
            <section key={group.id} className="rp-group" aria-labelledby={`rp-g-${group.id}`}>
              <h3 id={`rp-g-${group.id}`} className="rp-h3">{group.title}</h3>
              <div className="rp-table-scroll">
                <Table aria-labelledby={`rp-g-${group.id}`} className="rp-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="rp-qty" scope="col">Quantity</TableHead>
                      <TableHead scope="col">Ingredient</TableHead>
                      <TableHead scope="col">Prep</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.ingredients.map(ing => (
                      <TableRow key={ing.id} rowId={ing.id}>
                        <TableCell className="rp-qty">{ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}</TableCell>
                        <TableCell>{ing.item}</TableCell>
                        <TableCell className="rp-quiet">{ing.prep ?? ''}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}
        </section>

        <aside className="rp-side" aria-labelledby="rp-details-h">
          <h2 id="rp-details-h" className="rp-h2">Details</h2>
          <PropertyList aria-labelledby="rp-details-h" layout="stacked">
            <PropertyListItem label="Station" value={stationLabel(details.station)} />
            <PropertyListItem label="Yield" value={`${details.yieldPortions} portions`} />
            <PropertyListItem label="Prep time" value={duration(details.prepMinutes)} />
            <PropertyListItem label="Cook time" value={duration(details.cookMinutes)} />
            <PropertyListItem label="Shelf life" value={formatDetail('shelfLifeDays', details.shelfLifeDays)} />
            <PropertyListItem
              label="Allergens" value={details.allergens} emptyLabel="None recorded"
              renderValue={v => <span className="rp-allergens">{v.split(',').map(a => a.trim()).filter(Boolean).map(a => <Badge key={a} tone="caution" variant="outline" lamp={false}>{a}</Badge>)}</span>}
            />
            <PropertyListItem label="Holding and service" value={details.holding} emptyLabel="No holding notes" />
          </PropertyList>

          <section className="rp-changes" aria-labelledby="rp-changes-h">
            <h2 id="rp-changes-h" className="rp-h2">Recent changes</h2>
            <Timeline aria-label="Recent changes to this recipe" groupBy="none" locale="en-GB">
              {changes.map(change => (
                <TimelineItem
                  key={change.id} time={change.time} locale="en-GB"
                  detail={<DiffView mode="properties" before={change.before} after={change.after}
                    fields={(Object.keys(change.after) as (keyof RecipeDetails)[]).map(key => ({ key, label: DETAIL_LABELS[key], format: v => formatDetail(key, v) }))} />}
                >
                  {changeSentence(change)}
                </TimelineItem>
              ))}
            </Timeline>
          </section>
        </aside>
      </div>

      <Sheet open={open} onOpenChange={next => { if (next) setOpen(true); else void close(); }} size="md" aria-labelledby="rp-sheet-title">
        <form className="rp-form" aria-labelledby="rp-sheet-title" onSubmit={submit} noValidate>
          <SheetHeader>
            <SheetTitle id="rp-sheet-title">Edit recipe details</SheetTitle>
            <SheetDescription>Changes are saved to the recipe book and listed in Recent changes.</SheetDescription>
          </SheetHeader>
          <div className="rp-form-body">
            <ErrorSummary focusKey={form.submitCount} errors={errorList} />
            <Field label="Name" required error={form.errors.name}>
              <Input id={FIELD_IDS.name} value={form.draft.name} readOnly={pending}
                onChange={e => form.setField('name', e.target.value)} />
            </Field>
            <Field label="Station">
              <Select id={FIELD_IDS.station} items={STATIONS} value={form.draft.station} disabled={pending}
                onValueChange={v => form.setField('station', v as Station)} />
            </Field>
            <div className="rp-form-row">
              <Field label="Yield" hint="Portions" required error={form.errors.yieldPortions}>
                <NumberInput id={FIELD_IDS.yieldPortions} value={form.draft.yieldPortions} min={1} readOnly={pending}
                  onValueChange={v => form.setField('yieldPortions', v)}
                  incrementLabel="Increase yield" decrementLabel="Decrease yield" />
              </Field>
              <Field label="Shelf life" hint="Days, chilled" error={form.errors.shelfLifeDays}>
                <NumberInput id={FIELD_IDS.shelfLifeDays} value={form.draft.shelfLifeDays} min={0} readOnly={pending}
                  format={{ style: 'unit', unit: 'day' }} onValueChange={v => form.setField('shelfLifeDays', v)}
                  incrementLabel="Increase shelf life" decrementLabel="Decrease shelf life" />
              </Field>
            </div>
            <div className="rp-form-row">
              <Field label="Prep time" hint="Minutes" error={form.errors.prepMinutes}>
                <NumberInput id={FIELD_IDS.prepMinutes} value={form.draft.prepMinutes} min={0} step={5} readOnly={pending}
                  format={{ style: 'unit', unit: 'minute' }} onValueChange={v => form.setField('prepMinutes', v)}
                  incrementLabel="Increase prep time" decrementLabel="Decrease prep time" />
              </Field>
              <Field label="Cook time" hint="Minutes" error={form.errors.cookMinutes}>
                <NumberInput id={FIELD_IDS.cookMinutes} value={form.draft.cookMinutes} min={0} step={5} readOnly={pending}
                  format={{ style: 'unit', unit: 'minute' }} onValueChange={v => form.setField('cookMinutes', v)}
                  incrementLabel="Increase cook time" decrementLabel="Decrease cook time" />
              </Field>
            </div>
            <Field label="Allergens" hint="Separate with commas, as they appear on the allergen matrix">
              <Input id={FIELD_IDS.allergens} value={form.draft.allergens} readOnly={pending}
                onChange={e => form.setField('allergens', e.target.value)} />
            </Field>
            <Field label="Holding and service">
              <Textarea id={FIELD_IDS.holding} rows={5} value={form.draft.holding} readOnly={pending}
                onChange={e => form.setField('holding', e.target.value)} />
            </Field>
            {form.phase === 'failed' && form.error && <Alert tone="critical" title="The details weren’t saved">{form.error}</Alert>}
          </div>
          <SheetFooter>
            {discard ? (
              <div className="rp-discard" role="group" aria-labelledby="rp-discard-q" tabIndex={-1} ref={discardRef}>
                <p id="rp-discard-q" className="rp-discard-q">Discard your changes to these details?</p>
                <Button type="button" variant="secondary" onClick={() => discard(false)}>Keep editing</Button>
                <Button type="button" variant="danger" onClick={() => discard(true)}>Discard changes</Button>
              </div>
            ) : (
              <>
                <Button type="button" variant="ghost" disabled={pending} onClick={() => void close()}>Cancel</Button>
                <Button type="submit" variant="primary" loading={pending}>{form.phase === 'failed' ? 'Try saving again' : 'Save details'}</Button>
              </>
            )}
          </SheetFooter>
          <WorkflowStatus className="rp-sheet-status">{form.phase === 'submitting' || form.phase === 'failed' ? form.status : ''}</WorkflowStatus>
        </form>
      </Sheet>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<AltitudeProvider><App /></AltitudeProvider>);
