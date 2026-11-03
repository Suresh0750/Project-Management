'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { ProjectForm } from '@/components/projects/project-form';
import { useManagerField } from '@/components/projects/use-manager-field';
import { useToast } from '@/components/ui/toast-provider';
import { toProjectPayload } from '@/features/projects/api';
import { useCreateProject } from '@/features/projects/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { ProjectFormValues } from '@/schemas/project';
import type { Role } from '@/types/auth';

export function CreateProjectPage({ role }: { role: Role }) {
  const router = useRouter();
  const toast = useToast();
  const createProject = useCreateProject();
  const managerField = useManagerField(role);

  const base = ROLE_BASE_PATH[role];
  const projectsPath = `${base}/projects`;

  const handleSubmit = async (values: ProjectFormValues) => {
    const project = await createProject.mutateAsync(toProjectPayload(values, role === 'ADMIN'));
    toast.success(`Project "${project.name}" was created`);
    router.push(`${projectsPath}/${project.id}`);
  };

  return (
    <div>
      <PageHeader
        title="New project"
        description="Set up the project details. You can add members afterwards."
        breadcrumbs={[
          { label: base.slice(1), href: `${base}/dashboard` },
          { label: 'Projects', href: projectsPath },
          { label: 'New project' },
        ]}
      />
      <div className="max-w-2xl rounded-xl border border-border bg-surface p-6">
        <ProjectForm
          {...(managerField ? { managerField } : {})}
          submitLabel="Create project"
          onSubmit={handleSubmit}
          onCancel={() => router.push(projectsPath)}
        />
      </div>
    </div>
  );
}
