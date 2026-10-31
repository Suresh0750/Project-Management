import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hide the column below the `md` breakpoint. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  caption: string;
  columns: Array<Column<T>>;
  rows: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  /** True while refetching with rows already shown (page/filter change). */
  refreshing?: boolean;
  skeletonRows?: number;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  loading = false,
  refreshing = false,
  skeletonRows = 6,
}: DataTableProps<T>) {
  return (
    <div className="relative overflow-x-auto">
      {refreshing && (
        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-info-soft" aria-hidden="true">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
      )}

      <table className="w-full text-left text-sm" aria-busy={loading || refreshing}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3 font-medium',
                  column.hideOnMobile && 'hidden md:table-cell',
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cn(refreshing && 'opacity-60 transition-opacity')}>
          {loading
            ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-0">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-4 py-4', column.hideOnMobile && 'hidden md:table-cell')}
                    >
                      <Skeleton className="h-5 w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className="border-b border-border last:border-0 hover:bg-surface-muted/50"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3',
                        column.hideOnMobile && 'hidden md:table-cell',
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
