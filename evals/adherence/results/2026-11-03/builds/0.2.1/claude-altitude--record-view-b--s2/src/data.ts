export type Station = 'hot-line' | 'garde-manger' | 'pastry' | 'sauce' | 'grill';
export type Status = 'active' | 'testing' | 'retired';

export const STATIONS: { value: Station; label: string }[] = [
  { value: 'hot-line', label: 'Hot line' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'grill', label: 'Grill' },
  { value: 'garde-manger', label: 'Garde manger' },
  { value: 'pastry', label: 'Pastry' },
];

export const STATUSES: { value: Status; label: string; description: string }[] = [
  { value: 'active', label: 'On the menu', description: 'Served at dinner service' },
  { value: 'testing', label: 'In testing', description: 'Staff meal and tastings only' },
  { value: 'retired', label: 'Retired', description: 'Kept for reference' },
];

export interface RecipeDetails {
  name: string;
  station: Station;
  status: Status;
  yieldPortions: number;
  portionSize: string;
  prepMinutes: number;
  cookMinutes: number;
  holding: string;
  allergens: string;
  method: string;
  plating: string;
}

export interface Ingredient {
  id: string;
  qty: string;
  unit: string;
  name: string;
  prep: string;
  supplier: string;
  costPerBatch: number;
}

export interface Change {
  id: string;
  who: string;
  role: string;
  at: string; // ISO
  summary: string;
  detail?: string;
  kind: 'details' | 'ingredients' | 'method' | 'status';
}

export const RECIPE_CODE = 'HL-014';
export const LAST_COSTED = '2026-10-28';

export const initialDetails: RecipeDetails = {
  name: 'Braised Short Rib, Celery Root Purée, Red Wine Jus',
  station: 'hot-line',
  status: 'active',
  yieldPortions: 12,
  portionSize: '220 g braised weight',
  prepMinutes: 45,
  cookMinutes: 210,
  holding: 'In braising liquid, 63 °C hot-hold up to 4 h; chilled 3 days',
  allergens: 'Celery, Milk, Sulphites',
  method:
    'Season ribs the night before. Sear hard on all sides in a rondeau, remove. Sweat mirepoix until caramelised, add tomato paste and cook out. Deglaze with red wine, reduce by half. Return ribs, cover with veal stock, add aromatics. Braise covered at 150 °C for 3½ h until a cake tester slides through. Cool in liquid, portion, strain and reduce liquid to jus.',
  plating:
    'Swoosh 70 g purée off-centre, rib on top glazed with jus, 3 glazed pearl onions, micro celery leaves, 30 ml jus at the pass.',
};

export const ingredients: Ingredient[] = [
  { id: 'i1', qty: '3.6', unit: 'kg', name: 'Beef short rib, bone-in', prep: 'Trimmed, 4-bone sections', supplier: 'Halvorsen Meats', costPerBatch: 79.2 },
  { id: 'i2', qty: '18', unit: 'g', name: 'Kosher salt', prep: 'Dry brine overnight', supplier: 'Dry store', costPerBatch: 0.12 },
  { id: 'i3', qty: '60', unit: 'ml', name: 'Grapeseed oil', prep: '', supplier: 'Dry store', costPerBatch: 0.54 },
  { id: 'i4', qty: '400', unit: 'g', name: 'Yellow onion', prep: 'Rough chop', supplier: 'Greenleaf Produce', costPerBatch: 0.88 },
  { id: 'i5', qty: '250', unit: 'g', name: 'Carrot', prep: 'Rough chop', supplier: 'Greenleaf Produce', costPerBatch: 0.6 },
  { id: 'i6', qty: '200', unit: 'g', name: 'Celery', prep: 'Rough chop', supplier: 'Greenleaf Produce', costPerBatch: 0.7 },
  { id: 'i7', qty: '40', unit: 'g', name: 'Tomato paste', prep: '', supplier: 'Dry store', costPerBatch: 0.36 },
  { id: 'i8', qty: '750', unit: 'ml', name: 'Red wine (Côtes du Rhône)', prep: '', supplier: 'Bar transfer', costPerBatch: 9.5 },
  { id: 'i9', qty: '2', unit: 'L', name: 'Veal stock', prep: 'House, see SA-002', supplier: 'In house', costPerBatch: 7.4 },
  { id: 'i10', qty: '6', unit: 'sprig', name: 'Thyme', prep: 'Tied with bay', supplier: 'Greenleaf Produce', costPerBatch: 0.45 },
  { id: 'i11', qty: '3', unit: 'ea', name: 'Fresh bay leaf', prep: '', supplier: 'Greenleaf Produce', costPerBatch: 0.2 },
  { id: 'i12', qty: '1.2', unit: 'kg', name: 'Celery root', prep: 'Peeled, 2 cm dice', supplier: 'Greenleaf Produce', costPerBatch: 4.32 },
  { id: 'i13', qty: '300', unit: 'ml', name: 'Whole milk', prep: 'For simmering root', supplier: 'Dairy Co-op', costPerBatch: 0.39 },
  { id: 'i14', qty: '150', unit: 'g', name: 'Unsalted butter', prep: 'Cold, cubed', supplier: 'Dairy Co-op', costPerBatch: 1.95 },
  { id: 'i15', qty: '36', unit: 'ea', name: 'Pearl onions', prep: 'Blanched, peeled, glazed', supplier: 'Greenleaf Produce', costPerBatch: 2.7 },
];

export const initialChanges: Change[] = [
  { id: 'c1', who: 'Marisol Ortega', role: 'Executive chef', at: '2026-11-02T15:40:00', kind: 'ingredients', summary: 'Swapped beef supplier to Halvorsen Meats', detail: 'Short rib now $22.00/kg, down from $24.50/kg. Batch cost recalculated.' },
  { id: 'c2', who: 'Dev Patel', role: 'Sous chef', at: '2026-10-30T10:12:00', kind: 'method', summary: 'Braise temperature lowered to 150 °C', detail: 'Was 160 °C for 3 h. Longer, lower braise held shape better on the line.' },
  { id: 'c3', who: 'Dev Patel', role: 'Sous chef', at: '2026-10-28T17:05:00', kind: 'details', summary: 'Portion size changed to 220 g braised weight', detail: 'Was 250 g. Brings plate cost in line with the 31% target.' },
  { id: 'c4', who: 'Ana Lindqvist', role: 'Chef de partie', at: '2026-10-21T09:30:00', kind: 'details', summary: 'Added Sulphites to allergens', detail: 'Red wine in the jus; flagged by the allergen audit.' },
  { id: 'c5', who: 'Marisol Ortega', role: 'Executive chef', at: '2026-10-14T14:00:00', kind: 'status', summary: 'Moved from In testing to On the menu', detail: 'Approved after Friday tasting for the autumn menu.' },
];
