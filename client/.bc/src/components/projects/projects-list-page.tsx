'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FolderKanban, Plus, SearchX } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ProjectCard, ProjectCardSkeleton } from '@/components/projects/project-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { useProjects } from '@/features/projects/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  type Priority,
  type ProjectStatus,
} from '@/types/project';

const PAGE_SIZE = 9;
const STATUS_OPTIONS = PROJECT_STATUSES.map((value) => ({
  value,
  label: PROJECT_STATUS_LABEL[value],
}));
const PRIORITY_OPTIONS = PRIORITIES.map((value) => ({ value, label: PRIORITY_LABEL[value] }));
const VIEW_OPTIONS = [{ value: 'archived', label: 'Archived' }];

const asStatus = (value: string): ProjectStatus | undefined =>
  PROJECT_STATUSES.find((status) => status === value);
const asPriority = (value: string): Priority | undefined =>
  PRIORITIES.find((priority) => priority === value);

const linkButton =
  'inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover';

export function ProjectsListPage({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];
  const projectsPath = `${base}/projects`;
  const canCreate = role !== 'MEMBER';
  const isAdmin = role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [view, setView] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search.trim());
  const statusFilter = asStatus(status);
  const priorityFilter = asPriority(priority);
  const projects = useProjects({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    archived: view === 'archived',
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(priorityFilter ? { priority: priorityFilter } : {}),
  });

  const hasFilters = Boolean(search || status || priority || view);
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setView('');
    setPage(1);
  };

  const items = projects.data?.items ?? [];

  let body;
  if (projects.isError && !projects.data) {
    body = (
      <ErrorState
        message={projects.error.message}
        onRetry={() => projects.refetch()}
        retrying={projects.isFetching}
      />
    );
  } else if (projects.isPending) {
    body = (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading projects">
        {Array.from({ length: 6 }, (_, index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
    );
  } else if (items.length === 0) {
    body = hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="No projects match your filters"
        description="Try a different search or clear the filters."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description={
          canCreate
            ? 'Create your first project to start organizing work.'
            : 'You have not been added to any project yet. A manager can add you.'
        }
        action={
          canCreate ? (
            <Link href={`${projectsPath}/create`} className={linkButton}>
              Create project
            </Link>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <div
        className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${projects.isFetching ? 'opacity-60 transition-opacity' : ''}`}
        aria-busy={projects.isFetching}
      >
        {items.map((project) => (
          <ProjectCard key={project.id} project={project} href={`${projectsPath}/${project.id}`} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Projects' : 'My Projects'}
        description={
          isAdmin
            ? 'All projects across the organization.'
            : role === 'PROJECT_MANAGER'
              ? 'Projects you manage.'
              : 'Projects you are a member of.'
        }
        breadcrumbs={[{ label: ROLE_BASE_PATH[role].slice(1), href: `${base}/dashboard` }, { label: 'Projects' }]}
        actions={
          canCreate ? (
            <Link href={`${projectsPath}/create`} className={linkButton}>
              <Plus className="size-4" aria-hidden="true" />
              New project
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_160px_150px]">
        <SearchInput
          value={search}
          onChange={withReset(setSearch)}
          placeholder="Search projects"
          label="Search projects"
        />
        <FilterDropdown
          label="Filter by status"
          allLabel="All statuses"
          value={status}
          onChange={withReset(setStatus)}
          options={STATUS_OPTIONS}
        />
        <FilterDropdown
          label="Filter by priority"
          allLabel="All priorities"
          value={priority}
          onChange={withReset(setPriority)}
          options={PRIORITY_OPTIONS}
        />
        <FilterDropdown
          label="Project view"
          allLabel="Not archived"
          value={view}
          onChange={withReset(setView)}
          options={VIEW_OPTIONS}
        />
      </div>

      {body}

      {projects.data && projects.data.meta.total > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface">
          <Pagination
            meta={projects.data.meta}
            onPageChange={setPage}
            disabled={projects.isFetching}
          />
        </div>
      )}
    </div>
  );
}
