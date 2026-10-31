import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  ALLERGENS,
  CATEGORIES,
  STATIONS,
  STATUSES,
  type RecipeDetails,
  type RecipeStatus,
} from "@/data/recipe"

type FormState = {
  name: string
  category: string
  station: string
  status: RecipeStatus
  description: string
  yieldPortions: string
  portionSize: string
  prepMinutes: string
  cookMinutes: string
  shelfLifeDays: string
  menuPrice: string
  allergens: string[]
  note: string
}

type Errors = Partial<Record<keyof FormState, string>>

function toForm(recipe: RecipeDetails): FormState {
  return {
    name: recipe.name,
    category: recipe.category,
    station: recipe.station,
    status: recipe.status,
    description: recipe.description,
    yieldPortions: String(recipe.yieldPortions),
    portionSize: recipe.portionSize,
    prepMinutes: String(recipe.prepMinutes),
    cookMinutes: String(recipe.cookMinutes),
    shelfLifeDays: String(recipe.shelfLifeDays),
    menuPrice: recipe.menuPrice.toFixed(2),
    allergens: recipe.allergens,
    note: "",
  }
}

function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (!form.name.trim()) errors.name = "Enter a recipe name."
  if (!form.portionSize.trim()) errors.portionSize = "Enter a portion size."

  const wholeNumber = (key: keyof FormState, label: string, min: number) => {
    const raw = String(form[key]).trim()
    const n = Number(raw)
    if (raw === "" || !Number.isInteger(n) || n < min) {
      errors[key] = min > 0 ? `${label} must be a whole number of at least ${min}.` : `${label} must be a whole number.`
    }
  }
  wholeNumber("yieldPortions", "Yield", 1)
  wholeNumber("prepMinutes", "Prep time", 0)
  wholeNumber("cookMinutes", "Cook time", 0)
  wholeNumber("shelfLifeDays", "Shelf life", 0)

  const price = Number(form.menuPrice)
  if (form.menuPrice.trim() === "" || Number.isNaN(price) || price <= 0) {
    errors.menuPrice = "Enter a menu price above $0."
  }
  return errors
}

export function EditRecipeDialog({
  open,
  onOpenChange,
  recipe,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: RecipeDetails
  onSave: (next: RecipeDetails, note: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit recipe details</DialogTitle>
          <DialogDescription>
            Saved changes are logged in the recipe's history for the whole kitchen.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts from the saved recipe. */}
        {open && <EditRecipeForm recipe={recipe} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  )
}

function EditRecipeForm({
  recipe,
  onSave,
}: {
  recipe: RecipeDetails
  onSave: (next: RecipeDetails, note: string) => void
}) {
  const [form, setForm] = useState(() => toForm(recipe))
  const [errors, setErrors] = useState<Errors>({})

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const toggleAllergen = (allergen: string, checked: boolean) =>
    set(
      "allergens",
      checked
        ? ALLERGENS.filter((a) => a === allergen || form.allergens.includes(a))
        : form.allergens.filter((a) => a !== allergen),
    )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(`recipe-${firstInvalid}`)?.focus()
      return
    }
    onSave(
      {
        ...recipe,
        name: form.name.trim(),
        category: form.category,
        station: form.station,
        status: form.status,
        description: form.description.trim(),
        yieldPortions: Number(form.yieldPortions),
        portionSize: form.portionSize.trim(),
        prepMinutes: Number(form.prepMinutes),
        cookMinutes: Number(form.cookMinutes),
        shelfLifeDays: Number(form.shelfLifeDays),
        menuPrice: Math.round(Number(form.menuPrice) * 100) / 100,
        allergens: form.allergens,
      },
      form.note.trim(),
    )
  }

  const field = (key: keyof FormState) => ({
    id: `recipe-${key}`,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `recipe-${key}-error` : undefined,
  })

  const error = (key: keyof FormState) =>
    errors[key] && (
      <p id={`recipe-${key}-error`} className="text-xs text-destructive">
        {errors[key]}
      </p>
    )

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="recipe-name">Name</Label>
        <Input {...field("name")} value={form.name} onChange={(e) => set("name", e.target.value)} />
        {error("name")}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="recipe-category">Category</Label>
          <Select
            items={CATEGORIES.map((c) => ({ value: c, label: c }))}
            value={form.category}
            onValueChange={(v) => v && set("category", v)}
          >
            <SelectTrigger id="recipe-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="recipe-station">Station</Label>
          <Select
            items={STATIONS.map((s) => ({ value: s, label: s }))}
            value={form.station}
            onValueChange={(v) => v && set("station", v)}
          >
            <SelectTrigger id="recipe-station" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="recipe-status">Status</Label>
          <Select
            items={STATUSES}
            value={form.status}
            onValueChange={(v) => v && set("status", v as RecipeStatus)}
          >
            <SelectTrigger id="recipe-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="recipe-description">Description</Label>
        <Textarea
          {...field("description")}
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="recipe-yieldPortions">Yield (portions)</Label>
          <Input
            {...field("yieldPortions")}
            type="number"
            inputMode="numeric"
            min={1}
            value={form.yieldPortions}
            onChange={(e) => set("yieldPortions", e.target.value)}
          />
          {error("yieldPortions")}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="recipe-portionSize">Portion size</Label>
          <Input
            {...field("portionSize")}
            value={form.portionSize}
            onChange={(e) => set("portionSize", e.target.value)}
          />
          {error("portionSize")}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="recipe-prepMinutes">Prep time (minutes)</Label>
          <Input
            {...field("prepMinutes")}
            type="number"
            inputMode="numeric"
            min={0}
            value={form.prepMinutes}
            onChange={(e) => set("prepMinutes", e.target.value)}
          />
          {error("prepMinutes")}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="recipe-cookMinutes">Cook time (minutes)</Label>
          <Input
            {...field("cookMinutes")}
            type="number"
            inputMode="numeric"
            min={0}
            value={form.cookMinutes}
            onChange={(e) => set("cookMinutes", e.target.value)}
          />
          {error("cookMinutes")}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="recipe-shelfLifeDays">Shelf life (days)</Label>
          <Input
            {...field("shelfLifeDays")}
            type="number"
            inputMode="numeric"
            min={0}
            value={form.shelfLifeDays}
            onChange={(e) => set("shelfLifeDays", e.target.value)}
          />
          {error("shelfLifeDays")}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="recipe-menuPrice">Menu price ($)</Label>
          <Input
            {...field("menuPrice")}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.menuPrice}
            onChange={(e) => set("menuPrice", e.target.value)}
          />
          {error("menuPrice")}
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Allergens</legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
          {ALLERGENS.map((allergen) => (
            <Label key={allergen} className="font-normal">
              <Checkbox
                checked={form.allergens.includes(allergen)}
                onCheckedChange={(checked) => toggleAllergen(allergen, checked)}
              />
              {allergen}
            </Label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor="recipe-note">Note for the change log (optional)</Label>
        <Textarea
          id="recipe-note"
          rows={2}
          placeholder="Why are you making this change?"
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
        />
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </form>
  )
}
