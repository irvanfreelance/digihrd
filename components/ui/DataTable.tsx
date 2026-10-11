'use client'

import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}

export interface FilterOption {
  key: string
  label: string
  options: { label: string; value: string }[]
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchKeys?: (keyof T | string)[]
  filters?: FilterOption[]
  defaultPageSize?: number
  pageSizeOptions?: number[]
  emptyMessage?: string
  loading?: boolean
  showRowNumber?: boolean
  actions?: React.ReactNode
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = 'Cari data...',
  searchKeys = [],
  filters = [],
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyMessage = 'Tidak ada data ditemukan.',
  loading = false,
  showRowNumber = true,
  actions
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(defaultPageSize)

  // Reset page on search or filter change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterValues, pageSize])

  // Multifilter & Search Terms logic
  const filteredData = React.useMemo(() => {
    return data.filter(item => {
      // 1. Search term
      if (searchTerm.trim() !== '') {
        const terms = searchTerm.toLowerCase().split(' ').filter(Boolean)
        const matchAllTerms = terms.every(term => {
          if (searchKeys.length > 0) {
            return searchKeys.some(key => {
              const val = String(item[key] ?? '').toLowerCase()
              return val.includes(term)
            })
          }
          // Search in all object values
          return Object.values(item).some(val =>
            String(val ?? '').toLowerCase().includes(term)
          )
        })
        if (!matchAllTerms) return false
      }

      // 2. Multi-filter dropdowns
      for (const [key, filterVal] of Object.entries(filterValues)) {
        if (filterVal && filterVal !== 'all') {
          if (String(item[key]) !== String(filterVal)) {
            return false
          }
        }
      }

      return true
    })
  }, [data, searchTerm, filterValues, searchKeys])

  // Pagination calculation
  const totalRows = filteredData.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRows)
  const paginatedData = filteredData.slice(startIndex, endIndex)

  const handleFilterChange = (key: string, val: string) => {
    setFilterValues(prev => ({ ...prev, [key]: val }))
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterValues({})
  }

  const hasActiveFilters = searchTerm !== '' || Object.values(filterValues).some(v => v && v !== 'all')

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search Bar, Multi-Filter, PageSize & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
          {/* Search by terms */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#1D4ED8)] dark:text-white"
            />
          </div>

          {/* Multifilter Selects */}
          <div className="flex flex-wrap items-center gap-2">
            {filters.map(f => (
              <select
                key={f.key}
                value={filterValues[f.key] || 'all'}
                onChange={e => handleFilterChange(f.key, e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm font-medium dark:text-slate-200 flex-1 sm:flex-initial"
              >
                <option value="all">Semua {f.label}</option>
                {f.options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ))}

            {/* Reset button */}
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="h-10 text-xs text-red-600 gap-1.5 px-2.5"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Right side: Custom Actions */}
        {actions && <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">{actions}</div>}
      </div>

      {/* Table Section with Mobile Horizontal Scroll Indicator */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                {showRowNumber && (
                  <TableHead className="w-14 text-center whitespace-nowrap">No.</TableHead>
                )}
                {columns.map(col => (
                  <TableHead
                    key={col.key}
                    className={`whitespace-nowrap ${
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (showRowNumber ? 1 : 0)}
                    className="text-center py-10 text-slate-500 text-xs sm:text-sm"
                  >
                    Memuat data tabel...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (showRowNumber ? 1 : 0)}
                    className="text-center py-10 text-slate-500 text-xs sm:text-sm"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, idx) => {
                  const rowNumber = startIndex + idx + 1
                  return (
                    <TableRow key={row.id ?? idx}>
                      {showRowNumber && (
                        <TableCell className="text-center font-mono text-xs text-slate-400 font-semibold whitespace-nowrap">
                          {rowNumber}
                        </TableCell>
                      )}
                      {columns.map(col => (
                        <TableCell
                          key={col.key}
                          className={`text-xs sm:text-sm ${
                            col.align === 'center'
                              ? 'text-center'
                              : col.align === 'right'
                              ? 'text-right'
                              : 'text-left'
                          } ${col.className || ''}`}
                        >
                          {col.render ? col.render(row, idx) : row[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paging & Data Counter Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
            <span>
              Menampilkan{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {totalRows === 0 ? 0 : startIndex + 1}
              </strong>{' '}
              -{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {endIndex}
              </strong>{' '}
              dari{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {totalRows}
              </strong>
            </span>

            {/* Show per berapa data (Page Size Selector) */}
            <div className="flex items-center gap-1.5 ml-1">
              <span>Baris:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="h-7 px-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 text-xs"
              >
                {pageSizeOptions.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="h-8 w-8 p-0"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            <span className="px-2.5 font-semibold text-slate-800 dark:text-slate-200 text-xs">
              {currentPage} / {totalPages}
            </span>

            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="h-8 w-8 p-0"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
