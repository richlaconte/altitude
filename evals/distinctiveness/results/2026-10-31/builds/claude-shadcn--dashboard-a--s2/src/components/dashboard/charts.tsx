import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { chartConfig } from "@/components/dashboard/chart-config"
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatSignedNumber,
  formatSignedPercent,
  percentChange,
} from "@/lib/format"
import type { MonthlyMetrics } from "@/lib/sample-data"

type ChartProps = { data: MonthlyMetrics[] }

const fullLabel = (_: unknown, payload: ReadonlyArray<{ payload?: MonthlyMetrics }>) =>
  payload[0]?.payload?.fullLabel

// Dots get a ring in the card color so they stay legible over the line.
const activeDot = { r: 5, strokeWidth: 2, stroke: "var(--card)" }

function TooltipRow({ name, value, color }: { name: string; value: string; color: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
      <span className="flex-1 text-muted-foreground">{name}</span>
      <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
    </div>
  )
}

export function MrrChart({ data }: ChartProps) {
  const first = data[0]
  const last = data[data.length - 1]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly recurring revenue</CardTitle>
        <CardDescription>
          {formatCurrency(first.mrr)} → {formatCurrency(last.mrr)} (
          {formatSignedPercent(percentChange(last.mrr, first.mrr))}) from {first.fullLabel} to{" "}
          {last.fullLabel}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={formatCompactCurrency}
            />
            <ChartTooltip
              cursor={{ strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  labelFormatter={fullLabel}
                  formatter={(value) => (
                    <TooltipRow
                      name="MRR"
                      value={formatCurrency(Number(value))}
                      color="var(--color-mrr)"
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
              fill="var(--color-mrr)"
              fillOpacity={0.1}
              activeDot={activeDot}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function SubscriptionsChart({ data }: ChartProps) {
  const totalNew = data.reduce((sum, d) => sum + d.newSubscriptions, 0)
  const totalCancelled = data.reduce((sum, d) => sum + d.cancelledSubscriptions, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>New and cancelled subscriptions</CardTitle>
        <CardDescription>
          {formatNumber(totalNew)} new, {formatNumber(totalCancelled)} cancelled (
          {formatSignedNumber(totalNew - totalCancelled)} net) over {data.length} months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <BarChart
            data={data}
            barGap={2}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip
              cursor={{ fillOpacity: 0.5 }}
              content={
                <ChartTooltipContent
                  labelFormatter={fullLabel}
                  formatter={(value, name, item) => (
                    <TooltipRow
                      name={chartConfig[name as keyof typeof chartConfig].label}
                      value={formatNumber(Number(value))}
                      color={item.color ?? "currentColor"}
                    />
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
            <Bar
              dataKey="newSubscriptions"
              fill="var(--color-newSubscriptions)"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            <Bar
              dataKey="cancelledSubscriptions"
              fill="var(--color-cancelledSubscriptions)"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function ChurnChart({ data }: ChartProps) {
  const average = data.reduce((sum, d) => sum + d.churnRate, 0) / data.length
  const last = data[data.length - 1]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription churn rate</CardTitle>
        <CardDescription>
          {formatPercent(last.churnRate, 2)} in {last.fullLabel}; {formatPercent(average, 2)}{" "}
          average. Cancellations ÷ active subscriptions at start of month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              domain={[0, "auto"]}
              tickFormatter={(value: number) => formatPercent(value)}
            />
            <ChartTooltip
              cursor={{ strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  labelFormatter={fullLabel}
                  formatter={(value) => (
                    <TooltipRow
                      name="Churn rate"
                      value={formatPercent(Number(value), 2)}
                      color="var(--color-churnRate)"
                    />
                  )}
                />
              }
            />
            <Line
              dataKey="churnRate"
              type="monotone"
              stroke="var(--color-churnRate)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDot}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
