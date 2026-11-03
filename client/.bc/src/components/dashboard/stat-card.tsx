import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  /** Highlights the tile (e.g. overdue tasks) when the value is above zero. */
  alert?: boolean;
  href?: string;
}

export function StatCard({ label, value, icon: Icon, alert = false, href }: StatCardProps) {
  const warn = alert && value > 0;

  const content = (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          warn ? 'bg-danger-soft text-danger' : 'bg-info-soft text-primary',
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-muted-foreground">{label}</span>
        <span className={cn('block text-2xl font-semibold tabular-nums', warn && 'text-danger')}>
          {value.toLocaleString()}
        </span>
      </span>
    </>
  );

  const className =
    'flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-shadow';

  return href ? (
    <Link href={href} className={cn(className, 'hover:shadow-md')}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5" aria-hidden="true">
      <Skeleton className="size-10 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-12" />
      </div>
    </div>
  );
}
