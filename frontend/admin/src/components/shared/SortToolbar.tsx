import type { DragEvent } from 'react'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type Props = {
  sortMode: boolean
  saving?: boolean
  editLabel?: string
  saveLabel?: string
  hint?: string
  onEdit: () => void
  onSave: () => void
  onCancel?: () => void
}

export function SortToolbar({
  sortMode,
  saving,
  editLabel,
  saveLabel,
  hint,
  onEdit,
  onSave,
  onCancel,
}: Props) {
  const { t } = useTranslation()

  if (!sortMode) {
    return (
      <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={onEdit}>
        {editLabel ?? t('server.toolbar.sort.edit')}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {onCancel ? (
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </Button>
      ) : null}
      <Button size="sm" className="h-8 px-3 text-xs" onClick={onSave} disabled={saving}>
        {saveLabel ?? t('server.toolbar.sort.save')}
      </Button>
    </div>
  )
}

type SortRowControlsProps = {
  index: number
  total: number
  draggable?: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onDragStart?: (e: DragEvent) => void
  onDragOver?: (e: DragEvent) => void
  onDrop?: (e: DragEvent) => void
}

export function SortRowControls({
  index,
  total,
  draggable,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
}: SortRowControlsProps) {
  return (
    <div className="flex items-center gap-0.5">
      <span
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={index <= 0} onClick={onMoveUp}>
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={index >= total - 1}
        onClick={onMoveDown}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
