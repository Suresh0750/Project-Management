'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { KanbanSquare, ListChecks, Plus, SearchX, Table2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { PriorityBadge } from '@/components/projects/project-badges';
import { KanbanBoard, KanbanBoardSkeleton } from '@/components/tasks/kanban-board';
import { TaskStatusBadge } from '@/components/tasks/task-badges';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { useProject, useProjects } from '@/features/projects/hooks';
import type { ListTasksParams, TaskSortBy } from '@/features/tasks/api';
import { useTasks } from '@/features/tasks/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import { PRIORITIES, PRIORITY_LABEL } from '@/types/project';
import {
  DUE_FILTER_LABEL,
  DUE_FILTERS,
  isOverdue,
  TASK_STATUS_LABEL,
  TASK_STATUSES,
  type Task,
} from '@/types/task';
import { formatCalendarDate } from '@/utils/format';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 10;
const BOARD_LIMIT = 100;

const STATUS_OPTIONS = TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABEL[value] }));
const PRIORITY_OPTIONS = PRIORITIES.map((value) => ({ value, label: PRIORITY_LABEL[value] }));
const DUE_OPTIONS = DUE_FILTERS.map((value) => ({ value, label: DUE_FILTER_LABEL[value] }));

const SORTS: Record<string, { label: string; sortBy: TaskSortBy; order: 'asc' | 'desc' }> = {
  newest: { label: 'Newest first', sortBy: 'createdAt', order: 'desc' },
  oldest: { label: 'Oldest first', sortBy: 'createdAt', order: 'asc' },
  due_soon: { label: 'Due date (soonest)', sortBy: 'dueDate', order: 'asc' },
  due_late: { label: 'Due date (latest)', sortBy: 'dueDate', order: 'desc' },
  priority_high: { label: 'Priority (highest)', sortBy: 'priority', order: 'desc' },
  priority_low: { label: 'Priority (lowest)', sortBy: 'priority', order: 'asc' },
};
const SORT_OPTIONS = Object.entries(SORTS).map(([value, { label }]) => ({ value, label }));

const EMPTY_TASKS: Task[] = [];
type View = 'list' | 'board';

const linkButton =
  'inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover';

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const item = (value: View, label: string, Icon: typeof Table2) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      aria-pressed={view === value}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium',
        view === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div role="group" aria-label="View" className="inline-flex rounded-lg border border-border-strong bg-surface p-0.5">
      {item('list', 'List', Table2)}
      {item('board', 'Board', KanbanSquare)}
    </div>
  );
}

export function TasksPage({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];
  const tasksPath = `${base}/tasks`;
  const canCreate = role !== 'MEMBER';

  const params = useSearchParams();
  const [view, setView] = useState<View>(params.get('view') === 'board' ? 'board' : 'list');
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState(params.get('projectId') ?? '');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [due, setDue] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const projects = useProjects({ page: 1, limit: 100, archived: false });
  const projectOptions = useMemo(
    () => (projects.data?.items ?? []).map((project) => ({ value: project.id, label: project.name })),
    [projects.data],
  );
  const selectedProject = useProject(projectId, Boolean(projectId));

  // The board always shows exactly one project, so ordering (position) is well defined.
  const isBoard = view === 'board';
  const effectiveProjectId = projectId || (isBoard ? (projectOptions[0]?.value ?? '') : '');

  const assigneeOptions = useMemo(
    () => [
      { value: 'me', label: 'Assigned to me' },
      { value: 'unassigned', label: 'Unassigned' },
      ...(selectedProject.data?.members ?? []).map((member) => ({
        value: member.id,
        label: member.name,
      })),
    ],
    [selectedProject.data],
  );

  const debouncedSearch = useDebouncedValue(search.trim());
  const sortConfig = SORTS[sort] ?? SORTS.newest!;
  const statusFilter = TASK_STATUSES.find((value) => value === status);
  const priorityFilter = PRIORITIES.find((value) => value === priority);
  const dueFilter = DUE_FILTERS.find((value) => value === due);

  const queryParams: ListTasksParams = {
    page: isBoard ? 1 : page,
    limit: isBoard ? BOARD_LIMIT : PAGE_SIZE,
    sortBy: isBoard ? 'position' : sortConfig.sortBy,
    order: isBoard ? 'asc' : sortConfig.order,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}),
    ...(assigneeId ? { assigneeId } : {}),
    ...(priorityFilter ? { priority: priorityFilter } : {}),
    ...(dueFilter ? { due: dueFilter } : {}),
    ...(!isBoard && statusFilter ? { status: statusFilter } : {}),
  };
  // Wait for the first project before loading the board.
  const tasks = useTasks(queryParams, !isBoard || Boolean(effectiveProjectId));

  const hasFilters = Boolean(search || projectId || assigneeId || status || priority || due);
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  const changeProject = (value: string) => {
    setProjectId(value);
    setAssigneeId(''); // assignee options depend on the project
    setPage(1);
  };
  const clearFilters = () => {
    setSearch('');
    setProjectId('');
    setAssigneeId('');
    setStatus('');
    setPriority('');
    setDue('');
    setPage(1);
  };

  const items = tasks.data?.items ?? EMPTY_TASKS;
  const loading = tasks.isPending && (!isBoard || Boolean(effectiveProjectId));

  const columns: Array<Column<Task>> = [
    {
      key: 'title',
      header: 'Task',
      cell: (task) => (
        <div className="min-w-0">
          <Link href={`${tasksPath}/${task.id}`} className="block truncate font-medium hover:underline">
            {task.title}
          </Link>
          <span className="block truncate text-xs text-muted-foreground md:hidden">
            {task.project.name}
          </span>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      hideOnMobile: true,
      cell: (task) => <span className="text-muted-foreground">{task.project.name}</span>,
    },
    { key: 'status', header: 'Status', cell: (task) => <TaskStatusBadge status={task.status} /> },
    { key: 'priority', header: 'Priority', cell: (task) => <PriorityBadge priority={task.priority} /> },
    {
      key: 'assignee',
      header: 'Assignee',
      hideOnMobile: true,
      cell: (task) => (
        <span className="text-muted-foreground">{task.assignee?.name ?? 'Unassigned'}</span>
      ),
    },
    {
      key: 'due',
      header: 'Due',
      hideOnMobile: true,
      cell: (task) =>
        task.dueDate ? (
          <span className={isOverdue(task) ? 'font-medium text-danger' : 'text-muted-foreground'}>
            {formatCalendarDate(task.dueDate)}
            {isOverdue(task) && ' (overdue)'}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  let body;
  if (isBoard && !effectiveProjectId && !projects.isPending) {
    body = (
      <EmptyState
        icon={KanbanSquare}
        title="No project to show"
        description="The board shows one project at a time. You need access to a project first."
      />
    );
  } else if (tasks.isError && !tasks.data) {
    body = (
      <ErrorState
        message={tasks.error.message}
        onRetry={() => tasks.refetch()}
        retrying={tasks.isFetching}
      />
    );
  } else if (loading || (isBoard && projects.isPending)) {
    body = isBoard ? (
      <KanbanBoardSkeleton />
    ) : (
      <div className="rounded-xl border border-border bg-surface">
        <DataTable
          caption="Tasks"
          columns={columns}
          rows={[]}
          getRowKey={(task) => task.id}
          loading
          skeletonRows={PAGE_SIZE}
        />
      </div>
    );
  } else if (items.length === 0 && !isBoard) {
    body = (
      <div className="rounded-xl border border-border bg-surface">
        {hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No tasks match your filters"
            description="Try different filters or clear them."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description={
              canCreate
                ? 'Create a task to start tracking work.'
                : 'Tasks in your projects will appear here.'
            }
            action={
              canCreate ? (
                <Link href={`${tasksPath}/create`} className={linkButton}>
                  Create task
                </Link>
              ) : undefined
            }
          />
        )}
      </div>
    );
  } else if (isBoard) {
    body = (
      <div className={cn(tasks.isFetching && 'opacity-70 transition-opacity')}>
        {tasks.data && tasks.data.meta.total > BOARD_LIMIT && (
          <div className="mb-3">
            <Alert tone="info">
              Showing the first {BOARD_LIMIT} of {tasks.data.meta.total} tasks. Use the filters to
              narrow the board.
            </Alert>
          </div>
        )}
        <KanbanBoard tasks={items} basePath={tasksPath} />
      </div>
    );
  } else {
    body = (
      <div className="rounded-xl border border-border bg-surface">
        <DataTable
          caption="Tasks"
          columns={columns}
          rows={items}
          getRowKey={(task) => task.id}
          refreshing={tasks.isFetching}
        />
        {tasks.data && (
          <Pagination meta={tasks.data.meta} onPageChange={setPage} disabled={tasks.isFetching} />
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={role === 'MEMBER' ? 'My Tasks' : 'Tasks'}
        description={
          role === 'ADMIN'
            ? 'Every task across all projects.'
            : role === 'PROJECT_MANAGER'
              ? 'Tasks in the projects you manage.'
              : 'Tasks in your projects, including those assigned to you.'
        }
        breadcrumbs={[{ label: base.slice(1), href: `${base}/dashboard` }, { label: 'Tasks' }]}
        actions={
          <>
            <ViewToggle
              view={view}
              onChange={(next) => {
                setView(next);
                setPage(1);
              }}
            />
            {canCreate && (
              <Link
                href={`${tasksPath}/create${effectiveProjectId ? `?projectId=${effectiveProjectId}` : ''}`}
                className={linkButton}
              >
                <Plus className="size-4" aria-hidden="true" />
                New task
              </Link>
            )}
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <SearchInput
            value={search}
            onChange={withReset(setSearch)}
            placeholder="Search tasks by title"
            label="Search tasks"
          />
        </div>
        <FilterDropdown
          label="Filter by project"
          allLabel="All projects"
          value={effectiveProjectId}
          onChange={changeProject}
          options={projectOptions}
          hideAll={isBoard}
        />
        <FilterDropdown
          label="Filter by assignee"
          allLabel="Any assignee"
          value={assigneeId}
          onChange={withReset(setAssigneeId)}
          options={assigneeOptions}
        />
        {!isBoard && (
          <FilterDropdown
            label="Filter by status"
            allLabel="All statuses"
            value={status}
            onChange={withReset(setStatus)}
            options={STATUS_OPTIONS}
          />
        )}
        <FilterDropdown
          label="Filter by priority"
          allLabel="All priorities"
          value={priority}
          onChange={withReset(setPriority)}
          options={PRIORITY_OPTIONS}
        />
        <FilterDropdown
          label="Filter by due date"
          allLabel="Any due date"
          value={due}
          onChange={withReset(setDue)}
          options={DUE_OPTIONS}
        />
        {!isBoard && (
          <FilterDropdown
            label="Sort by"
            allLabel="Newest first"
            hideAll
            value={sort}
            onChange={withReset(setSort)}
            options={SORT_OPTIONS}
          />
        )}
      </div>

      {body}
    </div>
  );
}
