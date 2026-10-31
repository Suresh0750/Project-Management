import Link from 'next/link';
import { useId, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface DashboardSectionProps {
  title: string;
  description?: string;
  /** Optional "view all" style link in the header. */
  action?: { label: string; href: string };
  /** Slot for header controls, e.g. a chart/table toggle. */
  controls?: ReactNode;
  /** Dim the content while a refetch is running, keeping the frame in place. */
  refreshing?: boolean;
  children: ReactNode;
}

/** The shared card frame for every dashboard block (charts, lists, feeds). */
export function DashboardSection({
  title,
  description,
  action,
  controls,
  refreshing = false,
  children,
}: DashboardSectionProps) {
  const headingId = useId();

  return (
    <section className="rounded-xl border border-border bg-surface" aria-labelledby={headingId}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id={headingId} className="text-sm font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {controls}
          {action && (
            <Link href={action.href} className="text-xs font-medium text-primary hover:underline">
              {action.label}
            </Link>
          )}
        </div>
      </header>
      <div className={cn(refreshing && 'opacity-60 transition-opacity')}>{children}</div>
    </section>
  );
}
