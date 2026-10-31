'use client';

import { useMemo, useState } from 'react';
import { History, SearchX } from 'lucide-react';
import { ActivityList, ActivityListSkeleton } from '@/components/activity/activity-list';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
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
import { ACTIVITY_ACTION_LABEL, ACTIVITY_ACTIONS } from '@/types/activity';

const PAGE_SIZE = 15;
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

export function ActivityPage({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];

  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [action, setAction] = useState('');
  const [scope, setScope] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const projects = useProjects({ page: 1, limit: 100, archived: false });
  const projectOptions = useMemo(
    () => (projects.data?.items ?? []).map((project) => ({ value: project.id, label: project.name })),
    [projects.data],
  );

  // Validate the range before querying so the user gets feedback instead of a server 400.
  const rangeError = from && to && to < from ? 'End date cannot be earlier than the start date' : undefined;

  const debouncedSearch = useDebouncedValue(search.trim());
  const actionFilter = ACTIVITY_ACTIONS.find((value) => value === action);
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
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearch('');
    setProjectId('');
    setAction('');
    setScope('');
    setFrom('');
    setTo('');
    setPage(1);
  };

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
  } else if (activities.isPending) {
    body = <ActivityListSkeleton rows={PAGE_SIZE / 2} />;
  } else if (activities.data.items.length === 0) {
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
      <div className={activities.isFetching ? 'opacity-60 transition-opacity' : undefined}>
        <ActivityList items={activities.data.items} basePath={base} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Activity"
        description={SCOPE_DESCRIPTION[role]}
        breadcrumbs={[{ label: base.slice(1), href: `${base}/dashboard` }, { label: 'Activity' }]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <SearchInput
            value={search}
            onChange={withReset(setSearch)}
            placeholder="Search activity"
            label="Search activity"
          />
        </div>
        <FilterDropdown
          label="Filter by project"
          allLabel="All projects"
          value={projectId}
          onChange={withReset(setProjectId)}
          options={projectOptions}
        />
        <FilterDropdown
          label="Filter by activity type"
          allLabel="All activity types"
          value={action}
          onChange={withReset(setAction)}
          options={ACTION_OPTIONS}
        />
        <FilterDropdown
          label="Filter by person"
          allLabel="Everyone"
          value={scope}
          onChange={withReset(setScope)}
          options={SCOPE_OPTIONS}
        />
        <TextField
          label="From"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => withReset(setFrom)(event.target.value)}
        />
        <TextField
          label="To"
          type="date"
          value={to}
          min={from || undefined}
          error={rangeError}
          onChange={(event) => withReset(setTo)(event.target.value)}
        />
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
