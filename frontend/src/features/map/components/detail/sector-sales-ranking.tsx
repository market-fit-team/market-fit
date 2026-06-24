import { BarChart3 } from "lucide-react"
import type { SectorSalesRank } from "@/features/map/types/map"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

type SectorSalesRankingProps = {
  rankings: SectorSalesRank[]
}

export function SectorSalesRankingSection({
  rankings,
}: SectorSalesRankingProps) {
  return (
    <section aria-labelledby="sector-sales-ranking-title">
      <h3
        id="sector-sales-ranking-title"
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
      >
        <BarChart3 className="h-4 w-4 text-primary" />
        업종별 추정매출
      </h3>
      <div className="mt-4 overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>순위</TableHead>
              <TableHead>업종</TableHead>
              <TableHead>추정매출</TableHead>
              <TableHead>전분기 대비</TableHead>
              <TableHead>점포 수</TableHead>
              <TableHead>점포당 매출 추정</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.map((row) => (
              <TableRow key={row.rank}>
                <TableCell className="font-mono font-semibold text-foreground">
                  {row.rank}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {row.sector}
                </TableCell>
                <TableCell className="font-mono">
                  {row.estimatedSales.toLocaleString()}만원
                </TableCell>
                <TableCell
                  className={`font-mono font-medium ${
                    row.qoqChange >= 0 ? "text-foreground" : "text-destructive"
                  }`}
                >
                  {row.qoqChange >= 0 ? "+" : ""}
                  {row.qoqChange}%
                </TableCell>
                <TableCell className="font-mono">
                  {row.storeCount.toLocaleString()}개
                </TableCell>
                <TableCell className="font-mono">
                  {row.salesPerStore.toLocaleString()}만원
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
