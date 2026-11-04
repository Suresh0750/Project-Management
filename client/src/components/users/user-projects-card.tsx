import Link from 'next/link';
import { ProjectStatusBadge } from '@/components/projects/project-badges';
import { Badge } from '@/components/ui/badge';
import type { UserProjectRef } from '@/types/project';

interface UserProjectsCardProps {
  title: string;
  projects: UserProjectRef[];
  /** e.g. "/admin/projects": each row links to `${projectsPath}/${id}`. */
  projectsPath: string;
  emptyMessage: string;
}

/** The projects a person manages or belongs to; each one opens that project's page. */
export function UserProjectsCard({
  title,
  projects,
  projectsPath,
  emptyMessage,
}: UserProjectsCardProps) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="mb-4 text-base font-semibold">
        {title} <span className="font-normal text-muted-foreground">({projects.length})</span>
      </h2>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`${projectsPath}/${project.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-muted"
              >
                <span className="min-w-0 truncate font-medium">{project.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {project.archivedAt && <Badge tone="neutral">Archived</Badge>}
                  <ProjectStatusBadge status={project.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
