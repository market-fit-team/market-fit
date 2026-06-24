import { RotateCcw } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"

type ToolPolicyResetTriggerProps = {
  disabled?: boolean
  onReset: () => void
}

export function ToolPolicyResetTrigger({
  disabled,
  onReset,
}: ToolPolicyResetTriggerProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <AlertDialog>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                disabled={disabled}
              >
                <RotateCcw className="size-3" />
                <span className="sr-only">기본값으로 복원</span>
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">기본값으로 복원</TooltipContent>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>기본값으로 복원하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                모든 도구의 승인 상태가 초기화됩니다. 이 작업은 되돌릴 수
                없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction disabled={disabled} onClick={onReset}>
                복원
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Tooltip>
    </TooltipProvider>
  )
}
