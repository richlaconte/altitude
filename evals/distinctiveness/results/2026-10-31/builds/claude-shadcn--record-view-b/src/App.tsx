import { useState } from "react"
import { ChevronRightIcon, PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { EditRecipeDialog } from "@/components/edit-recipe-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CURRENT_USER,
  STATUSES,
  changes as initialChanges,
  ingredients,
  recipe as initialRecipe,
  type ChangeEntry,
  type FieldChange,
  type RecipeDetails,
  type RecipeStatus,
} from "@/data/recipe"
import { formatDateTime, formatMinutes, formatMoney, formatQuantity, initials } from "@/lib/format"

const FOOD_COST_TARGET = { min: 0.28, max: 0.35 }

const statusLabel = (status: RecipeStatus) => STATUSES.find((s) => s.value === status)!.label
const statusVariant = { active: "default", testing: "secondary", archived: "outline" } as const

/** Human-readable before/after values for every detail field that changed. */
function diffDetails(prev: RecipeDetails, next: RecipeDetails): FieldChange[] {
  const fields: [string, (r: RecipeDetails) => string][] = [
    ["Name", (r) => r.name],
    ["Category", (r) => r.category],
    ["Station", (r) => r.station],
    ["Status", (r) => statusLabel(r.status)],
    ["Description", (r) => r.description || "None"],
    ["Yield", (r) => `${r.yieldPortions} portions`],
    ["Portion size", (r) => r.portionSize],
    ["Prep time", (r) => formatMinutes(r.prepMinutes)],
    ["Cook time", (r) => formatMinutes(r.cookMinutes)],
    ["Shelf life", (r) => `${r.shelfLifeDays} days`],
    ["Menu price", (r) => formatMoney(r.menuPrice)],
    ["Allergens", (r) => r.allergens.join(", ") || "None"],
  ]
  return fields
    .map(([field, get]) => ({ field, from: get(prev), to: get(next) }))
    .filter((c) => c.from !== c.to)
}

export default function App() {
  const [recipe, setRecipe] = useState(initialRecipe)
  const [history, setHistory] = useState<ChangeEntry[]>(initialChanges)
  const [editing, setEditing] = useState(false)

  const batchCost = ingredients.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)
  const portionCost = batchCost / recipe.yieldPortions
  const foodCost = portionCost / recipe.menuPrice
  const overTarget = foodCost > FOOD_COST_TARGET.max
  const lastChange = history[0]

  const handleSave = (next: RecipeDetails, note: string) => {
    const diff = diffDetails(recipe, next)
    setEditing(false)
    if (diff.length === 0) {
      toast("No changes to save.")
      return
    }
    setRecipe(next)
    setHistory((h) => [
      {
        id: crypto.randomUUID(),
        author: CURRENT_USER.name,
        role: CURRENT_USER.role,
        date: new Date().toISOString(),
        summary: note || `Updated ${diff.map((d) => d.field.toLowerCase()).join(", ")}.`,
        changes: diff,
      },
      ...h,
    ])
    toast.success("Recipe updated", {
      description: `${diff.length} ${diff.length === 1 ? "change" : "changes"} added to the history.`,
    })
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1 text-sm text-muted-foreground">
                <li>Recipe book</li>
                <li aria-hidden>
                  <ChevronRightIcon className="size-3.5" />
                </li>
                <li>{recipe.category}</li>
              </ol>
            </nav>
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {recipe.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
              <Badge variant={statusVariant[recipe.status]}>{statusLabel(recipe.status)}</Badge>
              <span className="font-mono text-xs">{recipe.code}</span>
              {lastChange && (
                <span>
                  Updated {formatDateTime(lastChange.date)} by {lastChange.author}
                </span>
              )}
            </div>
          </div>
          <Button onClick={() => setEditing(true)} className="self-start">
            <PencilIcon data-icon="inline-start" />
            Edit details
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <p className="max-w-prose leading-relaxed text-pretty">
                  {recipe.description || (
                    <span className="text-muted-foreground">No description yet.</span>
                  )}
                </p>
                <Separator />
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <Fact label="Station">{recipe.station}</Fact>
                  <Fact label="Yield">{recipe.yieldPortions} portions</Fact>
                  <Fact label="Portion size">{recipe.portionSize}</Fact>
                  <Fact label="Prep time">{formatMinutes(recipe.prepMinutes)}</Fact>
                  <Fact label="Cook time">{formatMinutes(recipe.cookMinutes)}</Fact>
                  <Fact label="Shelf life">
                    {recipe.shelfLifeDays} {recipe.shelfLifeDays === 1 ? "day" : "days"}, refrigerated
                  </Fact>
                  <Fact label="Menu price">{formatMoney(recipe.menuPrice)}</Fact>
                  <Fact label="Cost per portion">{formatMoney(portionCost)}</Fact>
                  <Fact label="Food cost">
                    <span className={overTarget ? "text-destructive" : undefined}>
                      {(foodCost * 100).toFixed(1)}%
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {overTarget ? "Above" : "Target"} {FOOD_COST_TARGET.min * 100}–
                      {FOOD_COST_TARGET.max * 100}%{overTarget && " target"}
                    </span>
                  </Fact>
                </dl>
                <Separator />
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Allergens</h3>
                  {recipe.allergens.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {recipe.allergens.map((a) => (
                        <li key={a}>
                          <Badge variant="outline">{a}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm">None declared</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ingredients</CardTitle>
                <CardDescription>
                  {ingredients.length} items for one batch of {recipe.yieldPortions} portions
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Ingredient</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead className="pr-4 text-right">Line cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{i.name}</span>
                            {i.subRecipe && <Badge variant="secondary">Sub-recipe</Badge>}
                          </div>
                          {i.prep && <div className="text-xs text-muted-foreground">{i.prep}</div>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantity(i.quantity, i.unit)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          {formatMoney(i.unitCost)} / {i.unit}
                        </TableCell>
                        <TableCell className="pr-4 text-right tabular-nums">
                          {formatMoney(i.quantity * i.unitCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="pl-4">
                        Batch cost
                      </TableCell>
                      <TableCell className="pr-4 text-right tabular-nums">
                        {formatMoney(batchCost)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="self-start">
            <CardHeader>
              <CardTitle>Recent changes</CardTitle>
              <CardDescription>Newest first</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col">
                {history.map((entry, index) => (
                  <li key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <Avatar size="sm">
                        <AvatarFallback>{initials(entry.author)}</AvatarFallback>
                      </Avatar>
                      {index < history.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-5">
                      <div className="text-sm">
                        <span className="font-medium">{entry.author}</span>{" "}
                        <span className="text-muted-foreground">· {entry.role}</span>
                      </div>
                      <time dateTime={entry.date} className="text-xs text-muted-foreground">
                        {formatDateTime(entry.date)}
                      </time>
                      <p className="text-sm text-pretty">{entry.summary}</p>
                      <ul className="flex flex-col gap-1 rounded-lg bg-muted/60 p-2.5 text-xs">
                        {entry.changes.map((c) => (
                          <li key={c.field + c.from}>
                            <span className="text-muted-foreground">{c.field}: </span>
                            <del className="text-muted-foreground">{c.from}</del>
                            <span className="text-muted-foreground"> → </span>
                            <ins className="font-medium no-underline">{c.to}</ins>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>

      <EditRecipeDialog
        open={editing}
        onOpenChange={setEditing}
        recipe={recipe}
        onSave={handleSave}
      />
      <Toaster position="bottom-right" />
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}
