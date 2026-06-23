import type { DistrictData } from "@/features/startup/lib/data"

type RecommendationItemProps = {
  isSelected: boolean
  onSelect: () => void
  tradeArea: DistrictData
}

export function RecommendationItem({
  isSelected,
  onSelect,
  tradeArea,
}: RecommendationItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/40"
      }`}
    >
      <span className="min-w-0 truncate font-medium text-foreground">
        {tradeArea.nameKo}
      </span>
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold ${
          isSelected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-muted/40 text-foreground"
        }`}
      >
        {tradeArea.densityScore}
      </span>
    </button>
  )
}
