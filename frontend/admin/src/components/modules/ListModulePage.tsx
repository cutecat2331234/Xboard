import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchJsonList } from '@/lib/api'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  titleKey: string
  descriptionKey?: string
  apiPath: string
  columns: ColumnDef<Record<string, unknown>, unknown>[]
  searchPlaceholderKey?: string
  createLabelKey?: string
  actions?: React.ReactNode
}

const inputCls =
  'h-8 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export function ListModulePage({
  titleKey,
  descriptionKey,
  apiPath,
  columns,
  searchPlaceholderKey,
  createLabelKey,
  actions,
}: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchJsonList(apiPath)
      .then((rows) => setData(rows as Record<string, unknown>[]))
      .catch((e) => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [apiPath, t])

  const cols = useMemo(() => columns, [columns])

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      Object.values(row).some((v) => v != null && String(v).toLowerCase().includes(q)),
    )
  }, [data, search])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between space-y-2">
        <div>
          <h2 className="m-0 text-2xl font-bold tracking-tight">{t(titleKey)}</h2>
          {descriptionKey ? (
            <p className="mt-2 text-muted-foreground">{t(descriptionKey)}</p>
          ) : null}
        </div>
      </div>

      <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
        <div className="w-full space-y-4">
          {(searchPlaceholderKey || createLabelKey || actions) && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {createLabelKey ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-0 space-x-2 px-3 text-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t(createLabelKey)}</span>
                  </Button>
                ) : null}
                {actions}
                {searchPlaceholderKey ? (
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t(searchPlaceholderKey)}
                    className={`h-8 min-w-[150px] flex-1 sm:w-[150px] lg:w-[250px] ${inputCls}`}
                  />
                ) : null}
              </div>
            </div>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DataTable columns={cols} data={filtered} loading={loading} />
        </div>
      </div>
    </div>
  )
}

function cellValue(val: unknown) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

/** @deprecated Use localeColumns or mappedColumns */
export function simpleColumns(keys: string[]): ColumnDef<Record<string, unknown>, unknown>[] {
  return keys.map((key) => ({
    accessorKey: key,
    header: key,
    cell: ({ row }) => cellValue(row.original[key]),
  }))
}

export function localeColumns(
  t: TFunction,
  prefix: string,
  keys: string[],
): ColumnDef<Record<string, unknown>, unknown>[] {
  return keys.map((key) => ({
    accessorKey: key,
    header: () => t(`${prefix}.${key}`),
    cell: ({ row }) => cellValue(row.original[key]),
  }))
}

export function mappedColumns(
  t: TFunction,
  fields: Array<{ key: string; headerKey: string }>,
): ColumnDef<Record<string, unknown>, unknown>[] {
  return fields.map(({ key, headerKey }) => ({
    accessorKey: key,
    header: () => t(headerKey),
    cell: ({ row }) => cellValue(row.original[key]),
  }))
}
