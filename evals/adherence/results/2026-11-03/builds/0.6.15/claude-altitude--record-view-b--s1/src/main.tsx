import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Badge, Breadcrumb, DiffView, EditRegion, EditRegionForm, EditRegionTrigger, EditRegionValue,
  EditRegionView, Field, Input, PageHeader, PageHeaderDescription, PageHeaderTitle, Select, Table, TableBody,
  TableCaption, TableCell, TableHead, TableHeader, TableRow, Timeline, TimelineItem, Toaster,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {
  ALLERGENS, CHANGES, COMPONENTS, INITIAL_DETAILS, SECTIONS, STATIONS, labelOf, saveRecipeDetails,
  type Change, type ChangeKind, type RecipeDetails, type Section, type Station,
} from './data';

// Lucide-style line icons on the 24px grid, 1.75 stroke, in currentColor.
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const ICONS: Record<ChangeKind, string> = {
  details: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  ingredients: 'M3 6h18M3 12h18M3 18h12',
  method: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5',
  created: 'M12 5v14M5 12h14',
};

const FIELD_LABELS: Record<keyof RecipeDetails, string> = {
  name: 'Name', section: 'Menu section', station: 'Station', batchYield: 'Batch yield', holdTime: 'Hold time',
};

const display = (key: keyof RecipeDetails, d: RecipeDetails): string => {
  switch (key) {
    case 'section': return labelOf(SECTIONS, d.section);
    case 'station': return labelOf(STATIONS, d.station);
    case 'batchYield': return `${d.batchYield} portions`;
    default: return String(d[key]);
  }
};

function validate(draft: RecipeDetails) {
  const errors: Partial<Record<keyof RecipeDetails, string>> = {};
  if (!draft.name.trim()) errors.name = 'Enter the recipe name.';
  const n = Number(draft.batchYield.trim());
  if (!draft.batchYield.trim() || !Number.isInteger(n) || n < 1) errors.batchYield = 'Enter a whole number of portions, 1 or more.';
  if (!draft.holdTime.trim()) errors.holdTime = 'Say how long it holds and how, like “3 days chilled”.';
  return Object.keys(errors).length ? errors : undefined;
}

function DetailsSection({ details, onDetailsChange, onSaved }: {
  details: RecipeDetails;
  onDetailsChange: (d: RecipeDetails) => void;
  onSaved: (change: Change) => void;
}) {
  const revision = React.useRef(7);
  const rows: [keyof RecipeDetails, string][] = [
    ['name', 'Name'], ['section', 'Menu section'], ['station', 'Station'], ['batchYield', 'Batch yield'], ['holdTime', 'Hold time'],
  ];
  return (
    <section className="rb-details" aria-labelledby="rb-details-h">
      <EditRegion<RecipeDetails> layout="in-place" label="recipe details" editLabel="Edit recipe details"
        saveLabel="Save details" value={details} validate={validate} onValueChange={onDetailsChange}
        onSave={async (draft, { previousValue, changed }) => {
          const result = await saveRecipeDetails(draft, revision.current);
          if (!result.ok) return result;
          revision.current = result.revision;
          const before: Record<string, unknown> = {};
          const after: Record<string, unknown> = {};
          for (const key of changed) {
            before[FIELD_LABELS[key]] = display(key, previousValue);
            after[FIELD_LABELS[key]] = display(key, result.value);
          }
          onSaved({
            id: `c-${Date.now()}`, at: new Date().toISOString(), who: 'You', kind: 'details', status: 'committed',
            summary: `changed the ${changed.map((k) => FIELD_LABELS[k].toLowerCase()).join(', ')}`, before, after,
          });
          return { ok: true, value: result.value };
        }}>
        <EditRegionView trigger={false}>
          <div className="rb-section-head">
            <h2 id="rb-details-h">Details</h2>
            <EditRegionTrigger>Edit details</EditRegionTrigger>
          </div>
          <dl className="rb-grid">
            {rows.map(([key, label]) => (
              <React.Fragment key={key}>
                <dt>{label}</dt>
                <dd><EditRegionValue field={key} reserve>{display(key, details)}</EditRegionValue></dd>
              </React.Fragment>
            ))}
          </dl>
        </EditRegionView>
        <EditRegionForm<RecipeDetails>>
          {(field) => (
            <>
              <div className="rb-section-head"><h2>Details</h2></div>
              <dl className="rb-grid">
                <dt>Name</dt>
                <dd><Field label="Name" required error={field.error('name')}><Input {...field('name')} autoComplete="off" /></Field></dd>
                <dt>Menu section</dt>
                <dd><Field label="Menu section">
                  <Select {...field.value('section')} onValueChange={(v) => field.value('section').onValueChange(v as Section)} items={SECTIONS} />
                </Field></dd>
                <dt>Station</dt>
                <dd><Field label="Station">
                  <Select {...field.value('station')} onValueChange={(v) => field.value('station').onValueChange(v as Station)} items={STATIONS} />
                </Field></dd>
                <dt>Batch yield</dt>
                <dd><Field label="Batch yield, in portions" required error={field.error('batchYield')}>
                  <Input {...field('batchYield')} inputMode="numeric" autoComplete="off" />
                </Field></dd>
                <dt>Hold time</dt>
                <dd><Field label="Hold time" required error={field.error('holdTime')}><Input {...field('holdTime')} autoComplete="off" /></Field></dd>
              </dl>
            </>
          )}
        </EditRegionForm>
      </EditRegion>
      <dl className="rb-grid rb-grid-static">
        <dt>Allergens</dt>
        <dd>{ALLERGENS.join(', ')}</dd>
      </dl>
    </section>
  );
}

function IngredientsSection({ batchYield }: { batchYield: string }) {
  return (
    <section className="rb-ingredients" aria-labelledby="rb-ingredients-h">
      <div className="rb-section-head">
        <h2 id="rb-ingredients-h">Ingredients</h2>
        <p className="rb-muted">Quantities for one batch of 12 portions{batchYield !== '12' ? `. The batch yield is now ${batchYield}; check the quantities before the next prep.` : '.'}</p>
      </div>
      {COMPONENTS.map((c) => (
        <div className="rb-component" key={c.id}>
          <h3 id={`rb-comp-${c.id}`}>{c.name}</h3>
          <Table aria-labelledby={`rb-comp-${c.id}`}>
            <TableCaption className="rb-visually-hidden">{c.name}: {c.ingredients.length} ingredients</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead align="end">Quantity</TableHead>
                <TableHead>Prep</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {c.ingredients.map((i) => (
                <TableRow key={i.id} rowId={i.id}>
                  <TableCell>{i.name}</TableCell>
                  <TableCell align="end" className="rb-qty">{i.quantity} {i.unit}</TableCell>
                  <TableCell className="rb-muted">{i.prep || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </section>
  );
}

function ChangesSection({ changes }: { changes: Change[] }) {
  return (
    <aside className="rb-changes" aria-labelledby="rb-changes-h">
      <h2 id="rb-changes-h">Recent changes</h2>
      <Timeline aria-label="Recent changes to this recipe" headingLevel={3}>
        {changes.map((c) => (
          <TimelineItem key={c.id} time={c.at} status={c.status} icon={<Icon d={ICONS[c.kind]} />}
            detail={c.before && c.after ? <DiffView mode="properties" before={c.before} after={c.after} /> : undefined}>
            <strong>{c.who}</strong> {c.summary}
          </TimelineItem>
        ))}
      </Timeline>
    </aside>
  );
}

function App() {
  const [details, setDetails] = React.useState<RecipeDetails>(INITIAL_DETAILS);
  const [changes, setChanges] = React.useState<Change[]>(CHANGES);
  return (
    <main className="rb-page">
      <PageHeader
        breadcrumb={<Breadcrumb items={[
          { label: 'Recipe book', href: '#/recipes' },
          { label: labelOf(SECTIONS, details.section), href: `#/recipes/${details.section}` },
          { label: details.name },
        ]} />}
        actions={<Badge tone="positive">On the menu</Badge>}>
        <PageHeaderTitle>{details.name}</PageHeaderTitle>
        <PageHeaderDescription>
          Halyard Street kitchen · {labelOf(STATIONS, details.station)} station · {details.batchYield} portions a batch
        </PageHeaderDescription>
      </PageHeader>
      <div className="rb-body">
        <div className="rb-main">
          <DetailsSection details={details} onDetailsChange={setDetails}
            onSaved={(change) => setChanges((xs) => [change, ...xs])} />
          <IngredientsSection batchYield={details.batchYield} />
        </div>
        <ChangesSection changes={changes} />
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
    <Toaster />
  </AltitudeProvider>,
);
