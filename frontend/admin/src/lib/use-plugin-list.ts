import { useCallback, useEffect, useState } from 'react'
import { fetchJsonList } from '@/lib/api'
import type { PluginRow } from '@/lib/plugin-types'

let cachedPlugins: PluginRow[] | null = null
let inflight: Promise<PluginRow[]> | null = null

async function loadPluginList(): Promise<PluginRow[]> {
  if (cachedPlugins) return cachedPlugins
  if (inflight) return inflight
  inflight = fetchJsonList('/plugin/getPlugins')
    .then((rows) => {
      cachedPlugins = rows as PluginRow[]
      return cachedPlugins
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function invalidatePluginListCache() {
  cachedPlugins = null
}

export function usePluginList() {
  const [plugins, setPlugins] = useState<PluginRow[]>(cachedPlugins ?? [])
  const [loading, setLoading] = useState(!cachedPlugins)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    invalidatePluginListCache()
    setLoading(true)
    setError(null)
    try {
      const rows = await loadPluginList()
      setPlugins(rows)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load plugins'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (cachedPlugins) {
      setPlugins(cachedPlugins)
      setLoading(false)
      return
    }
    void reload()
  }, [reload])

  return { plugins, loading, error, reload }
}
