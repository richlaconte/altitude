import { useMemo, useState } from "react"
import { ThemeProvider, useTheme } from "next-themes"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  DoorOpenIcon,
  LibraryBigIcon,
  MoonIcon,
  SunIcon,
  UserPlusIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BRANCH_OPTIONS,
  CLOSURE,
  METRICS,
  METRIC_KEYS,
  PERIOD,
  branchSummaries,
  monthLongLabel,
  monthLabel,
  monthlySeries,
  summary,
  type MetricKey,
} from "@/data/library"

// Series colours: slot 1 of the validated categorical palette, stepped per
// mode. The prior year is deliberately grey so the current year leads.
const SERIES_1 = { light: "#2a78d6", dark: "#3987e5" }
const SERIES_MUTED = { light: "#b5b3ab", dark: "#5c5b57" }

const ICONS: Record<MetricKey, typeof BookOpenIcon> = {
  loans: BookOpenIcon,
  members: UserPlusIcon,
  visits: DoorOpenIcon,
}

const fmt = new Intl.NumberFormat("en-GB")
const fmtCompact = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const fmtPct = new Intl.NumberFormat("en-GB", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
})

const BRANCH_ITEMS = [
  { value: "all", label: "All branches" },
  ...BRANCH_OPTIONS.map((b) => ({ value: b.id, label: b.name })),
]

const periodLabel = `${monthLongLabel(PERIOD.current.from)} – ${monthLongLabel(PERIOD.current.to)}`

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Dashboard />
    </ThemeProvider>
  )
}

function Dashboard() {
  const [branch, setBranch] = useState<string>("all")
  const [metric, setMetric] = useState<MetricKey>("loans")
  const branchName =
    BRANCH_ITEMS.find((b) => b.value === branch)?.label ?? "All branches"

  return (
    <div className="min-h-svh bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LibraryBigIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Riverton Public Libraries
              </h1>
              <p className="text-sm text-muted-foreground">
                Service overview · {periodLabel}, compared with the previous 12
                months
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* One filter row scopes everything below it. */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            items={BRANCH_ITEMS}
            value={branch}
            onValueChange={(v) => setBranch(v ?? "all")}
          >
            <SelectTrigger className="min-w-48" aria-label="Branch">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANCH_ITEMS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tabs
            value={metric}
            onValueChange={(v) => setMetric(v as MetricKey)}
          >
            <TabsList aria-label="Metric">
              {METRIC_KEYS.map((key) => (
                <TabsTrigger key={key} value={key} className="px-3">
                  {METRICS[key].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {branch !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setBranch("all")}>
              Clear branch
            </Button>
          )}
        </div>

        <section
          aria-label="Headline figures"
          className="grid gap-4 md:grid-cols-3"
        >
          {METRIC_KEYS.map((key) => (
            <StatTile
              key={key}
              metric={key}
              branch={branch}
              active={metric === key}
              onSelect={() => setMetric(key)}
            />
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-5">
          <TrendCard
            className="lg:col-span-3"
            branch={branch}
            branchName={branchName}
            metric={metric}
          />
          <BranchBarsCard
            className="lg:col-span-2"
            branch={branch}
            metric={metric}
            onSelectBranch={setBranch}
          />
        </div>

        <BranchTable branch={branch} onSelectBranch={setBranch} />

        <p className="text-xs text-muted-foreground">
          Sample data for demonstration. Loans include digital issues and
          renewals; visits are door-counter entries.
        </p>
      </div>
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

function Delta({ value, className }: { value: number; className?: string }) {
  const up = value >= 0
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        up ? "text-[#006300] dark:text-[#0ca30c]" : "text-destructive",
        className
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{up ? "Up" : "Down"}</span>
      {fmtPct.format(value)}
    </span>
  )
}

function StatTile({
  metric,
  branch,
  active,
  onSelect,
}: {
  metric: MetricKey
  branch: string
  active: boolean
  onSelect: () => void
}) {
  const s = useMemo(() => summary(branch, metric), [branch, metric])
  const Icon = ICONS[metric]
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card
        className={cn(
          "h-full transition-shadow hover:ring-foreground/20",
          active && "ring-2 ring-primary hover:ring-primary"
        )}
      >
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Icon className="size-4" aria-hidden />
            {METRICS[metric].label} · last 12 months
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {fmt.format(s.current)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            <Delta value={s.change} />
            <span className="text-muted-foreground">
              vs {fmt.format(s.previous)} the year before
            </span>
          </div>
          <div className="text-muted-foreground">
            {monthLabel(PERIOD.current.to)}: {fmt.format(s.latest)}{" "}
            <Delta value={s.latestChange} className="text-xs" /> on{" "}
            {monthLabel(PERIOD.current.to)} last year
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

const trendConfig = {
  current: { label: "Last 12 months", theme: SERIES_1 },
  previous: { label: "Year before", theme: SERIES_MUTED },
} satisfies ChartConfig

function TrendCard({
  branch,
  branchName,
  metric,
  className,
}: {
  branch: string
  branchName: string
  metric: MetricKey
  className?: string
}) {
  const [view, setView] = useState<"chart" | "table">("chart")
  const data = useMemo(() => monthlySeries(branch, metric), [branch, metric])
  const showClosure = branch === "all" || branch === CLOSURE.branchId
  const peak = data.reduce((a, b) => (b.current > a.current ? b : a))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          {METRICS[metric].label} by month · {branchName}
        </CardTitle>
        <CardDescription>
          Each month against the same month a year earlier. Peak:{" "}
          {peak.fullLabel} ({fmt.format(peak.current)}).
        </CardDescription>
        <CardAction>
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList aria-label="View">
              <TabsTrigger value="chart" className="px-2.5">
                Chart
              </TabsTrigger>
              <TabsTrigger value="table" className="px-2.5">
                Table
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent>
        {view === "chart" ? (
          <ChartContainer
            config={trendConfig}
            className="aspect-auto h-[300px] w-full"
          >
            <LineChart data={data} margin={{ top: 16, right: 12, left: 4 }}>
              <CartesianGrid vertical={false} />
              {showClosure && (
                <ReferenceArea
                  x1={monthLabel(CLOSURE.from)}
                  x2={monthLabel(CLOSURE.to)}
                  className="fill-muted"
                  fillOpacity={0.8}
                  label={{
                    value:
                      branch === "all" ? "Millbrook closed" : "Closed",
                    position: "insideTop",
                    className: "fill-muted-foreground text-[11px]",
                  }}
                />
              )}
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v: number) => fmtCompact.format(v)}
              />
              <ChartTooltip
                cursor
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload as
                        | (typeof data)[number]
                        | undefined
                      if (!p) return null
                      const change = p.current / p.previous - 1
                      return (
                        <div className="flex items-center justify-between gap-3">
                          {p.fullLabel}
                          <Delta value={change} className="text-xs" />
                        </div>
                      )
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="previous"
                type="monotone"
                stroke="var(--color-previous)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                dataKey="current"
                type="monotone"
                stroke="var(--color-current)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Last 12 months</TableHead>
                  <TableHead className="text-right">Year before</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.month}>
                    <TableCell>{p.fullLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt.format(p.current)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {fmt.format(p.previous)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Delta value={p.current / p.previous - 1} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const barsConfig = {
  value: { label: "Last 12 months", theme: SERIES_1 },
  muted: { label: "Other branches", theme: SERIES_MUTED },
} satisfies ChartConfig

function BranchBarsCard({
  branch,
  metric,
  onSelectBranch,
  className,
}: {
  branch: string
  metric: MetricKey
  onSelectBranch: (id: string) => void
  className?: string
}) {
  const data = useMemo(
    () =>
      branchSummaries()
        .map((b) => ({
          id: b.id,
          name: b.name,
          value: b[metric].current,
          change: b[metric].change,
        }))
        .sort((a, b) => b.value - a.value),
    [metric]
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{METRICS[metric].label} by branch</CardTitle>
        <CardDescription>
          Last 12 months, with change on the year before. Select a bar to
          filter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={barsConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 56 }}
            barCategoryGap={6}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={104}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideIndicator
                  formatter={(value, _name, item) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="font-mono font-medium tabular-nums">
                        {fmt.format(Number(value))}
                      </span>
                      <Delta value={item.payload.change} className="text-xs" />
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              className="cursor-pointer"
              onClick={(d) => {
                const id = (d as unknown as { id?: string }).id
                if (id) onSelectBranch(branch === id ? "all" : id)
              }}
            >
              {data.map((d) => (
                <Cell
                  key={d.id}
                  fill={
                    branch === "all" || branch === d.id
                      ? "var(--color-value)"
                      : "var(--color-muted)"
                  }
                />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                offset={8}
                className="fill-foreground tabular-nums"
                formatter={(v) => fmtCompact.format(Number(v))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function BranchTable({
  branch,
  onSelectBranch,
}: {
  branch: string
  onSelectBranch: (id: string) => void
}) {
  const rows = useMemo(() => branchSummaries(), [])
  const totals = useMemo(
    () => ({
      loans: summary("all", "loans"),
      members: summary("all", "members"),
      visits: summary("all", "visits"),
    }),
    []
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branch performance</CardTitle>
        <CardDescription>
          Totals for {periodLabel} and change on the previous 12 months.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              {METRIC_KEYS.map((key) => (
                <TableHead key={key} className="text-right" colSpan={2}>
                  {METRICS[key].label}
                </TableHead>
              ))}
              <TableHead className="text-right">Loans per visit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                data-state={branch === r.id ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => onSelectBranch(branch === r.id ? "all" : r.id)}
              >
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {r.name}
                    {r.id === CLOSURE.branchId && (
                      <Badge variant="outline">Refurbished Jan–Mar</Badge>
                    )}
                  </span>
                </TableCell>
                {METRIC_KEYS.map((key) => (
                  <MetricCells key={key} s={r[key]} />
                ))}
                <TableCell className="text-right tabular-nums">
                  {(r.loans.current / r.visits.current).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-medium hover:bg-muted/50">
              <TableCell>All branches</TableCell>
              {METRIC_KEYS.map((key) => (
                <MetricCells key={key} s={totals[key]} />
              ))}
              <TableCell className="text-right tabular-nums">
                {(totals.loans.current / totals.visits.current).toFixed(2)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Select a row to focus the dashboard on that branch.
      </CardFooter>
    </Card>
  )
}

function MetricCells({ s }: { s: { current: number; change: number } }) {
  return (
    <>
      <TableCell className="text-right tabular-nums">
        {fmt.format(s.current)}
      </TableCell>
      <TableCell className="w-20 text-right">
        <Delta value={s.change} className="text-xs" />
      </TableCell>
    </>
  )
}
