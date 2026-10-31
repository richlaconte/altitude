import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatCurrency,
  formatNumber,
  formatSignedPercent,
  percentChange,
} from "@/lib/format"
import type { MonthlyMetrics } from "@/lib/sample-data"

type Kpi = {
  title: string
  value: string
  change: number
  /** Whether a rise in this metric is good news */
  higherIsBetter: boolean
  comparison: string
}

function Delta({ change, higherIsBetter }: Pick<Kpi, "change" | "higherIsBetter">) {
  const rounded = Math.round(change * 10) / 10
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus
  const good = rounded === 0 ? null : rounded > 0 === higherIsBetter

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        good === true && "text-[#006300] dark:text-[#0ca30c]",
        good === false && "text-[#d03b3b]",
        good === null && "text-muted-foreground"
      )}
    >
      <Icon className="size-4" aria-hidden />
      {formatSignedPercent(rounded)}
      <span className="sr-only">
        {good === null ? "(unchanged)" : good ? "(improvement)" : "(decline)"}
      </span>
    </span>
  )
}

export function KpiCards({ data }: { data: MonthlyMetrics[] }) {
  const current = data[data.length - 1]
  const previous = data[data.length - 2]
  const yearAgo = data[0]
  const vsPrevious = `vs ${previous.fullLabel}`

  const kpis: Kpi[] = [
    {
      title: "Monthly recurring revenue",
      value: formatCurrency(current.mrr),
      change: percentChange(current.mrr, previous.mrr),
      higherIsBetter: true,
      comparison: `${vsPrevious} · ${formatSignedPercent(
        percentChange(current.mrr, yearAgo.mrr)
      )} since ${yearAgo.fullLabel}`,
    },
    {
      title: "Active subscriptions",
      value: formatNumber(current.activeSubscriptions),
      change: percentChange(current.activeSubscriptions, previous.activeSubscriptions),
      higherIsBetter: true,
      comparison: vsPrevious,
    },
    {
      title: "New subscriptions",
      value: formatNumber(current.newSubscriptions),
      change: percentChange(current.newSubscriptions, previous.newSubscriptions),
      higherIsBetter: true,
      comparison: vsPrevious,
    },
    {
      title: "Cancelled subscriptions",
      value: formatNumber(current.cancelledSubscriptions),
      change: percentChange(current.cancelledSubscriptions, previous.cancelledSubscriptions),
      higherIsBetter: false,
      comparison: `${vsPrevious} · ${current.churnRate.toFixed(1)}% churn`,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader>
            <CardDescription>{kpi.title}</CardDescription>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              {kpi.value}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
            <Delta change={kpi.change} higherIsBetter={kpi.higherIsBetter} />
            <span>{kpi.comparison}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
