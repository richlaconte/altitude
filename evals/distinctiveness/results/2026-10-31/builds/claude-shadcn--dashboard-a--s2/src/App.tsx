import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { ChurnChart, MrrChart, SubscriptionsChart } from "@/components/dashboard/charts"
import { MonthlyTable } from "@/components/dashboard/monthly-table"
import { monthlyMetrics } from "@/lib/sample-data"

const ranges = [
  { value: "12", label: "12 months" },
  { value: "6", label: "6 months" },
  { value: "3", label: "3 months" },
]

function useDarkMode() {
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  )
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])
  return [dark, setDark] as const
}

export default function App() {
  const [range, setRange] = useState("12")
  const [dark, setDark] = useDarkMode()

  const visible = monthlyMetrics.slice(-Number(range))
  const latest = monthlyMetrics[monthlyMetrics.length - 1]

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Subscription performance through {latest.fullLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={(value) => setRange(String(value))}>
            <TabsList aria-label="Chart time range">
              {ranges.map((r) => (
                <TabsTrigger key={r.value} value={r.value} className="px-3">
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDark(!dark)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      <KpiCards data={monthlyMetrics} />

      <MrrChart data={visible} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SubscriptionsChart data={visible} />
        <ChurnChart data={visible} />
      </div>

      <MonthlyTable data={visible} />
    </main>
  )
}
