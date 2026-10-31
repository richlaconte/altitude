// Sample data for the recipe page. There is no backend: recipe-service.ts keeps this in memory.

export type Station = 'grill' | 'sauce' | 'garde-manger' | 'pastry' | 'larder';

export interface RecipeDetails {
  name: string;
  station: Station;
  yieldPortions: number;
  prepMinutes: number;
  cookMinutes: number;
  shelfLifeDays: number;
  allergens: string;
  holding: string;
}

export interface Ingredient {
  id: string;
  quantity: string;
  unit: string;
  item: string;
  prep?: string;
}

export interface IngredientGroup {
  id: string;
  title: string;
  ingredients: Ingredient[];
}

export interface RecipeChange {
  id: string;
  time: string;
  actor: string;
  before: Partial<RecipeDetails>;
  after: Partial<RecipeDetails>;
}

export const STATIONS: { value: Station; label: string }[] = [
  { value: 'grill', label: 'Grill' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'garde-manger', label: 'Garde manger' },
  { value: 'pastry', label: 'Pastry' },
  { value: 'larder', label: 'Larder' },
];

export const stationLabel = (station: Station) => STATIONS.find(s => s.value === station)?.label ?? station;

export function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const DETAIL_LABELS: Record<keyof RecipeDetails, string> = {
  name: 'Name',
  station: 'Station',
  yieldPortions: 'Yield',
  prepMinutes: 'Prep time',
  cookMinutes: 'Cook time',
  shelfLifeDays: 'Shelf life',
  allergens: 'Allergens',
  holding: 'Holding and service',
};

export function formatDetail(key: keyof RecipeDetails, value: unknown): string {
  switch (key) {
    case 'station': return stationLabel(value as Station);
    case 'yieldPortions': return `${value} portions`;
    case 'prepMinutes':
    case 'cookMinutes': return duration(value as number);
    case 'shelfLifeDays': return `${value} ${value === 1 ? 'day' : 'days'}`;
    default: return String(value ?? '');
  }
}

export const CURRENT_USER = 'Amara Okafor';

export const RECIPE_ID = 'MAIN-014';

export const INITIAL_DETAILS: RecipeDetails = {
  name: 'Braised beef short rib',
  station: 'grill',
  yieldPortions: 12,
  prepMinutes: 45,
  cookMinutes: 240,
  shelfLifeDays: 3,
  allergens: 'Celery, sulphites, milk',
  holding: 'Hold portioned ribs in jus at 63 °C or above for up to 2 hours. Glaze under the salamander to order; finish with 40 ml jus and gremolata.',
};

export const INGREDIENT_GROUPS: IngredientGroup[] = [
  {
    id: 'braise',
    title: 'Braise',
    ingredients: [
      { id: 'i1', quantity: '4.8', unit: 'kg', item: 'Beef short rib, bone in', prep: 'Cut into 12 × 400 g portions' },
      { id: 'i2', quantity: '30', unit: 'g', item: 'Fine sea salt', prep: 'Season 12 hours ahead' },
      { id: 'i3', quantity: '60', unit: 'ml', item: 'Rapeseed oil' },
      { id: 'i4', quantity: '400', unit: 'g', item: 'Onion', prep: 'Rough chop' },
      { id: 'i5', quantity: '300', unit: 'g', item: 'Carrot', prep: 'Rough chop' },
      { id: 'i6', quantity: '200', unit: 'g', item: 'Celery', prep: 'Rough chop' },
      { id: 'i7', quantity: '1', unit: 'head', item: 'Garlic', prep: 'Halved across' },
      { id: 'i8', quantity: '60', unit: 'g', item: 'Tomato purée' },
      { id: 'i9', quantity: '750', unit: 'ml', item: 'Red wine (Côtes du Rhône)' },
      { id: 'i10', quantity: '2', unit: 'l', item: 'Brown veal stock' },
      { id: 'i11', quantity: '6', unit: 'sprigs', item: 'Thyme' },
      { id: 'i12', quantity: '3', unit: '', item: 'Bay leaves' },
    ],
  },
  {
    id: 'puree',
    title: 'Celeriac purée',
    ingredients: [
      { id: 'i13', quantity: '1.5', unit: 'kg', item: 'Celeriac', prep: 'Peeled, 2 cm dice' },
      { id: 'i14', quantity: '500', unit: 'ml', item: 'Whole milk' },
      { id: 'i15', quantity: '150', unit: 'g', item: 'Unsalted butter', prep: 'Cold, cubed' },
      { id: 'i16', quantity: '8', unit: 'g', item: 'Fine sea salt' },
    ],
  },
  {
    id: 'gremolata',
    title: 'Gremolata',
    ingredients: [
      { id: 'i17', quantity: '30', unit: 'g', item: 'Flat-leaf parsley', prep: 'Picked, finely chopped' },
      { id: 'i18', quantity: '2', unit: '', item: 'Unwaxed lemons', prep: 'Zest only' },
      { id: 'i19', quantity: '1', unit: 'clove', item: 'Garlic', prep: 'Microplaned' },
    ],
  },
];

export const INITIAL_CHANGES: RecipeChange[] = [
  {
    id: 'c4', time: '2026-10-29T16:42:00Z', actor: 'Hannah Wright',
    before: { yieldPortions: 10 }, after: { yieldPortions: 12 },
  },
  {
    id: 'c3', time: '2026-10-27T10:15:00Z', actor: 'Luis Ferreira',
    before: { allergens: 'Sulphites, milk' }, after: { allergens: 'Celery, sulphites, milk' },
  },
  {
    id: 'c2', time: '2026-10-21T14:03:00Z', actor: 'Hannah Wright',
    before: { cookMinutes: 210, shelfLifeDays: 4 }, after: { cookMinutes: 240, shelfLifeDays: 3 },
  },
  {
    id: 'c1', time: '2026-10-14T09:30:00Z', actor: 'Amara Okafor',
    before: { holding: 'Hold portioned ribs in jus at 63 °C or above for up to 2 hours.' },
    after: { holding: INITIAL_DETAILS.holding },
  },
];
