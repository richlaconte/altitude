import { Badge } from "@/components/ui/badge"
import type { Stage } from "@/data/account"
import { cn } from "@/lib/utils"

const stageStyles: Record<Stage, string> = {
  Prospect: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Customer: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "At risk": "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  Churned: "bg-muted text-muted-foreground",
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge variant="secondary" className={cn(stageStyles[stage])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {stage}
    </Badge>
  )
}
