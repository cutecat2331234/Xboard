import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchJsonList } from '@/lib/api'
import { t } from '@/lib/i18n'
import { JsonEditor } from '@/components/JsonEditor'

type Props = {
  titleKey: string
  apiPath: string
  useEditor?: boolean
}

export function ModulePage({ titleKey, apiPath, useEditor }: Props) {
  const [data, setData] = useState<unknown>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await fetchJsonList(apiPath)
        if (!cancelled) setData(rows)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiPath])

  const title = t(titleKey)

  if (useEditor) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {!loading && !error ? <JsonEditor value={data} readOnly /> : null}
          </CardContent>
        </Card>
      </div>
    )
  }

  const rows = Array.isArray(data) ? data : [data]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card className="shadow-md">
        <CardContent className="p-0">
          {loading ? <p className="p-4 text-sm text-muted-foreground">Loading...</p> : null}
          {error ? <p className="p-4 text-sm text-destructive">{error}</p> : null}
          {!loading && !error ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    {rows[0] && typeof rows[0] === 'object'
                      ? Object.keys(rows[0] as object)
                          .slice(0, 8)
                          .map((k) => (
                            <th key={k} className="px-3 py-2 text-left font-medium">
                              {k}
                            </th>
                          ))
                      : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-muted-foreground" colSpan={8}>
                        No data
                      </td>
                    </tr>
                  ) : (
                    rows.slice(0, 100).map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {row && typeof row === 'object'
                          ? Object.keys(rows[0] as object)
                              .slice(0, 8)
                              .map((k) => (
                                <td key={k} className="px-3 py-2 align-top">
                                  {String((row as Record<string, unknown>)[k] ?? '')}
                                </td>
                              ))
                          : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
