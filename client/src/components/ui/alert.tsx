import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

type Tone = 'error' | 'success' | 'info';

const tones: Record<Tone, { box: string; icon: typeof Info }> = {
  error: { box: 'border-danger-border bg-danger-soft text-danger', icon: CircleAlert },
  success: { box: 'border-success-border bg-success-soft text-success', icon: CircleCheck },
  info: { box: 'border-info-border bg-info-soft text-foreground', icon: Info },
};

export function Alert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const { box, icon: Icon } = tones[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', box)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
