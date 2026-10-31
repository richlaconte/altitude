import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatSignedNumber,
  formatSignedPercent,
  percentChange,
} from "@/lib/format"
import type { MonthlyMetrics } from "@/lib/sample-data"

const numeric = "text-right tabular-nums"

export function MonthlyTable({ data }: { data: MonthlyMetrics[] }) {
  // Most recent month first; each row compares against the month before it.
  const rows = data
    .map((month, i) => ({ month, previous: data[i - 1] }))
    .reverse()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly breakdown</CardTitle>
        <CardDescription>The figures behind the charts above</CardDescription>
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
              <TableHead className="text-right">Churn rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ month, previous }) => (
              <TableRow key={month.month}>
                <TableCell className="font-medium">{month.fullLabel}</TableCell>
                <TableCell className={numeric}>{formatCurrency(month.mrr)}</TableCell>
                <TableCell className={`${numeric} text-muted-foreground`}>
                  {previous ? formatSignedPercent(percentChange(month.mrr, previous.mrr)) : "—"}
                </TableCell>
                <TableCell className={numeric}>{formatNumber(month.newSubscriptions)}</TableCell>
                <TableCell className={numeric}>
                  {formatNumber(month.cancelledSubscriptions)}
                </TableCell>
                <TableCell className={numeric}>
                  {formatSignedNumber(month.netSubscriptions)}
                </TableCell>
                <TableCell className={numeric}>
                  {formatNumber(month.activeSubscriptions)}
                </TableCell>
                <TableCell className={numeric}>{formatPercent(month.churnRate, 2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
