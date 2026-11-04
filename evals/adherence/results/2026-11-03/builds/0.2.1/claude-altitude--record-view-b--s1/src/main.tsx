import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Avatar, Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
  Checkbox, Field, Input, Select, Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle, Table, TableBody,
  TableCell, TableFooter, TableHead, TableHeader, TableRow, Textarea, Toaster, toast,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {
  STATIONS, initialChanges, initialDetails, ingredients, type Change, type RecipeDetails, type RecipeStatus, type Station,
} from './data';

const ALLERGENS = ['Dairy', 'Gluten', 'Eggs', 'Nuts', 'Soy', 'Shellfish', 'Fish', 'Sesame'];
const CURRENT_USER = { name: 'Alex Rivera', role: 'Executive chef' };

const STATUS_BADGE: Record<RecipeStatus, { label: string; tone: 'positive' | 'caution' | 'neutral' }> = {
  active: { label: 'Active', tone: 'positive' },
  testing: { label: 'Testing', tone: 'caution' },
  retired: { label: 'Retired', tone: 'neutral' },
};

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function minutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** Parses a portion such as "60 ml per plate" into litres, to estimate portions per batch. */
function portionsPerBatch(d: RecipeDetails): number | null {
  const m = d.portion.match(/([\d.]+)\s*(ml|l)\b/i);
  if (!m || d.yieldUnit.toLowerCase() !== 'l') return null;
  const litres = parseFloat(m[1]) / (m[2].toLowerCase() === 'ml' ? 1000 : 1);
  return litres > 0 ? Math.floor(d.yieldQty / litres) : null;
}

/** One sentence per field that changed, for the change log. */
function describeChanges(a: RecipeDetails, b: RecipeDetails): string[] {
  const out: string[] = [];
  if (a.name !== b.name) out.push(`Renamed to “${b.name}”`);
  if (a.station !== b.station) out.push(`Station changed from ${a.station} to ${b.station}`);
  if (a.status !== b.status) out.push(`Status changed from ${a.status} to ${b.status}`);
  if (a.yieldQty !== b.yieldQty || a.yieldUnit !== b.yieldUnit)
    out.push(`Yield changed from ${a.yieldQty} ${a.yieldUnit} to ${b.yieldQty} ${b.yieldUnit}`);
  if (a.portion !== b.portion) out.push(`Portion changed to “${b.portion}”`);
  if (a.prepMinutes !== b.prepMinutes) out.push(`Prep time changed from ${minutes(a.prepMinutes)} to ${minutes(b.prepMinutes)}`);
  if (a.cookMinutes !== b.cookMinutes) out.push(`Cook time changed from ${minutes(a.cookMinutes)} to ${minutes(b.cookMinutes)}`);
  if (a.shelfLifeDays !== b.shelfLifeDays) out.push(`Shelf life changed from ${a.shelfLifeDays} to ${b.shelfLifeDays} days`);
  if (a.allergens.join() !== b.allergens.join()) out.push(`Allergens set to ${b.allergens.join(', ') || 'none'}`);
  if (a.storage !== b.storage) out.push('Storage instructions updated');
  if (a.notes !== b.notes) out.push('Method notes updated');
  return out;
}

type Draft = Omit<RecipeDetails, 'yieldQty' | 'prepMinutes' | 'cookMinutes' | 'shelfLifeDays'> & {
  yieldQty: string; prepMinutes: string; cookMinutes: string; shelfLifeDays: string;
};
const toDraft = (d: RecipeDetails): Draft => ({
  ...d, yieldQty: String(d.yieldQty), prepMinutes: String(d.prepMinutes), cookMinutes: String(d.cookMinutes),
  shelfLifeDays: String(d.shelfLifeDays),
});

function validate(d: Draft): Partial<Record<keyof Draft, string>> {
  const e: Partial<Record<keyof Draft, string>> = {};
  if (!d.name.trim()) e.name = 'Give the recipe a name.';
  const pos = (k: 'yieldQty' | 'prepMinutes' | 'cookMinutes' | 'shelfLifeDays', label: string, allowZero = false) => {
    const n = Number(d[k]);
    if (d[k].trim() === '' || !Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) e[k] = `Enter a ${label}.`;
  };
  pos('yieldQty', 'yield above zero');
  pos('prepMinutes', 'number of minutes', true);
  pos('cookMinutes', 'number of minutes', true);
  pos('shelfLifeDays', 'number of days');
  if (!d.portion.trim()) e.portion = 'Describe one portion.';
  return e;
}

function EditDetailsSheet({ open, onOpenChange, details, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; details: RecipeDetails; onSave: (d: RecipeDetails) => void;
}) {
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(details));
  const [tried, setTried] = React.useState(false);
  React.useEffect(() => { if (open) { setDraft(toDraft(details)); setTried(false); } }, [open, details]);

  const errors = tried ? validate(draft) : {};
  const set = <K extends keyof Draft>(k: K) => (v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const onInput = (k: 'name' | 'yieldQty' | 'yieldUnit' | 'portion' | 'prepMinutes' | 'cookMinutes' | 'shelfLifeDays') =>
    (e: React.ChangeEvent<HTMLInputElement>) => set(k)(e.target.value);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.keys(validate(draft)).length) return;
    onSave({
      ...draft,
      name: draft.name.trim(),
      portion: draft.portion.trim(),
      yieldQty: Number(draft.yieldQty),
      prepMinutes: Number(draft.prepMinutes),
      cookMinutes: Number(draft.cookMinutes),
      shelfLifeDays: Number(draft.shelfLifeDays),
      allergens: ALLERGENS.filter((a) => draft.allergens.includes(a)),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} size="lg" aria-labelledby="edit-title">
      <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
        <SheetHeader>
          <SheetTitle id="edit-title">Edit recipe details</SheetTitle>
          <SheetDescription>{details.code} · Changes are logged under your name.</SheetDescription>
        </SheetHeader>
        <div className="form">
          <Field label="Recipe name" required error={errors.name}>
            <Input value={draft.name} onChange={onInput('name')} />
          </Field>
          <div className="row2">
            <Field label="Station">
              <Select value={draft.station} onValueChange={(v) => set('station')(v as Station)}
                items={STATIONS.map((s) => ({ value: s, label: s }))} />
            </Field>
            <Field label="Status">
              <Select value={draft.status} onValueChange={(v) => set('status')(v as RecipeStatus)}
                items={(Object.keys(STATUS_BADGE) as RecipeStatus[]).map((s) => ({ value: s, label: STATUS_BADGE[s].label }))} />
            </Field>
          </div>
          <div className="row3">
            <Field label="Batch yield" required error={errors.yieldQty}>
              <Input inputMode="decimal" value={draft.yieldQty} onChange={onInput('yieldQty')} />
            </Field>
            <Field label="Unit">
              <Input value={draft.yieldUnit} onChange={onInput('yieldUnit')} />
            </Field>
            <Field label="Shelf life (days)" required error={errors.shelfLifeDays}>
              <Input inputMode="numeric" value={draft.shelfLifeDays} onChange={onInput('shelfLifeDays')} />
            </Field>
          </div>
          <Field label="Portion" required hint="e.g. 60 ml per plate" error={errors.portion}>
            <Input value={draft.portion} onChange={onInput('portion')} />
          </Field>
          <div className="row2">
            <Field label="Prep time (min)" required error={errors.prepMinutes}>
              <Input inputMode="numeric" value={draft.prepMinutes} onChange={onInput('prepMinutes')} />
            </Field>
            <Field label="Cook time (min)" required error={errors.cookMinutes}>
              <Input inputMode="numeric" value={draft.cookMinutes} onChange={onInput('cookMinutes')} />
            </Field>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="group-label">Allergens</legend>
            <div className="checks">
              {ALLERGENS.map((a) => (
                <Checkbox key={a} label={a} checked={draft.allergens.includes(a)}
                  onCheckedChange={(c) => set('allergens')(c ? [...draft.allergens, a] : draft.allergens.filter((x) => x !== a))} />
              ))}
            </div>
          </fieldset>
          <Field label="Storage">
            <Textarea rows={2} value={draft.storage} onChange={(e) => set('storage')(e.target.value)} />
          </Field>
          <Field label="Method notes" hint="What the line needs to know at pickup.">
            <Textarea rows={5} maxLength={600} value={draft.notes} onChange={(e) => set('notes')(e.target.value)} />
          </Field>
        </div>
        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" variant="primary">Save details</Button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}

function DetailsCard({ details, savedAt, onEdit }: { details: RecipeDetails; savedAt: number; onEdit: () => void }) {
  const portions = portionsPerBatch(details);
  return (
    <Card settle={savedAt || undefined}>
      <CardHeader>
        <CardTitle>Details</CardTitle>
        <CardDescription>How this recipe is produced, held and served.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="facts">
          <div><dt>Station</dt><dd>{details.station}</dd></div>
          <div><dt>Batch yield</dt><dd className="num">{details.yieldQty} {details.yieldUnit}</dd></div>
          <div><dt>Portion</dt><dd>{details.portion}</dd></div>
          <div><dt>Portions / batch</dt><dd className="num">{portions ?? '—'}</dd></div>
          <div><dt>Prep</dt><dd>{minutes(details.prepMinutes)}</dd></div>
          <div><dt>Cook</dt><dd>{minutes(details.cookMinutes)}</dd></div>
          <div><dt>Total</dt><dd>{minutes(details.prepMinutes + details.cookMinutes)}</dd></div>
          <div><dt>Shelf life</dt><dd>{details.shelfLifeDays} {details.shelfLifeDays === 1 ? 'day' : 'days'}</dd></div>
        </dl>
        <div className="prose-block">
          <h3>Allergens</h3>
          {details.allergens.length ? (
            <div className="badges">
              {details.allergens.map((a) => <Badge key={a} tone="caution" variant="tinted" lamp={false}>{a}</Badge>)}
            </div>
          ) : <p className="muted">None declared</p>}
        </div>
        <div className="prose-block"><h3>Storage</h3><p>{details.storage || <span className="muted">No storage notes</span>}</p></div>
        <div className="prose-block"><h3>Method notes</h3><p>{details.notes || <span className="muted">No notes</span>}</p></div>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" onClick={onEdit}>Edit details</Button>
      </CardFooter>
    </Card>
  );
}

function IngredientsCard({ portions }: { portions: number | null }) {
  const total = ingredients.reduce((s, i) => s + i.unitCost, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingredients</CardTitle>
        <CardDescription>{ingredients.length} items for one batch, costed at current supplier prices.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table aria-label="Ingredients">
          <TableHeader>
            <TableRow>
              <TableHead>Ingredient</TableHead>
              <TableHead align="end">Qty</TableHead>
              <TableHead>Prep</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead align="end">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.map((i) => (
              <TableRow key={i.id} rowId={i.id}>
                <TableCell>{i.name}</TableCell>
                <TableCell align="end" className="num">{i.qty} {i.unit}</TableCell>
                <TableCell className={i.prep ? undefined : 'faint'}>{i.prep || '—'}</TableCell>
                <TableCell className="muted">{i.supplier}</TableCell>
                <TableCell align="end" className="num">{money.format(i.unitCost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>Batch cost{portions ? ` · ${money.format(total / portions)} per portion` : ''}</TableCell>
              <TableCell align="end" className="num"><strong>{money.format(total)}</strong></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

function ChangesCard({ changes }: { changes: Change[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent changes</CardTitle>
        <CardDescription>Newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="changes">
          {changes.map((c) => (
            <li key={c.id} className="change">
              <Avatar name={c.who} size={28} />
              <div>
                <div className="change-summary">{c.summary}</div>
                {c.detail && <div className="change-detail">{c.detail}</div>}
                <div className="change-meta">
                  {c.who} · {c.role} · <time dateTime={c.when}>{dateFmt.format(new Date(c.when))}</time>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function RecipePage() {
  const [details, setDetails] = React.useState(initialDetails);
  const [changes, setChanges] = React.useState(initialChanges);
  const [editing, setEditing] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(0);

  const save = (next: RecipeDetails) => {
    const diffs = describeChanges(details, next);
    setEditing(false);
    if (!diffs.length) { toast('No changes to save'); return; }
    setDetails(next);
    setSavedAt(Date.now());
    setChanges((cs) => [{
      id: `c${Date.now()}`,
      who: CURRENT_USER.name,
      role: CURRENT_USER.role,
      when: new Date().toISOString(),
      summary: diffs[0],
      detail: diffs.length > 1 ? diffs.slice(1).join('. ') + '.' : undefined,
    }, ...cs]);
    toast({ title: 'Recipe details saved', description: diffs.length === 1 ? diffs[0] : `${diffs.length} fields updated`, tone: 'positive' });
  };

  const status = STATUS_BADGE[details.status];
  const portions = portionsPerBatch(details);

  return (
    <main className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#">Recipe book</a><span aria-hidden>/</span>
        <a href="#">{details.station}</a><span aria-hidden>/</span>
        <span aria-current="page">{details.name}</span>
      </nav>
      <header className="head">
        <div>
          <h1>{details.name}</h1>
          <div className="head-meta">
            <span className="mono">{details.code}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
            <span>Last changed {dateFmt.format(new Date(changes[0].when))} by {changes[0].who}</span>
          </div>
        </div>
        <Button variant="primary" onClick={() => setEditing(true)}>Edit details</Button>
      </header>

      <div className="layout">
        <div className="stack">
          <DetailsCard details={details} savedAt={savedAt} onEdit={() => setEditing(true)} />
          <IngredientsCard portions={portions} />
        </div>
        <ChangesCard changes={changes} />
      </div>

      <EditDetailsSheet open={editing} onOpenChange={setEditing} details={details} onSave={save} />
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight"><RecipePage /></AltitudeProvider>,
);
