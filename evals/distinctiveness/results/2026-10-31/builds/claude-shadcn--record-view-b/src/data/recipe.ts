export type RecipeStatus = "active" | "testing" | "archived"

export type RecipeDetails = {
  name: string
  code: string
  category: string
  station: string
  status: RecipeStatus
  description: string
  yieldPortions: number
  portionSize: string
  prepMinutes: number
  cookMinutes: number
  shelfLifeDays: number
  menuPrice: number
  allergens: string[]
}

export type Ingredient = {
  id: string
  name: string
  quantity: number
  unit: string
  prep?: string
  /** Cost per `unit`, in dollars. */
  unitCost: number
  subRecipe?: boolean
}

export type FieldChange = {
  field: string
  from: string
  to: string
}

export type ChangeEntry = {
  id: string
  author: string
  role: string
  date: string
  summary: string
  changes: FieldChange[]
}

export const CATEGORIES = ["Starters", "Mains", "Sides", "Sauces", "Desserts", "Staff meal"]
export const STATIONS = ["Garde manger", "Grill", "Sauté", "Braise / Roast", "Pastry"]
export const STATUSES: { value: RecipeStatus; label: string }[] = [
  { value: "active", label: "On menu" },
  { value: "testing", label: "In testing" },
  { value: "archived", label: "Archived" },
]
export const ALLERGENS = [
  "Gluten",
  "Dairy",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree nuts",
  "Peanuts",
  "Soy",
  "Sesame",
  "Celery",
  "Mustard",
  "Sulphites",
]

export const CURRENT_USER = { name: "Marcus Bell", role: "Sous chef" }

export const recipe: RecipeDetails = {
  name: "Braised Short Rib, Celery Root Purée",
  code: "MN-014",
  category: "Mains",
  station: "Braise / Roast",
  status: "active",
  description:
    "Bone-in short rib seared hard, braised overnight in red wine and veal stock, then glazed in reduced braising liquid. Served over celery root purée with horseradish gremolata.",
  yieldPortions: 12,
  portionSize: "280 g meat, 120 g purée",
  prepMinutes: 45,
  cookMinutes: 210,
  shelfLifeDays: 3,
  menuPrice: 38,
  allergens: ["Dairy", "Celery", "Sulphites"],
}

export const ingredients: Ingredient[] = [
  { id: "i1", name: "Beef short rib, bone-in", quantity: 7.2, unit: "kg", prep: "3-bone, trimmed", unitCost: 13.8 },
  { id: "i2", name: "Kosher salt", quantity: 0.06, unit: "kg", prep: "Dry brine 24 h", unitCost: 2.1 },
  { id: "i3", name: "Black pepper, coarse", quantity: 0.015, unit: "kg", unitCost: 28 },
  { id: "i4", name: "Grapeseed oil", quantity: 0.12, unit: "L", unitCost: 6.4 },
  { id: "i5", name: "Yellow onion", quantity: 0.6, unit: "kg", prep: "Rough chop", unitCost: 2.2 },
  { id: "i6", name: "Carrot", quantity: 0.4, unit: "kg", prep: "Rough chop", unitCost: 1.9 },
  { id: "i7", name: "Celery", quantity: 0.3, unit: "kg", prep: "Rough chop", unitCost: 2.6 },
  { id: "i8", name: "Garlic", quantity: 0.06, unit: "kg", prep: "Halved", unitCost: 8.5 },
  { id: "i9", name: "Tomato paste", quantity: 0.09, unit: "kg", prep: "Pincé", unitCost: 5.6 },
  { id: "i10", name: "Red wine, Côtes du Rhône", quantity: 1.5, unit: "L", unitCost: 9 },
  { id: "i11", name: "Veal stock", quantity: 3, unit: "L", unitCost: 6.5, subRecipe: true },
  { id: "i12", name: "Thyme", quantity: 0.01, unit: "kg", prep: "Bundled", unitCost: 32 },
  { id: "i13", name: "Bay leaf", quantity: 4, unit: "ea", unitCost: 0.08 },
  { id: "i14", name: "Celery root", quantity: 2.4, unit: "kg", prep: "Peeled, 2 cm dice", unitCost: 3.4 },
  { id: "i15", name: "Unsalted butter", quantity: 0.3, unit: "kg", unitCost: 9.5 },
  { id: "i16", name: "Heavy cream", quantity: 0.5, unit: "L", unitCost: 5.2 },
  { id: "i17", name: "Horseradish gremolata", quantity: 0.24, unit: "kg", unitCost: 14.75, subRecipe: true },
]

export const changes: ChangeEntry[] = [
  {
    id: "c5",
    author: "Ana Rivera",
    role: "Executive chef",
    date: "2026-10-27T15:12:00",
    summary: "Raised menu price after the October short rib price increase.",
    changes: [{ field: "Menu price", from: "$36.00", to: "$38.00" }],
  },
  {
    id: "c4",
    author: "Marcus Bell",
    role: "Sous chef",
    date: "2026-10-21T10:40:00",
    summary: "New supplier for short rib. Updated cost and trim spec.",
    changes: [
      { field: "Short rib cost", from: "$12.40 / kg", to: "$13.80 / kg" },
      { field: "Short rib prep", from: "Whole plate", to: "3-bone, trimmed" },
    ],
  },
  {
    id: "c3",
    author: "Priya Shah",
    role: "Chef de partie",
    date: "2026-10-09T17:05:00",
    summary: "Swapped the parsley garnish for horseradish gremolata.",
    changes: [
      { field: "Ingredient", from: "Flat-leaf parsley, 60 g", to: "Horseradish gremolata, 240 g" },
    ],
  },
  {
    id: "c2",
    author: "Ana Rivera",
    role: "Executive chef",
    date: "2026-09-30T09:20:00",
    summary: "Longer, lower braise for a cleaner slice at service.",
    changes: [{ field: "Cook time", from: "3 h", to: "3 h 30 min" }],
  },
  {
    id: "c1",
    author: "Marcus Bell",
    role: "Sous chef",
    date: "2026-09-18T14:55:00",
    summary: "Moved to the autumn menu. Status changed from testing.",
    changes: [{ field: "Status", from: "In testing", to: "On menu" }],
  },
]
