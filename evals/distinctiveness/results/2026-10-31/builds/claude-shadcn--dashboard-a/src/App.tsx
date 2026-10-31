import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import {
  Card,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  baseline,
  compactCurrency,
  currency,
  monthlyMetrics,
  number,
  pctChange,
  percent,
} from "@/data/metrics"

// Categorical slots 1 and 2, stepped separately for light and dark surfaces.
const BLUE = { light: "#2a78d6", dark: "#3987e5" }
const ORANGE = { light: "#eb6834", dark: "#d95926" }

const mrrConfig = {
  mrr: { label: "MRR", theme: BLUE },
} satisfies ChartConfig

const subsConfig = {
  newSubs: { label: "New", theme: BLUE },
  cancelledSubs: { label: "Cancelled", theme: ORANGE },
} satisfies ChartConfig

const first = monthlyMetrics[0]
const latest = monthlyMetrics[monthlyMetrics.length - 1]
const previous = monthlyMetrics[monthlyMetrics.length - 2]
const totalNew = monthlyMetrics.reduce((sum, m) => sum + m.newSubs, 0)
const totalCancelled = monthlyMetrics.reduce((sum, m) => sum + m.cancelledSubs, 0)

const shortMonth = (label: string) => label.slice(0, 3)

export default function App() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Subscription performance, {first.label} – {latest.label}
          </p>
        </div>
        <Badge variant="outline">Sample data</Badge>
      </header>

      <section
        aria-label="Key metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title="Monthly recurring revenue"
          value={currency.format(latest.mrr)}
          change={pctChange(latest.mrr, previous.mrr)}
          comparison={`vs ${previous.label}`}
          footer={`${formatSigned(pctChange(latest.mrr, baseline.mrr))} over 12 months`}
        />
        <StatCard
          title="Active subscriptions"
          value={number.format(latest.activeSubs)}
          change={pctChange(latest.activeSubs, previous.activeSubs)}
          comparison={`vs ${previous.label}`}
          footer={`Avg. revenue per subscription ${currency.format(latest.arpu)}`}
        />
        <StatCard
          title={`New subscriptions · ${shortMonth(latest.label)}`}
          value={number.format(latest.newSubs)}
          change={pctChange(latest.newSubs, previous.newSubs)}
          comparison={`vs ${previous.label}`}
          footer={`${number.format(totalNew)} in the last 12 months`}
        />
        <StatCard
          title={`Cancelled subscriptions · ${shortMonth(latest.label)}`}
          value={number.format(latest.cancelledSubs)}
          change={pctChange(latest.cancelledSubs, previous.cancelledSubs)}
          comparison={`vs ${previous.label}`}
          higherIsBetter={false}
          footer={`Monthly churn ${percent.format(latest.churnRate)} · ${number.format(totalCancelled)} in 12 months`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly recurring revenue</CardTitle>
            <CardDescription>
              Up {currency.format(latest.mrr - baseline.mrr)} since{" "}
              {first.label}. The March price change raised revenue per
              subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={mrrConfig} className="aspect-auto h-72 w-full">
              <AreaChart data={monthlyMetrics} margin={{ left: 4, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="mrr-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-mrr)" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="var(--color-mrr)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={shortMonth}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v: number) => compactCurrency.format(v)}
                />
                <ChartTooltip
                  cursor={{ strokeWidth: 1 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <TooltipRow
                          color="var(--color-mrr)"
                          label="MRR"
                          value={currency.format(Number(value))}
                        />
                      )}
                    />
                  }
                />
                <Area
                  dataKey="mrr"
                  type="monotone"
                  stroke="var(--color-mrr)"
                  strokeWidth={2}
                  fill="url(#mrr-fill)"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New vs. cancelled subscriptions</CardTitle>
            <CardDescription>
              Net gain of {number.format(totalNew - totalCancelled)} subscriptions
              over 12 months. Cancellations peaked in March after the price change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={subsConfig} className="aspect-auto h-72 w-full">
              <BarChart
                data={monthlyMetrics}
                barGap={2}
                barCategoryGap="24%"
                margin={{ left: 4, right: 12, top: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={shortMonth}
                />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend verticalAlign="top" content={<ChartLegendContent />} />
                <Bar dataKey="newSubs" fill="var(--color-newSubs)" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="cancelledSubs"
                  fill="var(--color-cancelledSubs)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Monthly breakdown</CardTitle>
          <CardDescription>
            Churn is cancellations as a share of subscriptions active at the start
            of the month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">MRR change</TableHead>
                <TableHead className="text-right">New</TableHead>
                <TableHead className="text-right">Cancelled</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Churn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tabular-nums">
              {[...monthlyMetrics].reverse().map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-right">{currency.format(m.mrr)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {m.mrrChange >= 0 ? "+" : "−"}
                    {currency.format(Math.abs(m.mrrChange))}
                  </TableCell>
                  <TableCell className="text-right">{number.format(m.newSubs)}</TableCell>
                  <TableCell className="text-right">
                    {number.format(m.cancelledSubs)}
                  </TableCell>
                  <TableCell className="text-right">+{number.format(m.netSubs)}</TableCell>
                  <TableCell className="text-right">{number.format(m.activeSubs)}</TableCell>
                  <TableCell className="text-right">{percent.format(m.churnRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : "−"}${percent.format(Math.abs(value))}`
}

function StatCard({
  title,
  value,
  change,
  comparison,
  footer,
  higherIsBetter = true,
}: {
  title: string
  value: string
  change: number
  comparison: string
  footer: string
  higherIsBetter?: boolean
}) {
  const up = change >= 0
  const good = up === higherIsBetter
  const Icon = up ? ArrowUpRight : ArrowDownRight

  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="flex items-center gap-1 text-sm">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              good
                ? "text-[#006300] dark:text-[#0ca30c]"
                : "text-[#d03b3b] dark:text-[#e66767]"
            )}
          >
            <Icon className="size-4" aria-hidden />
            {formatSigned(change)}
          </span>
          <span className="text-muted-foreground">{comparison}</span>
        </p>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">{footer}</CardFooter>
    </Card>
  )
}

function TooltipRow({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
      </div>
    </div>
  )
}
