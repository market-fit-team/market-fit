import type { UseFormRegisterReturn } from "react-hook-form"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"

interface HitlEditedActionEditorProps {
  nameRegistration: UseFormRegisterReturn
  argsTextRegistration: UseFormRegisterReturn
}

export function HitlEditedActionEditor({
  nameRegistration,
  argsTextRegistration,
}: HitlEditedActionEditorProps) {
  return (
    <div className="grid gap-2">
      <Input {...nameRegistration} />
      <Textarea
        rows={8}
        {...argsTextRegistration}
        className="font-mono text-sm"
      />
    </div>
  )
}
