export function reorderList<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items
  }
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function moveListItem<T>(items: T[], index: number, direction: 'up' | 'down'): T[] {
  const to = direction === 'up' ? index - 1 : index + 1
  return reorderList(items, index, to)
}
