export type Station = 'Sauce' | 'Grill' | 'Garde manger' | 'Pastry' | 'Fry';
export const STATIONS: Station[] = ['Sauce', 'Grill', 'Garde manger', 'Pastry', 'Fry'];

export type RecipeStatus = 'active' | 'testing' | 'retired';

export interface RecipeDetails {
  name: string;
  code: string;
  station: Station;
  status: RecipeStatus;
  yieldQty: number;
  yieldUnit: string;
  portion: string;
  prepMinutes: number;
  cookMinutes: number;
  shelfLifeDays: number;
  storage: string;
  allergens: string[];
  notes: string;
}

export interface Ingredient {
  id: string;
  name: string;
  qty: number;
  unit: string;
  prep: string;
  supplier: string;
  unitCost: number; // cost for the quantity used
}

export interface Change {
  id: string;
  who: string;
  role: string;
  when: string; // ISO
  summary: string;
  detail?: string;
}

export const initialDetails: RecipeDetails = {
  name: 'Brown Butter Sage Velouté',
  code: 'SAU-014',
  station: 'Sauce',
  status: 'active',
  yieldQty: 4,
  yieldUnit: 'L',
  portion: '60 ml per plate',
  prepMinutes: 25,
  cookMinutes: 50,
  shelfLifeDays: 3,
  storage: 'Cool to 5 °C within 90 min. Store in 2 L deli tubs, labelled, on the low-boy shelf 2.',
  allergens: ['Dairy', 'Gluten'],
  notes:
    'Brown the butter to hazelnut, not past. Strain twice through a chinois. Hold at 68 °C in the bain-marie; whisk before each pickup. Finish each order with a few drops of sage oil.',
};

export const ingredients: Ingredient[] = [
  { id: 'i1', name: 'Unsalted butter', qty: 250, unit: 'g', prep: 'Cubed, cold', supplier: 'Hollow Creek Dairy', unitCost: 3.4 },
  { id: 'i2', name: 'All-purpose flour', qty: 220, unit: 'g', prep: 'Sifted', supplier: 'Sysco', unitCost: 0.31 },
  { id: 'i3', name: 'Chicken stock', qty: 3.2, unit: 'L', prep: 'House, hot', supplier: 'In-house (SAU-002)', unitCost: 5.12 },
  { id: 'i4', name: 'Heavy cream (36%)', qty: 500, unit: 'ml', prep: '', supplier: 'Hollow Creek Dairy', unitCost: 2.95 },
  { id: 'i5', name: 'Fresh sage', qty: 30, unit: 'g', prep: 'Leaves picked, stems reserved', supplier: 'Greenleaf Produce', unitCost: 2.1 },
  { id: 'i6', name: 'Shallots', qty: 180, unit: 'g', prep: 'Brunoise', supplier: 'Greenleaf Produce', unitCost: 1.08 },
  { id: 'i7', name: 'Dry white wine', qty: 200, unit: 'ml', prep: '', supplier: 'Vintner Supply Co.', unitCost: 1.6 },
  { id: 'i8', name: 'Lemon juice', qty: 20, unit: 'ml', prep: 'Fresh', supplier: 'Greenleaf Produce', unitCost: 0.22 },
  { id: 'i9', name: 'Kosher salt', qty: 18, unit: 'g', prep: 'To taste', supplier: 'Sysco', unitCost: 0.04 },
  { id: 'i10', name: 'White pepper', qty: 2, unit: 'g', prep: 'Ground', supplier: 'Sysco', unitCost: 0.09 },
];

export const initialChanges: Change[] = [
  {
    id: 'c1',
    who: 'Marisol Ortega',
    role: 'Sous chef',
    when: '2026-11-01T15:42:00',
    summary: 'Raised holding temperature from 65 °C to 68 °C',
    detail: 'Velouté was skinning over during Saturday service.',
  },
  {
    id: 'c2',
    who: 'Dev Patel',
    role: 'Chef de cuisine',
    when: '2026-10-27T10:05:00',
    summary: 'Swapped chicken base for house stock (SAU-002)',
    detail: 'Cuts sodium; food cost up $0.84 per batch.',
  },
  {
    id: 'c3',
    who: 'Marisol Ortega',
    role: 'Sous chef',
    when: '2026-10-19T09:30:00',
    summary: 'Added lemon juice, 20 ml',
  },
  {
    id: 'c4',
    who: 'Jonah Kim',
    role: 'Sauce cook',
    when: '2026-10-08T17:12:00',
    summary: 'Shelf life reduced from 4 days to 3',
    detail: 'Per health inspection guidance for dairy-based sauces.',
  },
  {
    id: 'c5',
    who: 'Dev Patel',
    role: 'Chef de cuisine',
    when: '2026-09-22T13:00:00',
    summary: 'Recipe moved from testing to active',
  },
];
