import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { postJson } from '@/lib/api'
import { moveListItem, reorderList } from '@/lib/list-sort'

type SortableRow = { id?: number }

export function useIdListSort<T extends SortableRow>(items: T[], sortPath: string) {
  const { t } = useTranslation()
  const [sortMode, setSortMode] = useState(false)
  const [sortRows, setSortRows] = useState<T[]>([])
  const [sortSaving, setSortSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const enterSort = useCallback(() => {
    setSortRows([...items])
    setSortMode(true)
  }, [items])

  const cancelSort = useCallback(() => {
    setSortMode(false)
    setSortRows([])
    setDragIndex(null)
  }, [])

  const saveSort = useCallback(async () => {
    setSortSaving(true)
    try {
      await postJson(sortPath, { ids: sortRows.map((row) => Number(row.id)) })
      toast.success(t('common.success'))
      setSortMode(false)
      setSortRows([])
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
      return false
    } finally {
      setSortSaving(false)
    }
  }, [sortPath, sortRows, t])

  const moveUp = useCallback((index: number) => {
    setSortRows((rows) => moveListItem(rows, index, 'up'))
  }, [])

  const moveDown = useCallback((index: number) => {
    setSortRows((rows) => moveListItem(rows, index, 'down'))
  }, [])

  const handleDrop = useCallback(
    (toIndex: number) => {
      if (dragIndex == null || dragIndex === toIndex) return
      setSortRows((rows) => reorderList(rows, dragIndex, toIndex))
      setDragIndex(null)
    },
    [dragIndex],
  )

  return {
    sortMode,
    sortRows,
    sortSaving,
    dragIndex,
    setDragIndex,
    displayRows: sortMode ? sortRows : items,
    enterSort,
    cancelSort,
    saveSort,
    moveUp,
    moveDown,
    handleDrop,
  }
}
