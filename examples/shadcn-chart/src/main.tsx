// A shadcn/ui chart on Altitude's tokens. Every prop that carries one of Altitude's chart rules is the one in
// Theming.md ("Recharts props that keep Altitude's rules"); build/checks/shadcn-chart.mjs reads the result back.
import * as React from "react"
import { createRoot } from "react-dom/client"
import { AltitudeProvider, type BuiltInScheme } from "altitude-design"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import "./index.css"

const months = [
  { month: "January", web: 186, ios: 80, android: 120, signups: 42, upgrades: 12 },
  { month: "February", web: 305, ios: 200, android: 160, signups: 58, upgrades: 19 },
  { month: "March", web: 237, ios: 120, android: 150, signups: 51, upgrades: 16 },
  { month: "April", web: 73, ios: 190, android: 110, signups: 64, upgrades: 22 },
  { month: "May", web: 209, ios: 130, android: 170, signups: 70, upgrades: 25 },
  { month: "June", web: 214, ios: 140, android: 180, signups: 77, upgrades: 31 },
]

const visits = {
  web: { label: "Web", color: "var(--chart-1)" },
  ios: { label: "iOS", color: "var(--chart-2)" },
  android: { label: "Android", color: "var(--chart-3)" },
} satisfies ChartConfig

const growth = {
  signups: { label: "Sign-ups", color: "var(--chart-4)" },
  upgrades: { label: "Upgrades", color: "var(--chart-5)" },
} satisfies ChartConfig

function usePrefersReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)"
  return React.useSyncExternalStore(
    (onChange) => {
      const list = matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => matchMedia(query).matches
  )
}

// Text in ink, never the series colour.
const tick = { fill: "var(--ink-muted)" }

function Panel({ scheme }: { scheme: BuiltInScheme }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  return (
    <AltitudeProvider scheme={scheme}>
      <section data-scheme={scheme} className="flex flex-col gap-4 bg-background p-4">
        <h2 className="m-0 text-sm font-medium text-muted-foreground">{scheme}</h2>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="m-0 mb-2 text-sm font-medium">Visits by platform</h3>
          <ChartContainer config={visits} className="min-h-[200px] w-full" data-chart-name="visits">
            <BarChart data={months} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={tick}
                tickFormatter={(value: string) => value.slice(0, 3)} />
              <YAxis tickLine={false} axisLine={false} width={32} tick={tick} />
              <ChartTooltip cursor={false}
                content={<ChartTooltipContent indicator="line" className="bg-popover shadow-lg" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="web" fill="var(--color-web)" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
              <Bar dataKey="ios" fill="var(--color-ios)" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
              <Bar dataKey="android" fill="var(--color-android)" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
              <ReferenceLine y={0} stroke="var(--ink-muted)" />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="m-0 mb-2 text-sm font-medium">Sign-ups and upgrades</h3>
          <ChartContainer config={growth} className="min-h-[200px] w-full" data-chart-name="growth">
            <AreaChart data={months} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={tick}
                tickFormatter={(value: string) => value.slice(0, 3)} />
              <YAxis tickLine={false} axisLine={false} width={32} tick={tick} />
              <ChartTooltip cursor={{ style: { stroke: "var(--line-control)" } }}
                content={<ChartTooltipContent indicator="line" className="bg-popover shadow-lg" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {/* Flat fills, no <defs> gradient. The stroke is the series colour too: Recharts takes the legend's and
                  the readout's swatch from it. */}
              <Area dataKey="signups" type="linear" stackId="a" fill="var(--color-signups)" fillOpacity={1}
                stroke="var(--color-signups)" strokeWidth={2} activeDot={false} isAnimationActive={!prefersReducedMotion} />
              <Area dataKey="upgrades" type="linear" stackId="a" fill="var(--color-upgrades)" fillOpacity={1}
                stroke="var(--color-upgrades)" strokeWidth={2} activeDot={false} isAnimationActive={!prefersReducedMotion} />
              <ReferenceLine y={0} stroke="var(--ink-muted)" />
            </AreaChart>
          </ChartContainer>
        </div>
      </section>
    </AltitudeProvider>
  )
}

function App() {
  return (
    <main className="grid grid-cols-2 gap-px">
      {(["daylight", "nightfall", "mesa", "alpine"] as const).map((scheme) => <Panel key={scheme} scheme={scheme} />)}
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
