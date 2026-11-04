// Sample data for one recipe in the Saltmarsh Kitchen recipe book. There is no backend:
// `recipeService` below stands in for one, in memory, so the page can show real save states.

export type RecipeStatus = 'in-service' | 'testing' | 'retired';

export interface RecipeDetails extends Record<string, unknown> {
  name: string;
  station: string;
  yieldPortions: string;
  activeMinutes: string;
  status: string; // a RecipeStatus; typed as string to match Select's onValueChange
}

export interface Ingredient {
  id: string;
  component: string;
  name: string;
  quantity: number;
  unit: string;
  prep: string;
  allergen?: string;
}

export interface ChangeEvent {
  id: string;
  at: Date;
  actor: string;
  kind: 'details' | 'ingredient' | 'method' | 'status';
  sentence: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export const STATIONS = [
  { value: 'braise', label: 'Braise and roast' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'garde-manger', label: 'Garde manger' },
  { value: 'pastry', label: 'Pastry' },
];

export const STATUSES: { value: RecipeStatus; label: string }[] = [
  { value: 'in-service', label: 'In service' },
  { value: 'testing', label: 'In testing' },
  { value: 'retired', label: 'Retired' },
];

export const stationLabel = (v: string) => STATIONS.find(s => s.value === v)?.label ?? v;
export const statusLabel = (v: string) => STATUSES.find(s => s.value === v)?.label ?? v;

export const formatMinutes = (raw: string) => {
  const m = Number(raw);
  if (!Number.isFinite(m)) return raw;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (!h) return `${rest} min`;
  return rest ? `${h} h ${rest} min` : `${h} h`;
};

export const RECIPE_META = {
  code: 'MN-014',
  owner: 'Ama Boateng, head chef',
  menu: 'Winter dinner menu',
  braiseTime: '3 h 30 min at 150 °C',
  holding: 'Up to 3 days chilled, in braising liquor',
};

export const INITIAL_DETAILS: RecipeDetails = {
  name: 'Braised short rib, celeriac and pickled shallot',
  station: 'braise',
  yieldPortions: '12',
  activeMinutes: '75',
  status: 'in-service',
};

export const INGREDIENTS: Ingredient[] = [
  { id: 'i1', component: 'Short rib', name: 'Beef short rib, bone in', quantity: 4.2, unit: 'kg', prep: 'Trimmed, cut into 350 g pieces' },
  { id: 'i2', component: 'Short rib', name: 'Red wine (Côtes du Rhône)', quantity: 750, unit: 'ml', prep: 'Reduced by half', allergen: 'Sulphites' },
  { id: 'i3', component: 'Short rib', name: 'Brown veal stock', quantity: 2, unit: 'l', prep: 'House batch', allergen: 'Celery' },
  { id: 'i4', component: 'Short rib', name: 'Mirepoix', quantity: 600, unit: 'g', prep: 'Rough cut, roasted', allergen: 'Celery' },
  { id: 'i5', component: 'Short rib', name: 'Thyme and bay', quantity: 1, unit: 'bunch', prep: 'Tied' },
  { id: 'i6', component: 'Celeriac purée', name: 'Celeriac', quantity: 1.8, unit: 'kg', prep: 'Peeled, 2 cm dice', allergen: 'Celery' },
  { id: 'i7', component: 'Celeriac purée', name: 'Whole milk', quantity: 500, unit: 'ml', prep: '', allergen: 'Milk' },
  { id: 'i8', component: 'Celeriac purée', name: 'Unsalted butter', quantity: 150, unit: 'g', prep: 'Cold, cubed', allergen: 'Milk' },
  { id: 'i9', component: 'Pickled shallot', name: 'Banana shallots', quantity: 400, unit: 'g', prep: 'Sliced into 2 mm rings' },
  { id: 'i10', component: 'Pickled shallot', name: 'Cider vinegar', quantity: 200, unit: 'ml', prep: '', allergen: 'Sulphites' },
  { id: 'i11', component: 'Pickled shallot', name: 'Caster sugar', quantity: 80, unit: 'g', prep: '' },
  { id: 'i12', component: 'Pickled shallot', name: 'Wholegrain mustard', quantity: 30, unit: 'g', prep: 'Stirred in once cool', allergen: 'Mustard' },
];

export const METHOD = [
  'Season the short rib the day before and leave uncovered in the walk-in overnight.',
  'Sear hard on all sides in batches; roast the mirepoix in the same tray.',
  'Deglaze with the reduced wine, add stock and herbs, cover and braise for 3 h 30 min at 150 °C.',
  'Cool in the liquor, then lift, portion and strain the liquor; reduce it to a glaze for service.',
  'Simmer the celeriac in milk until tender, blend with the butter and pass through a fine sieve.',
  'Bring vinegar, sugar and 100 ml water to the boil, pour over the shallots and cool before adding the mustard.',
];

const daysAgo = (d: number, h: number, m = 0) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, m, 0, 0);
  return t;
};

export const INITIAL_CHANGES: ChangeEvent[] = [
  {
    id: 'c5', at: daysAgo(1, 15, 40), actor: 'Ama Boateng', kind: 'details',
    sentence: 'changed the yield from 10 to 12 portions',
    before: { yieldPortions: '10 portions' }, after: { yieldPortions: '12 portions' },
  },
  {
    id: 'c4', at: daysAgo(1, 15, 32), actor: 'Ama Boateng', kind: 'ingredient',
    sentence: 'raised the short rib from 3.5 kg to 4.2 kg',
    before: { quantity: '3.5 kg' }, after: { quantity: '4.2 kg' },
  },
  {
    id: 'c3', at: daysAgo(4, 10, 5), actor: 'Rafael Mendes', kind: 'ingredient',
    sentence: 'added wholegrain mustard to the pickled shallot',
    before: { allergens: 'Celery, Milk, Sulphites' }, after: { allergens: 'Celery, Milk, Mustard, Sulphites' },
  },
  {
    id: 'c2', at: daysAgo(9, 16, 20), actor: 'Ama Boateng', kind: 'status',
    sentence: 'moved the recipe from In testing to In service',
    before: { status: 'In testing' }, after: { status: 'In service' },
  },
  {
    id: 'c1', at: daysAgo(12, 11, 0), actor: 'Jun Watanabe', kind: 'method',
    sentence: 'lowered the braise from 160 °C to 150 °C and added 30 minutes',
    before: { braise: '3 h at 160 °C' }, after: { braise: '3 h 30 min at 150 °C' },
  },
];

// In-memory stand-in for the kitchen's recipe service, with a revision guard.
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let stored: { details: RecipeDetails; revision: number } = { details: { ...INITIAL_DETAILS }, revision: 7 };

export const recipeService = {
  revision: () => stored.revision,
  async saveDetails(draft: RecipeDetails, expectedRevision: number):
    Promise<{ ok: true; details: RecipeDetails; revision: number } | { ok: false; error: string }> {
    await wait(600);
    if (expectedRevision !== stored.revision) {
      return { ok: false, error: 'Someone else changed this recipe. Reload it to see their changes.' };
    }
    const details: RecipeDetails = {
      ...draft,
      name: draft.name.trim(),
      yieldPortions: String(Number(draft.yieldPortions)),
      activeMinutes: String(Number(draft.activeMinutes)),
    };
    stored = { details, revision: stored.revision + 1 };
    return { ok: true, details, revision: stored.revision };
  },
};
