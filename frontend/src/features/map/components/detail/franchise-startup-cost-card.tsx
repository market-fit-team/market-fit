import { WalletCards } from "lucide-react"
import type { DistrictData } from "@/features/startup/lib/data"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

type FranchiseStartupCostCardProps = {
  franchises: DistrictData["recommendedFranchises"]
}

export function FranchiseStartupCostCard({
  franchises,
}: FranchiseStartupCostCardProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <WalletCards className="h-4 w-4 text-primary" />
          프랜차이즈 예상 창업 비용
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow>
              <TableHead>브랜드</TableHead>
              <TableHead>업종</TableHead>
              <TableHead className="text-right">예상 창업 비용</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {franchises.map((franchise) => (
              <TableRow key={franchise.name}>
                <TableCell className="font-medium text-foreground">
                  {franchise.name}
                </TableCell>
                <TableCell>{franchise.sector}</TableCell>
                <TableCell className="text-right font-mono font-medium text-foreground">
                  {franchise.minCapital.toLocaleString()}만원
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
