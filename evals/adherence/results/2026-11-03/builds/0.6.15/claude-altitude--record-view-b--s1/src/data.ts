// Sample data for one recipe in the Halyard Street kitchen's recipe book. There is no backend:
// `saveRecipeDetails` below stands in for the application's recipe service.

export type Section = 'starters' | 'mains' | 'sides' | 'desserts';
export type Station = 'grill' | 'saute' | 'garde-manger' | 'pastry';

export interface RecipeDetails extends Record<string, unknown> {
  name: string;
  section: Section;
  station: Station;
  batchYield: string; // portions, kept as text while editing
  holdTime: string;
}

export const SECTIONS: { value: Section; label: string }[] = [
  { value: 'starters', label: 'Starters' },
  { value: 'mains', label: 'Mains' },
  { value: 'sides', label: 'Sides' },
  { value: 'desserts', label: 'Desserts' },
];

export const STATIONS: { value: Station; label: string }[] = [
  { value: 'grill', label: 'Grill' },
  { value: 'saute', label: 'Sauté' },
  { value: 'garde-manger', label: 'Garde manger' },
  { value: 'pastry', label: 'Pastry' },
];

export const labelOf = <V extends string>(list: { value: V; label: string }[], v: V) =>
  list.find((o) => o.value === v)?.label ?? v;

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  prep: string;
}

export interface Component {
  id: string;
  name: string;
  ingredients: Ingredient[];
}

export const COMPONENTS: Component[] = [
  {
    id: 'braise',
    name: 'Short rib and braise',
    ingredients: [
      { id: 'i1', name: 'Bone-in beef short rib', quantity: '4.8', unit: 'kg', prep: 'Cut into 400 g portions, trimmed' },
      { id: 'i2', name: 'Fine sea salt', quantity: '48', unit: 'g', prep: 'Dry brine 24 h ahead' },
      { id: 'i3', name: 'Rapeseed oil', quantity: '60', unit: 'ml', prep: 'For searing' },
      { id: 'i4', name: 'Onion', quantity: '600', unit: 'g', prep: 'Rough dice' },
      { id: 'i5', name: 'Carrot', quantity: '400', unit: 'g', prep: 'Rough dice' },
      { id: 'i6', name: 'Celery', quantity: '250', unit: 'g', prep: 'Rough dice' },
      { id: 'i7', name: 'Tomato purée', quantity: '80', unit: 'g', prep: 'Cooked out until rust-coloured' },
      { id: 'i8', name: 'Red wine (house Côtes du Rhône)', quantity: '1.5', unit: 'l', prep: 'Reduced by half' },
      { id: 'i9', name: 'Brown veal stock', quantity: '3', unit: 'l', prep: 'From the Tuesday batch' },
      { id: 'i10', name: 'Thyme', quantity: '10', unit: 'sprigs', prep: 'Tied with bay' },
      { id: 'i11', name: 'Bay leaf', quantity: '4', unit: 'leaves', prep: '' },
    ],
  },
  {
    id: 'puree',
    name: 'Celeriac purée',
    ingredients: [
      { id: 'i12', name: 'Celeriac', quantity: '2', unit: 'kg', prep: 'Peeled, 2 cm dice' },
      { id: 'i13', name: 'Whole milk', quantity: '1', unit: 'l', prep: '' },
      { id: 'i14', name: 'Unsalted butter', quantity: '200', unit: 'g', prep: 'Cold, cubed' },
      { id: 'i15', name: 'Fine sea salt', quantity: '12', unit: 'g', prep: 'Adjust to taste' },
    ],
  },
  {
    id: 'shallot',
    name: 'Pickled shallot',
    ingredients: [
      { id: 'i16', name: 'Banana shallot', quantity: '300', unit: 'g', prep: 'Sliced into 2 mm rings' },
      { id: 'i17', name: 'Cabernet Sauvignon vinegar', quantity: '200', unit: 'ml', prep: '' },
      { id: 'i18', name: 'Caster sugar', quantity: '60', unit: 'g', prep: '' },
      { id: 'i19', name: 'Water', quantity: '100', unit: 'ml', prep: '' },
    ],
  },
];

export const ALLERGENS = ['Celery', 'Milk', 'Sulphites'];

export type ChangeKind = 'details' | 'ingredients' | 'method' | 'created';

export interface Change {
  id: string;
  at: string;
  who: string;
  kind: ChangeKind;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  status?: 'committed';
}

export const CHANGES: Change[] = [
  {
    id: 'c5', at: '2026-11-02T15:40:00', who: 'Priya Raman', kind: 'ingredients',
    summary: 'swapped the red wine to the house Côtes du Rhône',
    before: { Wine: 'Merlot, 1.5 l' }, after: { Wine: 'Côtes du Rhône, 1.5 l' },
  },
  {
    id: 'c4', at: '2026-10-30T10:15:00', who: 'Tomasz Wiśniewski', kind: 'details',
    summary: 'changed the batch yield',
    before: { 'Batch yield': '10 portions' }, after: { 'Batch yield': '12 portions' },
  },
  {
    id: 'c3', at: '2026-10-28T17:05:00', who: 'Priya Raman', kind: 'ingredients',
    summary: 'added pickled shallot to cut the richness',
  },
  {
    id: 'c2', at: '2026-10-21T09:30:00', who: 'Aoife Byrne', kind: 'details',
    summary: 'moved the dish from the sauté station to the grill',
    before: { Station: 'Sauté' }, after: { Station: 'Grill' },
  },
  {
    id: 'c1', at: '2026-10-14T11:00:00', who: 'Tomasz Wiśniewski', kind: 'created',
    summary: 'added this recipe to the book',
  },
];

export const INITIAL_DETAILS: RecipeDetails = {
  name: 'Braised short rib with celeriac and pickled shallot',
  section: 'mains',
  station: 'grill',
  batchYield: '12',
  holdTime: '3 days chilled, braised in its liquor',
};

// The stand-in recipe service. It keeps a revision so a stale write is refused, and returns the canonical record.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let server = { revision: 7, details: { ...INITIAL_DETAILS } };

export async function saveRecipeDetails(draft: RecipeDetails, expectedRevision: number) {
  await wait(450);
  if (expectedRevision !== server.revision) {
    return { ok: false as const, error: 'Someone else changed this recipe. Review the current details, then save again.' };
  }
  const details: RecipeDetails = {
    ...draft,
    name: draft.name.trim(),
    batchYield: String(Number(draft.batchYield.trim())),
    holdTime: draft.holdTime.trim(),
  };
  server = { revision: server.revision + 1, details };
  return { ok: true as const, value: details, revision: server.revision };
}
