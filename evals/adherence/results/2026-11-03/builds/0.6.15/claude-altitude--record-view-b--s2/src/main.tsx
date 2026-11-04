import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Badge, Breadcrumb, DiffView, Field, Input, PageHeader, PageHeaderDescription, PageHeaderTitle,
  PropertyList, PropertyListItem, Select, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
  Timeline, TimelineItem, Toaster,
} from 'altitude-design';
import type { Tone } from 'altitude-design';
import 'altitude-design/altitude.css';
import './recipe.css';
import {
  INGREDIENTS, INITIAL_CHANGES, INITIAL_DETAILS, METHOD, RECIPE_META, STATIONS, STATUSES,
  formatMinutes, recipeService, stationLabel, statusLabel,
} from './data';
import type { ChangeEvent, RecipeDetails, RecipeStatus } from './data';

const STATUS_TONE: Record<RecipeStatus, Tone> = { 'in-service': 'positive', testing: 'caution', retired: 'neutral' };

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const ICONS: Record<ChangeEvent['kind'], string> = {
  details: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  ingredient: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  method: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
  status: 'M5 12.5l4.5 4.5L19 7.5',
};

const FIELD_LABELS: Record<keyof RecipeDetails & string, string> = {
  name: 'Name', station: 'Station', yieldPortions: 'Yield', activeMinutes: 'Active prep', status: 'Status',
};
const displayValue = (key: string, v: unknown): string => {
  const s = String(v ?? '');
  if (key === 'station') return stationLabel(s);
  if (key === 'status') return statusLabel(s);
  if (key === 'yieldPortions') return `${s} portions`;
  if (key === 'activeMinutes') return formatMinutes(s);
  return s;
};

const ALLERGENS = [...new Set(INGREDIENTS.map(i => i.allergen).filter(Boolean) as string[])].sort();
const COMPONENTS = [...new Set(INGREDIENTS.map(i => i.component))];

function validateDetails(d: RecipeDetails) {
  const errors: Partial<Record<keyof RecipeDetails, string>> = {};
  if (!d.name.trim()) errors.name = 'Enter a recipe name.';
  const y = Number(d.yieldPortions);
  if (!Number.isInteger(y) || y < 1) errors.yieldPortions = 'Enter a whole number of portions, 1 or more.';
  const m = Number(d.activeMinutes);
  if (!Number.isInteger(m) || m < 1) errors.activeMinutes = 'Enter the active prep time in whole minutes.';
  return Object.keys(errors).length ? errors : undefined;
}

function RecipePage() {
  const [details, setDetails] = React.useState<RecipeDetails>(INITIAL_DETAILS);
  const [changes, setChanges] = React.useState<ChangeEvent[]>(INITIAL_CHANGES);
  const revision = React.useRef(recipeService.revision());

  const saveDetails = async (draft: RecipeDetails, { previousValue, changed }: { previousValue: RecipeDetails; changed: (keyof RecipeDetails)[] }) => {
    const result = await recipeService.saveDetails(draft, revision.current);
    if (!result.ok) return { ok: false as const, error: result.error };
    revision.current = result.revision;
    const keys = changed.map(String);
    const before = Object.fromEntries(keys.map(k => [k, displayValue(k, previousValue[k])]));
    const after = Object.fromEntries(keys.map(k => [k, displayValue(k, result.details[k])]));
    const sentence = keys.length === 1
      ? `changed the ${FIELD_LABELS[keys[0] as keyof typeof FIELD_LABELS].toLowerCase()} from ${before[keys[0]]} to ${after[keys[0]]}`
      : `changed the ${keys.map(k => FIELD_LABELS[k as keyof typeof FIELD_LABELS].toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1')}`;
    setChanges(cs => [{ id: `c-${Date.now()}`, at: new Date(), actor: 'You', kind: 'details', sentence, before, after }, ...cs]);
    return { ok: true as const, value: result.details };
  };

  return (
    <div className="recipe-page">
      <PageHeader
        breadcrumb={<Breadcrumb items={[
          { label: 'Recipe book', href: '#/recipes' },
          { label: 'Mains', href: '#/recipes/mains' },
          { label: details.name },
        ]} />}>
        <PageHeaderTitle>{details.name}</PageHeaderTitle>
        <PageHeaderDescription>
          {RECIPE_META.code} · {RECIPE_META.menu} · Owned by {RECIPE_META.owner}
        </PageHeaderDescription>
      </PageHeader>

      <main className="recipe-layout">
        <div className="recipe-main">
          <section aria-labelledby="details-title" className="recipe-section">
            <h2 id="details-title" className="recipe-heading">Details</h2>
            <PropertyList<RecipeDetails> aria-labelledby="details-title" layout="inline"
              editAll={{
                label: 'recipe details',
                value: details,
                onValueChange: setDetails,
                validate: validateDetails,
                onSave: saveDetails,
                renderEditor: field => <>
                  <Field label="Name" required error={field.error('name')}>
                    <Input {...field('name')} autoComplete="off" />
                  </Field>
                  <Field label="Station">
                    <Select {...field.value('station')} items={STATIONS} />
                  </Field>
                  <Field label="Yield (portions)" required error={field.error('yieldPortions')}>
                    <Input {...field('yieldPortions')} type="number" inputMode="numeric" min={1} step={1} />
                  </Field>
                  <Field label="Active prep (minutes)" hint="Hands-on time, not counting the braise." required error={field.error('activeMinutes')}>
                    <Input {...field('activeMinutes')} type="number" inputMode="numeric" min={1} step={1} />
                  </Field>
                  <Field label="Status">
                    <Select {...field.value('status')} items={STATUSES} />
                  </Field>
                </>,
              }}>
              <PropertyListItem label="Status" value={details.status}
                renderValue={s => <Badge tone={STATUS_TONE[s as RecipeStatus] ?? 'neutral'} lamp>{statusLabel(s)}</Badge>} />
              <PropertyListItem label="Station" value={stationLabel(details.station)} />
              <PropertyListItem label="Yield" value={`${details.yieldPortions} portions`} />
              <PropertyListItem label="Active prep" value={formatMinutes(details.activeMinutes)} />
              <PropertyListItem label="Braise" value={RECIPE_META.braiseTime} />
              <PropertyListItem label="Holding" value={RECIPE_META.holding} />
              <PropertyListItem label="Allergens" value={ALLERGENS}
                renderValue={list => <span className="recipe-badges">{list.map(a => <Badge key={a}>{a}</Badge>)}</span>} />
            </PropertyList>
          </section>

          <section aria-labelledby="ingredients-title" className="recipe-section">
            <h2 id="ingredients-title" className="recipe-heading">Ingredients</h2>
            <p className="recipe-caption">Quantities for one batch of {details.yieldPortions} portions.</p>
            <Table aria-labelledby="ingredients-title">
              <TableCaption className="recipe-visually-hidden">
                Ingredients for one batch, grouped by component
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead align="end">Quantity</TableHead>
                  <TableHead>Prep</TableHead>
                  <TableHead>Allergen</TableHead>
                </TableRow>
              </TableHeader>
              {COMPONENTS.map(component => (
                <TableBody key={component}>
                  <TableRow>
                    <TableHead scope="colgroup" colSpan={4} className="recipe-component">{component}</TableHead>
                  </TableRow>
                  {INGREDIENTS.filter(i => i.component === component).map(i => (
                    <TableRow key={i.id} rowId={i.id}>
                      <TableCell>{i.name}</TableCell>
                      <TableCell align="end" className="recipe-num">
                        {i.quantity.toLocaleString('en-GB')} {i.unit}
                      </TableCell>
                      <TableCell>{i.prep || <span className="recipe-muted">None</span>}</TableCell>
                      <TableCell>{i.allergen ? <Badge>{i.allergen}</Badge> : <span className="recipe-muted">None</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ))}
            </Table>
          </section>

          <section aria-labelledby="method-title" className="recipe-section">
            <h2 id="method-title" className="recipe-heading">Method</h2>
            <ol className="recipe-method">
              {METHOD.map((step, n) => <li key={n}>{step}</li>)}
            </ol>
          </section>
        </div>

        <aside className="recipe-side" aria-labelledby="changes-title">
          <h2 id="changes-title" className="recipe-heading">Recent changes</h2>
          <Timeline aria-label="Recent changes to this recipe">
            {changes.map(c => (
              <TimelineItem key={c.id} time={c.at} icon={<Icon d={ICONS[c.kind]} />}
                detail={c.before && c.after
                  ? <DiffView mode="properties" before={c.before} after={c.after}
                      fields={Object.keys(c.after).map(key => ({ key, label: FIELD_LABELS[key as keyof typeof FIELD_LABELS] ?? key.charAt(0).toUpperCase() + key.slice(1) }))} />
                  : undefined}>
                <strong>{c.actor}</strong> {c.sentence}
              </TimelineItem>
            ))}
          </Timeline>
        </aside>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <RecipePage />
    <Toaster />
  </AltitudeProvider>,
);
