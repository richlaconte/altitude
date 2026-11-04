import * as React from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
  useDepth,
} from 'altitude-design';
import {
  Change,
  LAST_COSTED,
  RECIPE_CODE,
  RecipeDetails,
  STATIONS,
  STATUSES,
  initialChanges,
  initialDetails,
  ingredients,
} from './data';

const CURRENT_USER = { name: 'Dev Patel', role: 'Sous chef' };

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateTime = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dateOnly = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const stationLabel = (v: string) => STATIONS.find((s) => s.value === v)?.label ?? v;
const statusLabel = (v: string) => STATUSES.find((s) => s.value === v)?.label ?? v;
const statusTone = { active: 'positive', testing: 'caution', retired: 'neutral' } as const;

function minutes(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

const FIELD_LABELS: Record<keyof RecipeDetails, string> = {
  name: 'Name',
  station: 'Station',
  status: 'Status',
  yieldPortions: 'Yield',
  portionSize: 'Portion size',
  prepMinutes: 'Prep time',
  cookMinutes: 'Cook time',
  holding: 'Holding',
  allergens: 'Allergens',
  method: 'Method',
  plating: 'Plating',
};

function describe(key: keyof RecipeDetails, v: RecipeDetails[keyof RecipeDetails]) {
  if (key === 'station') return stationLabel(String(v));
  if (key === 'status') return statusLabel(String(v));
  if (key === 'yieldPortions') return `${v} portions`;
  if (key === 'prepMinutes' || key === 'cookMinutes') return minutes(Number(v));
  return String(v);
}

/* ---------- Edit sheet ---------- */

type Draft = Record<keyof RecipeDetails, string>;

const toDraft = (d: RecipeDetails): Draft =>
  Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v)])) as Draft;

function validate(d: Draft) {
  const e: Partial<Record<keyof RecipeDetails, string>> = {};
  if (!d.name.trim()) e.name = 'Give the recipe a name.';
  const y = Number(d.yieldPortions);
  if (!Number.isInteger(y) || y < 1) e.yieldPortions = 'Enter a whole number of portions, 1 or more.';
  for (const k of ['prepMinutes', 'cookMinutes'] as const) {
    const n = Number(d[k]);
    if (d[k].trim() === '' || !Number.isInteger(n) || n < 0) e[k] = 'Enter whole minutes, 0 or more.';
  }
  if (!d.portionSize.trim()) e.portionSize = 'Say how big one portion is.';
  return e;
}

function EditDetailsSheet({
  open,
  onOpenChange,
  details,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  details: RecipeDetails;
  onSave: (next: RecipeDetails) => void;
}) {
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(details));
  const [showErrors, setShowErrors] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDraft(toDraft(details));
      setShowErrors(false);
      setSaving(false);
    }
  }, [open, details]);

  const errors = validate(draft);
  const err = (k: keyof RecipeDetails) => (showErrors ? errors[k] : undefined);
  const set = (k: keyof RecipeDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(errors).length) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    // No backend: a short delay stands in for the save request.
    window.setTimeout(() => {
      onSave({
        ...details,
        name: draft.name.trim(),
        station: draft.station as RecipeDetails['station'],
        status: draft.status as RecipeDetails['status'],
        yieldPortions: Number(draft.yieldPortions),
        portionSize: draft.portionSize.trim(),
        prepMinutes: Number(draft.prepMinutes),
        cookMinutes: Number(draft.cookMinutes),
        holding: draft.holding.trim(),
        allergens: draft.allergens.trim(),
        method: draft.method.trim(),
        plating: draft.plating.trim(),
      });
    }, 500);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} size="lg" aria-label="Edit recipe details">
      <form className="sheet-form" onSubmit={submit} noValidate>
        <SheetHeader>
          <SheetTitle>Edit details</SheetTitle>
          <SheetDescription>
            {RECIPE_CODE} · Changes are logged under your name in Recent changes.
          </SheetDescription>
        </SheetHeader>
        <div className="sheet-body">
          <Field label="Name" required error={err('name')}>
            <Input value={draft.name} onChange={set('name')} />
          </Field>
          <div className="form-row">
            <Field label="Station">
              <Select
                items={STATIONS}
                value={draft.station}
                onValueChange={(v) => setDraft((d) => ({ ...d, station: v }))}
              />
            </Field>
            <Field label="Status">
              <Select
                items={STATUSES}
                value={draft.status}
                onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Yield" hint="Portions per batch" required error={err('yieldPortions')}>
              <Input inputMode="numeric" value={draft.yieldPortions} onChange={set('yieldPortions')} />
            </Field>
            <Field label="Portion size" required error={err('portionSize')}>
              <Input value={draft.portionSize} onChange={set('portionSize')} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Prep time" hint="Minutes" error={err('prepMinutes')}>
              <Input inputMode="numeric" value={draft.prepMinutes} onChange={set('prepMinutes')} />
            </Field>
            <Field label="Cook time" hint="Minutes" error={err('cookMinutes')}>
              <Input inputMode="numeric" value={draft.cookMinutes} onChange={set('cookMinutes')} />
            </Field>
          </div>
          <Field label="Allergens" hint="Comma-separated, as printed on the allergen matrix">
            <Input value={draft.allergens} onChange={set('allergens')} />
          </Field>
          <Field label="Holding">
            <Input value={draft.holding} onChange={set('holding')} />
          </Field>
          <Field label="Method">
            <Textarea rows={6} value={draft.method} onChange={set('method')} maxLength={1200} />
          </Field>
          <Field label="Plating">
            <Textarea rows={3} value={draft.plating} onChange={set('plating')} maxLength={400} />
          </Field>
        </div>
        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Save changes
          </Button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}

/* ---------- Page sections ---------- */

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function DetailsCard({ details, version }: { details: RecipeDetails; version: number }) {
  return (
    <Card settle={version || undefined}>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="facts">
          <Fact label="Yield">{details.yieldPortions} portions</Fact>
          <Fact label="Portion size">{details.portionSize}</Fact>
          <Fact label="Prep time">{minutes(details.prepMinutes)}</Fact>
          <Fact label="Cook time">{minutes(details.cookMinutes)}</Fact>
          <Fact label="Station">{stationLabel(details.station)}</Fact>
          <Fact label="Allergens">
            {details.allergens ? (
              <span className="badges">
                {details.allergens
                  .split(',')
                  .map((a) => a.trim())
                  .filter(Boolean)
                  .map((a) => (
                    <Badge key={a} tone="caution" variant="outline" lamp={false}>
                      {a}
                    </Badge>
                  ))}
              </span>
            ) : (
              <span className="muted">None declared</span>
            )}
          </Fact>
          <Fact label="Holding">{details.holding || <span className="muted">Not set</span>}</Fact>
        </dl>
        <div className="prose">
          <h3>Method</h3>
          <p>{details.method || <span className="muted">No method written yet.</span>}</p>
          <h3>Plating</h3>
          <p>{details.plating || <span className="muted">No plating notes yet.</span>}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IngredientsCard({ portions }: { portions: number }) {
  const total = ingredients.reduce((s, i) => s + i.costPerBatch, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingredients</CardTitle>
        <CardDescription>
          {ingredients.length} items · one batch · costed {dateOnly.format(new Date(LAST_COSTED + 'T12:00:00'))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table aria-label="Ingredients for one batch">
          <TableHeader>
            <TableRow>
              <TableHead align="end">Qty</TableHead>
              <TableHead>Ingredient</TableHead>
              <TableHead>Prep</TableHead>
              <TableHead>Source</TableHead>
              <TableHead align="end">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.map((i) => (
              <TableRow key={i.id} rowId={i.id}>
                <TableCell align="end" className="num">
                  {i.qty} {i.unit}
                </TableCell>
                <TableCell>{i.name}</TableCell>
                <TableCell className="muted">{i.prep || '—'}</TableCell>
                <TableCell className="muted">{i.supplier}</TableCell>
                <TableCell align="end" className="num">
                  {money.format(i.costPerBatch)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>Batch cost</TableCell>
              <TableCell align="end" className="num">
                {money.format(total)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4}>Per portion ({portions} portions)</TableCell>
              <TableCell align="end" className="num">
                {money.format(total / portions)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

const KIND_LABEL: Record<Change['kind'], string> = {
  details: 'Details',
  ingredients: 'Ingredients',
  method: 'Method',
  status: 'Status',
};

function ChangeItem({ change, fresh }: { change: Change; fresh: boolean }) {
  const depth = useDepth({ settle: fresh ? true : undefined });
  return (
    <li className="change" {...depth}>
      <Avatar name={change.who} size={32} />
      <div className="change-body">
        <div className="change-meta">
          <strong>{change.who}</strong>
          <span className="muted">{change.role}</span>
        </div>
        <p className="change-summary">{change.summary}</p>
        {change.detail && <p className="change-detail muted">{change.detail}</p>}
        <div className="change-foot">
          <Badge variant="outline">{KIND_LABEL[change.kind]}</Badge>
          <time dateTime={change.at} className="muted">
            {dateTime.format(new Date(change.at))}
          </time>
        </div>
      </div>
    </li>
  );
}

function ChangesCard({ changes, freshIds }: { changes: Change[]; freshIds: Set<string> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent changes</CardTitle>
        <CardDescription>Newest first</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="changes" aria-label="Recent changes">
          {changes.map((c) => (
            <ChangeItem key={c.id} change={c} fresh={freshIds.has(c.id)} />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/* ---------- Page ---------- */

export function RecipePage() {
  const [details, setDetails] = React.useState(initialDetails);
  const [changes, setChanges] = React.useState(initialChanges);
  const [freshIds, setFreshIds] = React.useState<Set<string>>(new Set());
  const [version, setVersion] = React.useState(0);
  const [editing, setEditing] = React.useState(false);

  function save(next: RecipeDetails) {
    const changed = (Object.keys(FIELD_LABELS) as (keyof RecipeDetails)[]).filter((k) => next[k] !== details[k]);
    setEditing(false);
    if (!changed.length) {
      toast({ title: 'No changes to save' });
      return;
    }
    const short = changed.filter((k) => k !== 'method' && k !== 'plating' && k !== 'name');
    const id = `c${Date.now()}`;
    const entry: Change = {
      id,
      who: CURRENT_USER.name,
      role: CURRENT_USER.role,
      at: new Date().toISOString(),
      kind: changed.length === 1 && changed[0] === 'status' ? 'status' : changed.every((k) => k === 'method' || k === 'plating') ? 'method' : 'details',
      summary:
        changed.length === 1
          ? `Changed ${FIELD_LABELS[changed[0]].toLowerCase()}`
          : `Changed ${changed.map((k) => FIELD_LABELS[k].toLowerCase()).join(', ')}`,
      detail: short.length
        ? short.map((k) => `${FIELD_LABELS[k]}: ${describe(k, details[k])} → ${describe(k, next[k])}`).join('. ') + '.'
        : undefined,
    };
    setDetails(next);
    setChanges((cs) => [entry, ...cs]);
    setFreshIds((s) => new Set(s).add(id));
    setVersion((v) => v + 1);
    toast({ title: 'Recipe updated', description: entry.summary, tone: 'positive' });
  }

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#">Recipe book</a>
        <span aria-hidden>/</span>
        <a href="#">{stationLabel(details.station)}</a>
        <span aria-hidden>/</span>
        <span aria-current="page">{RECIPE_CODE}</span>
      </nav>

      <header className="page-head">
        <div>
          <h1>{details.name}</h1>
          <div className="badges">
            <Badge tone={statusTone[details.status]}>{statusLabel(details.status)}</Badge>
            <Badge>{stationLabel(details.station)}</Badge>
            <span className="muted code">{RECIPE_CODE}</span>
          </div>
        </div>
        <Button variant="primary" onClick={() => setEditing(true)}>
          Edit details
        </Button>
      </header>

      <div className="layout">
        <div className="main-col">
          <DetailsCard details={details} version={version} />
          <IngredientsCard portions={details.yieldPortions} />
        </div>
        <aside className="side-col">
          <ChangesCard changes={changes} freshIds={freshIds} />
        </aside>
      </div>

      <EditDetailsSheet open={editing} onOpenChange={setEditing} details={details} onSave={save} />
    </div>
  );
}

