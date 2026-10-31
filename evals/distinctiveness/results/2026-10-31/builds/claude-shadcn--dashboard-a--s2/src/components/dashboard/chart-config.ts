import type { ChartConfig } from "@/components/ui/chart"

// Categorical slots 1 (blue) and 2 (orange), stepped separately for each
// theme. "Cancelled" and "churn" share a color because they are the same
// entity seen two ways.
const blue = { light: "#2a78d6", dark: "#3987e5" }
const orange = { light: "#eb6834", dark: "#d95926" }

export const chartConfig = {
  mrr: { label: "MRR", theme: blue },
  newSubscriptions: { label: "New", theme: blue },
  cancelledSubscriptions: { label: "Cancelled", theme: orange },
  churnRate: { label: "Churn rate", theme: orange },
} satisfies ChartConfig
