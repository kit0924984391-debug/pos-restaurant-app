'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchPlaceholder?: string;
  globalSearch?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
}

/**
 * Production-ready Headless DataTable powered by TanStack Table v8.
 * Provides client-side sorting, filtering, and pagination with zero opinionated style lock-in.
 */
export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = 'ค้นหาข้อมูล...',
  globalSearch = false,
  pageSize = 15,
  emptyMessage = 'ไม่พบข้อมูลในตาราง',
  className = '',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Memoize data to prevent unnecessary re-renders per TanStack Table best practices
  const memoizedData = useMemo(() => data, [data]);
  const memoizedColumns = useMemo(() => columns, [columns]);

  const table = useReactTable({
    data: memoizedData,
    columns: memoizedColumns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className={`space-y-3 w-full ${className}`}>
      {/* Optional Global Search Filter */}
      {globalSearch && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-xs"
            />
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            ทั้งหมด {table.getFilteredRowModel().rows.length} รายการ
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto w-full max-w-full rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="whitespace-nowrap">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className="py-3 sm:py-3.5 px-4 sm:px-6 select-none"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center space-x-1.5 font-bold hover:text-slate-900 group cursor-pointer"
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          <span className="text-slate-400 group-hover:text-slate-600">
                            {isSorted === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
                            ) : isSorted === 'desc' ? (
                              <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                            )}
                          </span>
                        </button>
                      ) : (
                        <div>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-slate-400 text-xs font-semibold"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/80 transition-colors whitespace-nowrap"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3 sm:py-3.5 px-4 sm:px-6">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {table.getPageCount() > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-1 text-xs">
          <div className="text-slate-500 font-medium text-[11px] sm:text-xs">
            แสดงแถวที่{' '}
            <span className="font-bold text-slate-700">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>{' '}
            ถึง{' '}
            <span className="font-bold text-slate-700">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{' '}
            จากทั้งหมด{' '}
            <span className="font-bold text-slate-700">
              {table.getFilteredRowModel().rows.length}
            </span>{' '}
            รายการ
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              title="หน้าแรก"
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              title="หน้าก่อนหน้า"
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 text-slate-600 font-bold text-[11px] sm:text-xs">
              หน้า {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>

            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              title="หน้าถัดไป"
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              title="หน้าสุดท้าย"
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
