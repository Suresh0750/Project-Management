'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { History, SearchX } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { TextField } from '@/components/ui/text-field';
import { useActivities } from '@/features/activity/hooks';
import { useProjects } from '@/features/projects/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import {
  ACTIVITY_ACTION_LABEL,
  ACTIVITY_ACTIONS,
  type ActivityAction,
  type ActivityItem,
} from '@/types/activity';
import { formatDateTime, readableMessage } from '@/utils/format';

const PAGE_SIZE = 10;
const ACTION_OPTIONS = ACTIVITY_ACTIONS.map((value) => ({
  value,
  label: ACTIVITY_ACTION_LABEL[value],
}));
const SCOPE_OPTIONS = [{ value: 'me', label: 'My activity' }];

const SCOPE_DESCRIPTION: Record<Role, string> = {
  ADMIN: 'Everything that happened across all projects.',
  PROJECT_MANAGER: 'Activity in the projects you manage.',
  MEMBER: 'Activity in the projects you belong to.',
};

const ACTION_TONE: Record<ActivityAction, BadgeTone> = {
  PROJECT_CREATED: 'success',
  PROJECT_UPDATED: 'info',
  PROJECT_ARCHIVED: 'warning',
  MEMBER_ADDED: 'success',
  MEMBER_REMOVED: 'danger',
  TASK_CREATED: 'success',
  TASK_UPDATED: 'info',
  TASK_STATUS_CHANGED: 'info',
  TASK_ASSIGNED: 'info',
  TASK_DELETED: 'danger',
  COMMENT_ADDED: 'neutral',
};

function isAction(value: string): value is ActivityAction {
  return (ACTIVITY_ACTIONS as readonly string[]).includes(value);
}

export function ActivityPage({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];

  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [action, setAction] = useState('');
  const [scope, setScope] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  // Any filter change starts again from the first page.
  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const projects = useProjects({ page: 1, limit: 100, archived: false });
  const projectOptions = useMemo(
    () => (projects.data?.items ?? []).map((project) => ({ value: project.id, label: project.name })),
    [projects.data],
  );

  // Validate the range before querying so the user gets feedback instead of a server 400.
  const rangeError =
    from && to && to < from ? 'End date cannot be earlier than the start date' : undefined;

  const debouncedSearch = useDebouncedValue(search.trim());
  const actionFilter = isAction(action) ? action : undefined;
  const activities = useActivities(
    {
      page,
      limit: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(projectId ? { projectId } : {}),
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(scope ? { actorId: scope } : {}),
      ...(from ? { from } : {}),
      ...(to && !rangeError ? { to } : {}),
    },
    !rangeError,
  );

  const hasFilters = Boolean(search || projectId || action || scope || from || to);
  const clearFilters = () => {
    setSearch('');
    setProjectId('');
    setAction('');
    setScope('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const columns: Array<Column<ActivityItem>> = [
    {
      key: 'when',
      header: 'When',
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (item) => <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>,
    },
    {
      key: 'type',
      header: 'Type',
      className: 'whitespace-nowrap',
      cell: (item) =>
        isAction(item.action) ? (
          <Badge tone={ACTION_TONE[item.action]}>{ACTIVITY_ACTION_LABEL[item.action]}</Badge>
        ) : (
          <Badge>{item.action}</Badge>
        ),
    },
    {
      key: 'details',
      header: 'Details',
      className: 'min-w-64',
      cell: (item) => (
        <div>
          <p className="break-words">{readableMessage(item.message)}</p>
          {item.task && !item.task.deleted && (
            <Link
              href={`${base}/tasks/${item.task.id}`}
              className="mt-0.5 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {item.task.title}
            </Link>
          )}
        </div>
      ),
    },
    {
      key: 'by',
      header: 'By',
      hideOnMobile: true,
      className: 'whitespace-nowrap',
      cell: (item) => item.actor?.name ?? <span className="text-muted-foreground">System</span>,
    },
    {
      key: 'project',
      header: 'Project',
      hideOnMobile: true,
      cell: (item) =>
        item.project ? (
          <Link href={`${base}/projects/${item.project.id}`} className="hover:underline">
            {item.project.name}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const rows = activities.data?.items ?? [];

  let body;
  if (activities.isError && !activities.data) {
    body = (
      <ErrorState
        message={activities.error.message}
        onRetry={() => activities.refetch()}
        retrying={activities.isFetching}
      />
    );
  } else if (rangeError) {
    body = (
      <EmptyState
        icon={SearchX}
        title="Fix the date range"
        description="Choose an end date on or after the start date."
      />
    );
  } else if (activities.data && rows.length === 0) {
    body = hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="No activity matches your filters"
        description="Try different filters or clear them."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Project and task changes will show up here as they happen."
      />
    );
  } else {
    body = (
      <DataTable
        caption="Activity"
        columns={columns}
        rows={rows}
        getRowKey={(item) => item.id}
        loading={activities.isPending}
        refreshing={activities.isFetching && !activities.isPending}
        skeletonRows={PAGE_SIZE}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Activity"
        description={SCOPE_DESCRIPTION[role]}
        breadcrumbs={[{ label: base.slice(1), href: `${base}/dashboard` }, { label: 'Activity' }]}
      />

      <div className="mb-4 space-y-3">
        <SearchInput
          value={search}
          onChange={changeFilter(setSearch)}
          placeholder="Search activity"
          label="Search activity"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterDropdown
            visibleLabel
            label="Project"
            allLabel="All projects"
            value={projectId}
            onChange={changeFilter(setProjectId)}
            options={projectOptions}
          />
          <FilterDropdown
            visibleLabel
            label="Activity type"
            allLabel="All types"
            value={action}
            onChange={changeFilter(setAction)}
            options={ACTION_OPTIONS}
          />
          <FilterDropdown
            visibleLabel
            label="Person"
            allLabel="Everyone"
            value={scope}
            onChange={changeFilter(setScope)}
            options={SCOPE_OPTIONS}
          />
          <TextField
            label="From"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => changeFilter(setFrom)(event.target.value)}
          />
          <TextField
            label="To"
            type="date"
            value={to}
            min={from || undefined}
            error={rangeError}
            onChange={(event) => changeFilter(setTo)(event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {body}

        {activities.data && !rangeError && (
          <Pagination
            meta={activities.data.meta}
            onPageChange={setPage}
            disabled={activities.isFetching}
          />
        )}
      </div>
    </div>
  );
}
