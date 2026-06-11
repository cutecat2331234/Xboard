import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'

type Props = {
  onCancel: () => void
  onSubmit?: () => void
  cancelLabel: string
  submitLabel: string
  submitting?: boolean
  submitDisabled?: boolean
  submitIcon?: ReactNode
  extraLeft?: ReactNode
}

/** 7001 KXt dialog footer: ghost cancel + bold submit, optional left slot. */
export function DialogFormFooter({
  onCancel,
  onSubmit,
  cancelLabel,
  submitLabel,
  submitting = false,
  submitDisabled = false,
  submitIcon,
  extraLeft,
}: Props) {
  return (
    <DialogFooter className="shrink-0 border-t px-6 py-3">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-2">{extraLeft}</div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-4 text-xs font-bold"
            onClick={onCancel}
            disabled={submitting}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitting || submitDisabled}
            className="h-8 gap-2 px-8 text-xs font-bold"
          >
            {submitIcon}
            {submitLabel}
          </Button>
        </div>
      </div>
    </DialogFooter>
  )
}
