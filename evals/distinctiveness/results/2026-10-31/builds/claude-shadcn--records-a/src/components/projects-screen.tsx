import { useEffect, useMemo, useRef, useState } from "react"
import { RefreshCwIcon, SearchIcon, SearchXIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { fetchProjects, projects as initialProjects, type Project, type ProjectStatus } from "@/data/projects"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const statusMeta: Record<ProjectStatus, { label: string; dot: string }> = {
  "on-track": { label: "On track", dot: "bg-emerald-500" },
  "at-risk": { label: "At risk", dot: "bg-amber-500" },
  "off-track": { label: "Off track", dot: "bg-red-500" },
  completed: { label: "Completed", dot: "bg-sky-500" },
  planning: { label: "Planning", dot: "bg-muted-foreground" },
}

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })

function formatDate(iso: string) {
  // Parse date-only strings as local dates so they don't shift a day in negative UTC offsets.
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return dateFormat.format(new Date(y, m - 1, d))
}

function HighlightedName({ name, query }: { name: string; query: string }) {
  const index = query ? name.toLowerCase().indexOf(query.toLowerCase()) : -1
  if (index === -1) return <>{name}</>
  return (
    <>
      {name.slice(0, index)}
      <mark className="rounded-sm bg-yellow-200/70 text-inherit dark:bg-yellow-500/30">
        {name.slice(index, index + query.length)}
      </mark>
      {name.slice(index + query.length)}
    </>
  )
}

export function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [syncedAt, setSyncedAt] = useState(() => new Date())
  const searchRef = useRef<HTMLInputElement>(null)

  const trimmedQuery = query.trim()
  const visible = useMemo(() => {
    const q = trimmedQuery.toLowerCase()
    return q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects
  }, [projects, trimmedQuery])

  const visibleSelectedCount = visible.filter((p) => selected.has(p.id)).length
  const allVisibleSelected = visible.length > 0 && visibleSelectedCount === visible.length
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected
  const hiddenSelectedCount = selected.size - visibleSelectedCount

  // "/" focuses search from anywhere, matching common app conventions.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (e.key !== "/" || target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  function clearSearch() {
    setQuery("")
    searchRef.current?.focus()
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const p of visible) {
        if (checked) next.add(p.id)
        else next.delete(p.id)
      }
      return next
    })
  }

  async function refresh() {
    setRefreshing(true)
    try {
      const fresh = await fetchProjects()
      const ids = new Set(fresh.map((p) => p.id))
      setProjects(fresh)
      // Drop selections for projects that no longer exist.
      setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))))
      setSyncedAt(new Date())
      toast.success("Projects refreshed", { description: `${fresh.length} projects loaded` })
    } catch {
      toast.error("Couldn't refresh projects", { description: "Check your connection and try again." })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Projects</CardTitle>
          <CardDescription>
            {projects.length} projects in Northwind Product Team · Last synced {timeFormat.format(syncedAt)}
          </CardDescription>
          <CardAction>
            <Button variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCwIcon data-icon="inline-start" className={cn(refreshing && "animate-spin")} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <SearchIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                ref={searchRef}
                type="search"
                aria-label="Search projects by name"
                placeholder="Search projects by name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && query) {
                    e.preventDefault()
                    clearSearch()
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
                  className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                >
                  <XIcon />
                </Button>
              )}
            </div>

            <div className="flex min-h-7 items-center gap-2 text-sm text-muted-foreground">
              {selected.size > 0 ? (
                <>
                  <span>
                    <span className="font-medium text-foreground">{selected.size}</span> selected
                    {hiddenSelectedCount > 0 && ` (${hiddenSelectedCount} hidden by search)`}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                    Clear selection
                  </Button>
                </>
              ) : (
                <span aria-hidden>
                  {trimmedQuery ? `${visible.length} of ${projects.length} projects` : `${projects.length} projects`}
                </span>
              )}
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {trimmedQuery
              ? `${visible.length} ${visible.length === 1 ? "project matches" : "projects match"} "${trimmedQuery}"`
              : ""}
          </p>

          <div className="overflow-hidden rounded-lg border" aria-busy={refreshing}>
            <Table className={cn("transition-opacity", refreshing && "opacity-60")}>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-3">
                    <Checkbox
                      aria-label={trimmedQuery ? "Select all matching projects" : "Select all projects"}
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected}
                      disabled={visible.length === 0}
                      onCheckedChange={(checked) => toggleAllVisible(checked)}
                    />
                  </TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Owner</TableHead>
                  <TableHead className="hidden sm:table-cell">Progress</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Open tasks</TableHead>
                  <TableHead className="hidden lg:table-cell">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((project) => {
                  const isSelected = selected.has(project.id)
                  const status = statusMeta[project.status]
                  return (
                    <TableRow
                      key={project.id}
                      data-state={isSelected ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={(e) => {
                        // Let the checkbox handle its own clicks; anywhere else on the row toggles selection.
                        if ((e.target as HTMLElement).closest("[data-slot=checkbox]")) return
                        toggleOne(project.id, !isSelected)
                      }}
                    >
                      <TableCell className="pl-3">
                        <Checkbox
                          aria-label={`Select ${project.name}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => toggleOne(project.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            <HighlightedName name={project.name} query={trimmedQuery} />
                          </span>
                          <span className="text-xs text-muted-foreground">{project.key}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <span aria-hidden className={cn("size-1.5 rounded-full", status.dot)} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarFallback>{project.owner.initials}</AvatarFallback>
                          </Avatar>
                          <span>{project.owner.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div
                            role="progressbar"
                            aria-label={`${project.name} progress`}
                            aria-valuenow={project.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"
                          >
                            <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
                          </div>
                          <span className="w-9 text-xs text-muted-foreground tabular-nums">{project.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums lg:table-cell">{project.openTasks}</TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatDate(project.dueDate)}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {visible.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="h-48 text-center whitespace-normal">
                      <div className="flex flex-col items-center gap-2">
                        <SearchXIcon aria-hidden className="size-6 text-muted-foreground" />
                        <p className="font-medium">No projects match “{trimmedQuery}”</p>
                        <p className="text-sm text-muted-foreground">Check the spelling or try a shorter name.</p>
                        <Button variant="outline" size="sm" className="mt-1" onClick={clearSearch}>
                          Clear search
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Press <kbd className="rounded border bg-muted px-1 font-mono">/</kbd> to search,{" "}
            <kbd className="rounded border bg-muted px-1 font-mono">Esc</kbd> to clear.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
