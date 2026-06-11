import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const pagBtnEdge =
  'items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hidden h-8 w-8 p-0 lg:flex'
const pagBtnMid =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0'

function RadixChevronDown() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" aria-hidden>
      <path
        d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}

function RadixChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" aria-hidden>
      <path
        d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}

function RadixChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" aria-hidden>
      <path
        d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}

function RadixDoubleChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" aria-hidden>
      <path
        d="M6.85355 3.85355C7.04882 3.65829 7.04882 3.34171 6.85355 3.14645C6.65829 2.95118 6.34171 2.95118 6.14645 3.14645L2.14645 7.14645C1.95118 7.34171 1.95118 7.65829 2.14645 7.85355L6.14645 11.8536C6.34171 12.0488 6.65829 12.0488 6.85355 11.8536C7.04882 11.6583 7.04882 11.3417 6.85355 11.1464L3.20711 7.5L6.85355 3.85355ZM12.8536 3.85355C13.0488 3.65829 13.0488 3.34171 12.8536 3.14645C12.6583 2.95118 12.3417 2.95118 12.1464 3.14645L8.14645 7.14645C7.95118 7.34171 7.95118 7.65829 8.14645 7.85355L12.1464 11.8536C12.3417 12.0488 12.6583 12.0488 12.8536 11.8536C13.0488 11.6583 13.0488 11.3417 12.8536 11.1464L9.20711 7.5L12.8536 3.85355Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}

function RadixDoubleChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" aria-hidden>
      <path
        d="M2.14645 11.1464C1.95118 11.3417 1.95118 11.6583 2.14645 11.8536C2.34171 12.0488 2.65829 12.0488 2.85355 11.8536L6.85355 7.85355C7.04882 7.65829 7.04882 7.34171 6.85355 7.14645L2.85355 3.14645C2.65829 2.95118 2.34171 2.95118 2.14645 3.14645C1.95118 3.34171 1.95118 3.65829 2.14645 3.85355L5.79289 7.5L2.14645 11.1464ZM8.14645 11.1464C7.95118 11.3417 7.95118 11.6583 8.14645 11.8536C8.34171 12.0488 8.65829 12.0488 8.85355 11.8536L12.8536 7.85355C13.0488 7.65829 13.0488 7.34171 12.8536 7.14645L8.85355 3.14645C8.65829 2.95118 8.34171 2.95118 8.14645 3.14645C7.95118 3.34171 7.95118 3.65829 8.14645 3.85355L11.7929 7.5L8.14645 11.1464Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}

type Props<T> = {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  loading?: boolean
  emptyText?: string
  pageSize?: number
  alwaysShowPagination?: boolean
  /** Server-side pagination: total item count for footer text */
  totalItems?: number
  /** Server-side pagination: 0-based current page index */
  pageIndex?: number
  /** Server-side pagination: total page count */
  pageCount?: number
  onPageIndexChange?: (pageIndex: number) => void
  tableClassName?: string
  headClassName?: string
  cellClassName?: string
  rowClassName?: string
  colWidths?: number[]
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyText,
  pageSize = 10,
  alwaysShowPagination,
  totalItems,
  pageIndex: externalPageIndex,
  pageCount: externalPageCount,
  onPageIndexChange,
  tableClassName,
  headClassName,
  cellClassName,
  rowClassName,
  colWidths,
}: Props<T>) {
  const { t } = useTranslation()
  const manualPagination = externalPageIndex != null && externalPageCount != null

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination
      ? { manualPagination: true, pageCount: externalPageCount }
      : { getPaginationRowModel: getPaginationRowModel() }),
    initialState: { pagination: { pageSize, pageIndex: externalPageIndex ?? 0 } },
    state: manualPagination
      ? { pagination: { pageIndex: externalPageIndex, pageSize } }
      : undefined,
    onPaginationChange: manualPagination
      ? (updater) => {
          const prev = { pageIndex: externalPageIndex, pageSize }
          const next = typeof updater === 'function' ? updater(prev) : updater
          onPageIndexChange?.(next.pageIndex)
        }
      : undefined,
  })

  const pageCount = manualPagination ? externalPageCount : table.getPageCount()
  const pageIndex = manualPagination ? externalPageIndex : table.getState().pagination.pageIndex
  const itemTotal = totalItems ?? data.length
  const canPrevious = manualPagination ? pageIndex > 0 : table.getCanPreviousPage()
  const canNext = manualPagination ? pageIndex < pageCount - 1 : table.getCanNextPage()

  const showFooter = alwaysShowPagination || data.length > 0 || loading

  return (
    <div className="space-y-4">
      <div className={tableClassName ?? 'rounded-md border'}>
        <Table className={colWidths?.length ? 'table-fixed' : undefined}>
          {colWidths?.length ? (
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} style={{ width: `${w}px` }} />
              ))}
            </colgroup>
          ) : null}
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className={headClassName}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className={cn('h-24 text-center text-muted-foreground', cellClassName)}
                >
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className={cn('h-24 text-center text-muted-foreground', cellClassName)}
                >
                  {emptyText ?? t('common.table.noData')}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={rowClassName}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cellClassName}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showFooter ? (
        <div className="flex flex-col-reverse gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {t('common.table.pagination.selected', { selected: 0, total: itemTotal })}
          </div>
          <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">{t('common.table.pagination.itemsPerPage')}</p>
              <button
                type="button"
                role="combobox"
                aria-expanded="false"
                aria-autocomplete="none"
                dir="ltr"
                data-state="closed"
                className="flex items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 h-8 w-[70px]"
              >
                <span style={{ pointerEvents: 'none' }}>{pageSize}</span>
                <RadixChevronDown />
              </button>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm font-medium">
              <span>{t('common.table.pagination.page')}</span>
              <input
                type="text"
                className="flex rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 h-8 w-[50px] text-center"
                value={String(pageIndex + 1)}
              />
              <span>{t('common.table.pagination.pageOf', { total: pageCount || 0 })}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className={pagBtnEdge}
                onClick={() => (manualPagination ? onPageIndexChange?.(0) : table.setPageIndex(0))}
                disabled={!canPrevious}
              >
                <span className="sr-only">{t('common.table.pagination.firstPage')}</span>
                <RadixDoubleChevronLeft />
              </button>
              <button
                type="button"
                className={pagBtnMid}
                onClick={() =>
                  manualPagination
                    ? onPageIndexChange?.(pageIndex - 1)
                    : table.previousPage()
                }
                disabled={!canPrevious}
              >
                <span className="sr-only">{t('common.table.pagination.previousPage')}</span>
                <RadixChevronLeft />
              </button>
              <button
                type="button"
                className={pagBtnMid}
                onClick={() =>
                  manualPagination ? onPageIndexChange?.(pageIndex + 1) : table.nextPage()
                }
                disabled={!canNext}
              >
                <span className="sr-only">{t('common.table.pagination.nextPage')}</span>
                <RadixChevronRight />
              </button>
              <button
                type="button"
                className={pagBtnEdge}
                onClick={() =>
                  manualPagination
                    ? onPageIndexChange?.(pageCount - 1)
                    : table.setPageIndex(pageCount - 1)
                }
                disabled={!canNext}
              >
                <span className="sr-only">{t('common.table.pagination.lastPage')}</span>
                <RadixDoubleChevronRight />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
