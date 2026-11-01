'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Archive, ArchiveRestore, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ActivityPanel } from '@/components/projects/activity-panel';
import { ArchiveProjectDialog } from '@/components/projects/archive-project-dialog';
import { MembersPanel } from '@/components/projects/members-panel';
import { ProjectTasksPanel } from '@/components/projects/project-tasks-panel';
import { PriorityBadge, ProjectStatusBadge } from '@/components/projects/project-badges';
import { ProjectForm } from '@/components/projects/project-form';
import { useManagerField } from '@/components/projects/use-manager-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast-provider';
import { toProjectPayload, type ProjectPayload } from '@/features/projects/api';
import {
  projectsKeys,
  useArchiveProject,
  useProject,
  useUpdateProject,
} from '@/features/projects/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { ProjectFormValues } from '@/schemas/project';
import type { Role } from '@/types/auth';
import type { ProjectDetail } from '@/types/project';
import { formatCalendarDate, formatDateTime, toDateInputValue } from '@/utils/format';

type TabId = 'overview' | 'tasks' | 'members' | 'activity';

const TABS: Array<TabItem<TabId>> = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'members', label: 'Members' },
  { id: 'activity', label: 'Activity' },
];

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading project">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function Overview({ project }: { project: ProjectDetail }) {
  const fact = (label: string, value: string) => (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold">Description</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {project.description ?? 'No description provided.'}
        </p>

        <h3 className="mt-6 text-sm font-semibold">Progress</h3>
        <div className="mt-2">
          <ProgressBar value={project.progress} label="Project progress" />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {project.completedTaskCount} of {project.taskCount} tasks completed ({project.progress}%)
          </p>
        </div>
      </section>

      <section className="h-fit rounded-xl border border-border bg-surface p-6">
        <dl className="space-y-4">
          <div className="flex gap-2">
            <ProjectStatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
          {fact('Project Manager', project.manager.name)}
          {fact('Start date', project.startDate ? formatCalendarDate(project.startDate) : 'Not set')}
          {fact('Deadline', project.deadline ? formatCalendarDate(project.deadline) : 'Not set')}
          {fact('Members', String(project.memberCount))}
          {fact('Created', formatDateTime(project.createdAt))}
          {fact('Last updated', formatDateTime(project.updatedAt))}
        </dl>
      </section>
    </div>
  );
}

export function ProjectDetailPage({ role }: { role: Role }) {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const project = useProject(id);
  const updateProject = useUpdateProject(id);
  const archiveProject = useArchiveProject(id);
  const queryClient = useQueryClient();
  const managerField = useManagerField(role);

  const [tab, setTab] = useState<TabId>('overview');
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const base = ROLE_BASE_PATH[role];
  const projectsPath = `${base}/projects`;

  if (project.isPending) return <DetailSkeleton />;

  if (project.isError) {
    const notFound = project.error.status === 404;
    return (
      <ErrorState
        title={notFound ? 'Project not found' : 'Could not load project'}
        message={
          notFound
            ? 'This project does not exist or you do not have access to it.'
            : project.error.message
        }
        onRetry={notFound ? undefined : () => project.refetch()}
        retrying={project.isFetching}
        action={
          <Link
            href={projectsPath}
            className="inline-flex h-10 items-center rounded-lg border border-border-strong px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Back to projects
          </Link>
        }
      />
    );
  }

  const data = project.data;
  const archived = Boolean(data.archivedAt);

  const handleSave = async (values: ProjectFormValues) => {
    const full = toProjectPayload(values, Boolean(managerField));
    const payload: Partial<ProjectPayload> = {};
    if (full.name !== data.name) payload.name = full.name;
    if (full.description !== data.description) payload.description = full.description;
    if (full.priority !== data.priority) payload.priority = full.priority;
    if (full.status !== data.status) payload.status = full.status;
    if (full.startDate !== (data.startDate ? toDateInputValue(data.startDate) : null)) {
      payload.startDate = full.startDate;
    }
    if (full.deadline !== (data.deadline ? toDateInputValue(data.deadline) : null)) {
      payload.deadline = full.deadline;
    }
    if (full.managerId !== undefined && full.managerId !== data.managerId) {
      payload.managerId = full.managerId;
    }

    await updateProject.mutateAsync(payload);
    toast.success('Project updated');
    setEditing(false);
  };

  const restoreProject = () => {
    archiveProject.mutate(false, {
      onSuccess: () => toast.success('Project restored'),
      onError: (error) => toast.error(error.message),
    });
  };

  const archiveNow = () => {
    archiveProject.mutate(true, {
      onSuccess: () => {
        toast.success('Project archived');
        setConfirmArchive(false);
      },
      onError: (error) => {
        // The rules may have changed since the dialog opened: keep it open with fresh reasons.
        toast.error(error.message);
        void queryClient.invalidateQueries({ queryKey: projectsKeys.archiveReadiness(id) });
      },
    });
  };

  const actions = data.canManage ? (
    <>
      {!archived && (
        <Button variant="secondary" onClick={() => setEditing((current) => !current)}>
          <Pencil className="size-4" aria-hidden="true" />
          {editing ? 'Cancel edit' : 'Edit'}
        </Button>
      )}
      {archived ? (
        <Button variant="secondary" loading={archiveProject.isPending} onClick={restoreProject}>
          <ArchiveRestore className="size-4" aria-hidden="true" />
          Restore
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => setConfirmArchive(true)}>
          <Archive className="size-4" aria-hidden="true" />
          Archive
        </Button>
      )}
    </>
  ) : undefined;

  return (
    <div>
      <PageHeader
        title={data.name}
        breadcrumbs={[
          { label: base.slice(1), href: `${base}/dashboard` },
          { label: 'Projects', href: projectsPath },
          { label: data.name },
        ]}
        actions={actions}
      />

      {archived && (
        <div className="mb-4">
          <Alert tone="info">
            This project is archived and read-only
            {data.archivedAt ? ` (since ${formatDateTime(data.archivedAt)})` : ''}.
          </Alert>
        </div>
      )}

      <Tabs items={TABS} value={tab} onChange={setTab} label="Project sections" idPrefix="project" />

      <div id="project-panel" role="tabpanel" aria-labelledby={`project-tab-${tab}`} className="pt-6">
        {tab === 'overview' &&
          (editing && data.canManage && !archived ? (
            <div className="max-w-2xl rounded-xl border border-border bg-surface p-6">
              <ProjectForm
                key={data.updatedAt}
                {...(managerField ? { managerField } : {})}
                defaultValues={{
                  name: data.name,
                  description: data.description ?? '',
                  priority: data.priority,
                  status: data.status,
                  startDate: toDateInputValue(data.startDate),
                  deadline: toDateInputValue(data.deadline),
                  managerId: data.managerId,
                }}
                submitLabel="Save changes"
                onSubmit={handleSave}
                onCancel={() => setEditing(false)}
              />
            </div>
          ) : (
            <Overview project={data} />
          ))}

        {tab === 'tasks' && <ProjectTasksPanel project={data} role={role} />}

        {tab === 'members' && <MembersPanel project={data} />}

        {tab === 'activity' && <ActivityPanel projectId={data.id} active={tab === 'activity'} />}
      </div>

      <ArchiveProjectDialog
        projectId={data.id}
        projectName={data.name}
        open={confirmArchive}
        loading={archiveProject.isPending}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={archiveNow}
      />
    </div>
  );
}
