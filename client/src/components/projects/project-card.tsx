import Link from 'next/link';
import { CalendarDays, CheckCircle2, Users } from 'lucide-react';
import { PriorityBadge, ProjectStatusBadge } from '@/components/projects/project-badges';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import type { Project } from '@/types/project';
import { formatCalendarDate } from '@/utils/format';

export function ProjectCard({ project, href }: { project: Project; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="line-clamp-2 font-semibold">{project.name}</h2>
        {project.archivedAt && <Badge>Archived</Badge>}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <ProjectStatusBadge status={project.status} />
        <PriorityBadge priority={project.priority} />
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {project.description ?? 'No description'}
      </p>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} label={`${project.name} progress`} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Members</dt>
          <Users className="size-3.5" aria-hidden="true" />
          <dd>{project.memberCount}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Completed tasks</dt>
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          <dd>
            {project.completedTaskCount}/{project.taskCount}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Deadline</dt>
          <CalendarDays className="size-3.5" aria-hidden="true" />
          <dd>{project.deadline ? formatCalendarDate(project.deadline) : 'No deadline'}</dd>
        </div>
      </dl>

      <p className="mt-3 truncate border-t border-border pt-3 text-xs text-muted-foreground">
        Manager: <span className="text-foreground">{project.manager.name}</span>
      </p>
    </Link>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-5" aria-hidden="true">
      <Skeleton className="h-5 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}
