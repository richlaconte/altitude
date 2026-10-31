import { useEffect, useMemo, useRef, useState } from "react"
import { CopyIcon, PackageSearchIcon, RefreshCwIcon, SearchIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { shipments as sampleShipments, type Shipment, type ShipmentStatus } from "@/data/shipments"

const statusStyles: Record<ShipmentStatus, string> = {
  Booked: "bg-muted text-muted-foreground",
  "Picked up": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "In transit": "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "Out for delivery": "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  Delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Delayed: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  Exception: "bg-destructive/10 text-destructive",
}

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
const numberFormat = new Intl.NumberFormat("en-US")

const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`))

/** Lowercase and drop separators so "shp 26 108341", "108341" and "SHP-26-108341" all match. */
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Simulated network fetch — there is no backend. */
function fetchShipments(): Promise<Shipment[]> {
  return new Promise((resolve) => setTimeout(() => resolve(sampleShipments), 700))
}

export function ShipmentRecords() {
  const [rows, setRows] = useState<Shipment[]>(sampleShipments)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(() => new Date())
  const searchRef = useRef<HTMLInputElement>(null)

  const needle = normalize(query)
  const visible = useMemo(
    () =>
      needle
        ? rows.filter((s) => [s.reference, s.poNumber, s.bolNumber].some((ref) => normalize(ref).includes(needle)))
        : rows,
    [rows, needle]
  )

  const visibleSelectedCount = visible.filter((s) => selected.has(s.id)).length
  const allVisibleSelected = visible.length > 0 && visibleSelectedCount === visible.length
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected
  const hiddenSelectedCount = selected.size - visibleSelectedCount

  // "/" focuses search, like most records screens.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== "/" || target.closest("input, textarea, [contenteditable]")) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const clearSearch = () => {
    setQuery("")
    searchRef.current?.focus()
  }

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const s of visible) {
        if (allVisibleSelected) next.delete(s.id)
        else next.add(s.id)
      }
      return next
    })

  const refresh = async () => {
    setRefreshing(true)
    try {
      const data = await fetchShipments()
      setRows(data)
      // Drop selections for shipments that no longer exist.
      const ids = new Set(data.map((s) => s.id))
      setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))))
      setUpdatedAt(new Date())
      toast.success("Shipments refreshed", { description: `${data.length} shipments loaded` })
    } catch {
      toast.error("Couldn't refresh shipments", { description: "Check your connection and try again." })
    } finally {
      setRefreshing(false)
    }
  }

  const copySelectedReferences = async () => {
    const refs = rows.filter((s) => selected.has(s.id)).map((s) => s.reference)
    try {
      await navigator.clipboard.writeText(refs.join("\n"))
      toast.success(`Copied ${refs.length} reference${refs.length === 1 ? "" : "s"}`)
    } catch {
      toast.error("Clipboard unavailable")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Shipments</CardTitle>
        <CardDescription>
          {rows.length} shipments · Updated {timeFormat.format(updatedAt)}
        </CardDescription>
        <CardAction>
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCwIcon className={cn(refreshing && "animate-spin")} data-icon="inline-start" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              type="search"
              aria-label="Search shipments by reference"
              placeholder="Search shipment ref, PO or BOL…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault()
                  setQuery("")
                }
              }}
              className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Clear search"
                onClick={clearSearch}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              >
                <XIcon />
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {needle ? `${visible.length} of ${rows.length} shipments match` : `${rows.length} shipments`}
          </p>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            {hiddenSelectedCount > 0 && (
              <span className="text-muted-foreground">({hiddenSelectedCount} hidden by search)</span>
            )}
            <div className="ml-auto flex gap-1">
              <Button variant="ghost" size="sm" onClick={copySelectedReferences}>
                <CopyIcon data-icon="inline-start" />
                Copy references
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border">
          <Table aria-busy={refreshing} className={cn("transition-opacity", refreshing && "opacity-60")}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pl-3">
                  <Checkbox
                    aria-label={allVisibleSelected ? "Deselect all shown shipments" : "Select all shown shipments"}
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    disabled={visible.length === 0}
                    onCheckedChange={toggleAllVisible}
                  />
                </TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Mode / Carrier</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>ETA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((s) => {
                const isSelected = selected.has(s.id)
                return (
                  <TableRow
                    key={s.id}
                    data-state={isSelected ? "selected" : undefined}
                    onClick={() => toggleRow(s.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="pl-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`Select ${s.reference}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(s.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-[0.8rem] font-medium">{s.reference}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.poNumber} · {s.bolNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusStyles[s.status]}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>{s.customer}</TableCell>
                    <TableCell>
                      <div>{s.origin}</div>
                      <div className="text-xs text-muted-foreground">→ {s.destination}</div>
                    </TableCell>
                    <TableCell>
                      <div>{s.mode}</div>
                      <div className="text-xs text-muted-foreground">{s.carrier}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div>{numberFormat.format(s.weightLbs)} lb</div>
                      <div className="text-xs text-muted-foreground">{s.pallets} pallets</div>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDate(s.pickupDate)}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(s.eta)}</TableCell>
                  </TableRow>
                )
              })}

              {visible.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="py-12">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <PackageSearchIcon className="size-8 text-muted-foreground" />
                      <p className="font-medium">No shipments match “{query.trim()}”</p>
                      <p className="text-sm text-muted-foreground">
                        Try a shipment reference, PO or BOL number — partial numbers work too.
                      </p>
                      <Button variant="outline" size="sm" onClick={clearSearch} className="mt-1">
                        Clear search
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
