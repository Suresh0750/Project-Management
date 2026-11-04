'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectStatusBadge } from '@/components/projects/project-badges';
import { useUser } from '@/features/users/hooks';
import type { Role } from '@/types/auth';

interface DeactivateUserDialogProps {
  /** The user about to be deactivated; null keeps the dialog closed. */
  user: { id: string; name: string; role: Role } | null;
  loading: boolean;
  onCancel: () => void;
  /** `holdProjects`: also put the projects this Project Manager manages on hold. */
  onConfirm: (holdProjects: boolean) => void;
}

/**
 * Confirms a deactivation. For a Project Manager it also lists the projects they manage and
 * offers (unticked by default) to put them on hold, since nobody will be running them.
 */
export function DeactivateUserDialog(props: DeactivateUserDialogProps) {
  // Keyed by the user, so the tick box starts unticked every time the dialog opens.
  return <DeactivateUserDialogContent key={props.user?.id ?? 'closed'} {...props} />;
}

function DeactivateUserDialogContent({
  user,
  loading,
  onCancel,
  onConfirm,
}: DeactivateUserDialogProps) {
  const isManager = user?.role === 'PROJECT_MANAGER';
  // The user detail carries the projects; only a Project Manager's are needed here.
  const detail = useUser(user?.id ?? '', isManager);
  const [hold, setHold] = useState(false);

  const close = () => {
    setHold(false);
    onCancel();
  };

  const managed = (detail.data?.projects ?? []).filter((project) => !project.archivedAt);
  // Completed projects are finished and on-hold ones already are: neither needs holding.
  const holdable = managed.filter(
    (project) => project.status !== 'COMPLETED' && project.status !== 'ON_HOLD',
  );
  const checking = isManager && detail.isPending;

  return (
    <ConfirmDialog
      open={user !== null}
      title="Deactivate user?"
      description={`${user?.name ?? 'This user'} will be signed out and unable to log in until reactivated.`}
      confirmLabel="Deactivate"
      tone="danger"
      loading={loading}
      confirmDisabled={checking}
      onCancel={close}
      onConfirm={() => onConfirm(isManager && hold && holdable.length > 0)}
    >
      {isManager && (
        <div className="space-y-3">
          {checking && <Skeleton className="h-20 w-full" />}

          {detail.isError && (
            <Alert tone="error">
              Could not load this Project Manager&apos;s projects. You can still deactivate, but
              their projects will not be put on hold.
            </Alert>
          )}

          {detail.isSuccess && managed.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This Project Manager does not manage any active project.
            </p>
          )}

          {detail.isSuccess && managed.length > 0 && (
            <>
              <p className="text-sm font-medium">
                Projects managed ({managed.length})
              </p>
              <ul className="max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {managed.map((project) => (
                  <li
                    key={project.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{project.name}</span>
                    <ProjectStatusBadge status={project.status} />
                  </li>
                ))}
              </ul>

              {holdable.length > 0 ? (
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hold}
                    onChange={(event) => setHold(event.target.checked)}
                    className="mt-0.5 size-4 cursor-pointer accent-[var(--color-primary)]"
                  />
                  <span>
                    Put {holdable.length === 1 ? 'this project' : `these ${holdable.length} projects`}{' '}
                    on hold
                    <span className="block text-xs text-muted-foreground">
                      Their status changes to On hold. Completed and already on-hold projects are
                      left as they are. You can assign a new manager later and set them active again.
                    </span>
                  </span>
                </label>
              ) : (
                <p className="text-xs text-muted-foreground">
                  None of these projects needs holding (they are completed or already on hold).
                </p>
              )}
            </>
          )}
        </div>
      )}
    </ConfirmDialog>
  );
}
