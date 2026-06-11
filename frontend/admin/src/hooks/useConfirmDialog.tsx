import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export type ConfirmDialogOptions = {
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmDialogExtraOptions = Omit<ConfirmDialogOptions, 'title' | 'description'>

function normalizeConfirmOptions(
  optsOrTitle: ConfirmDialogOptions | string,
  description?: string,
  extra?: ConfirmDialogExtraOptions,
): ConfirmDialogOptions {
  if (typeof optsOrTitle === 'string') {
    if (description !== undefined) {
      return { title: optsOrTitle, description, ...extra }
    }
    return { description: optsOrTitle, ...extra }
  }
  return optsOrTitle
}

export function useConfirmDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmDialogOptions>({ description: '' })
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback(
    (
      optsOrTitle: ConfirmDialogOptions | string,
      description?: string,
      extra?: ConfirmDialogExtraOptions,
    ) => {
      const normalized = normalizeConfirmOptions(optsOrTitle, description, extra)
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve
        setOptions(normalized)
        setOpen(true)
      })
    },
    [],
  )

  const finish = useCallback((value: boolean) => {
    resolveRef.current?.(value)
    resolveRef.current = null
    setOpen(false)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) finish(false)
      else setOpen(true)
    },
    [finish],
  )

  const ConfirmDialog = useCallback(
    () => (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {options.title ? <AlertDialogTitle>{options.title}</AlertDialogTitle> : null}
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => finish(false)}>
              {options.cancelLabel ?? t('common.cancel', { defaultValue: '取消' })}
            </AlertDialogCancel>
            <AlertDialogAction destructive={options.destructive !== false} onClick={() => finish(true)}>
              {options.confirmLabel ?? t('common.confirm', { defaultValue: '确定' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
    [finish, handleOpenChange, open, options, t],
  )

  return { confirm, ConfirmDialog }
}
