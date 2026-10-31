import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/lib/api/types';
import { cn } from '@/utils/cn';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/** Page numbers with ellipses, e.g. 1 … 4 5 6 … 20. */
function pageWindow(current: number, total: number): Array<number | 'gap-start' | 'gap-end'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: Array<number | 'gap-start' | 'gap-end'> = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) {
      result.push(index < sorted.length / 2 ? 'gap-start' : 'gap-end');
    }
    result.push(page);
  });
  return result;
}

const buttonClass =
  'flex size-9 items-center justify-center rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export function Pagination({ meta, onPageChange, disabled }: PaginationProps) {
  const { page, limit, total, totalPages } = meta;
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
          className={cn(buttonClass, 'hover:bg-surface-muted')}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        {pageWindow(page, totalPages).map((entry) =>
          typeof entry === 'string' ? (
            <span key={entry} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              disabled={disabled}
              aria-label={`Page ${entry}`}
              aria-current={entry === page ? 'page' : undefined}
              className={cn(
                buttonClass,
                entry === page
                  ? 'bg-primary font-medium text-primary-foreground'
                  : 'hover:bg-surface-muted',
              )}
            >
              {entry}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
          className={cn(buttonClass, 'hover:bg-surface-muted')}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
