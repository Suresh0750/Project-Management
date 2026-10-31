import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'danger';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-border bg-surface-muted text-muted-foreground',
  info: 'border-info-border bg-info-soft text-primary',
  success: 'border-success-border bg-success-soft text-success',
  danger: 'border-danger-border bg-danger-soft text-danger',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
