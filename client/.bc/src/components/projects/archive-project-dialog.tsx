'use client';

import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, CircleX, LoaderCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { useArchiveReadiness } from '@/features/projects/hooks';

interface ArchiveProjectDialogProps {
  projectId: string;
  projectName: string;
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function Group({
  title,
  tone,
  icon: Icon,
  items,
}: {
  title: string;
  tone: 'danger' | 'warning';
  icon: typeof CircleX;
  items: string[];
}) {
  const colors =
    tone === 'danger'
      ? 'border-danger-border bg-danger-soft text-danger'
      : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300';

  return (
    <div className={`rounded-lg border p-3 ${colors}`}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Explains whether a project can be archived before asking. Blockers disable the button;
 * warnings are shown but do not stop it. The server applies the same rules on every request.
 */
export function ArchiveProjectDialog({
  projectId,
  projectName,
  open,
  loading,
  onConfirm,
  onCancel,
}: ArchiveProjectDialogProps) {
  const readiness = useArchiveReadiness(projectId, open);

  let body: ReactNode;
  let confirmLabel = 'Archive';
  let blocked = true;

  if (readiness.isPending) {
    body = (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
        Checking whether this project can be archived…
      </p>
    );
  } else if (readiness.isError) {
    body = (
      <div role="alert" className="space-y-2 text-sm">
        <p className="text-danger">{readiness.error.message}</p>
        <Button variant="secondary" onClick={() => void readiness.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    const { canArchive, blockers, warnings } = readiness.data;
    blocked = !canArchive;
    if (canArchive && warnings.length > 0) confirmLabel = 'Archive anyway';

    body = (
      <div className="space-y-3">
        {blockers.length > 0 && (
          <Group title="Cannot archive yet" tone="danger" icon={CircleX} items={blockers} />
        )}
        {warnings.length > 0 && (
          <Group title="Needs attention" tone="warning" icon={CircleAlert} items={warnings} />
        )}
        {canArchive && warnings.length === 0 && (
          <p className="flex items-center gap-2 rounded-lg border border-success-border bg-success-soft p-3 text-sm text-success">
            <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
            This project is complete and ready to archive.
          </p>
        )}
      </div>
    );
  }

  return (
    <ConfirmDialog
      open={open}
      title={`Archive "${projectName}"?`}
      description="Archived projects become read-only and are hidden from the default list. You can restore it later."
      confirmLabel={confirmLabel}
      tone="danger"
      loading={loading}
      confirmDisabled={blocked}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {body}
    </ConfirmDialog>
  );
}
