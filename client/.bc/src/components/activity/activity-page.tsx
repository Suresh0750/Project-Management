'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { History, LoaderCircle, SearchX } from 'lucide-react';
import { ActivityList, ActivityListSkeleton } from '@/components/activity/activity-list';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { SearchInput } from '@/components/ui/search-input';
import { TextField } from '@/components/ui/text-field';
import { useActivityFeed } from '@/features/activity/hooks';
import { useProjects } from '@/features/projects/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import { ACTIVITY_ACTION_LABEL, ACTIVITY_ACTIONS } from '@/types/activity';

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

export function ActivityPage({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];

  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [action, setAction] = useState('');
  const [scope, setScope] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const projects = useProjects({ page: 1, limit: 100, archived: false });
  const projectOptions = useMemo(
    () => (projects.data?.items ?? []).map((project) => ({ value: project.id, label: project.name })),
    [projects.data],
  );

  // Validate the range before querying so the user gets feedback instead of a server 400.
  const rangeError =
    from && to && to < from ? 'End date cannot be earlier than the start date' : undefined;

  const debouncedSearch = useDebouncedValue(search.trim());
  const actionFilter = ACTIVITY_ACTIONS.find((value) => value === action);
  const feed = useActivityFeed(
    {
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

  const items = useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data]);
  const total = feed.data?.pages[0]?.meta.total ?? 0;
  const pageCount = feed.data?.pages.length ?? 0;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;

  // Infinite scroll inside the fixed-height box: when the sentinel at the bottom of the list
  // nears the box's edge, load the next page. The observer is recreated after each page so a
  // sentinel that is still visible (short pages in a tall box) keeps loading.
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
      },
      { root: scrollRef.current, rootMargin: '80px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, pageCount]);

  const hasFilters = Boolean(search || projectId || action || scope || from || to);
  const clearFilters = () => {
    setSearch('');
    setProjectId('');
    setAction('');
    setScope('');
    setFrom('');
    setTo('');
  };

  let body;
  if (feed.isError && !feed.data) {
    body = (
      <ErrorState
        message={feed.error.message}
        onRetry={() => feed.refetch()}
        retrying={feed.isFetching}
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
  } else if (feed.isPending) {
    body = <ActivityListSkeleton rows={8} />;
  } else if (items.length === 0) {
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
      <>
        <div className={feed.isRefetching && !isFetchingNextPage ? 'opacity-60 transition-opacity' : undefined}>
          <ActivityList items={items} basePath={base} />
        </div>

        {isFetchingNextPage && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 border-t border-border px-5 py-4 text-sm text-muted-foreground"
          >
            <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
            Loading more activity…
          </div>
        )}

        {feed.isFetchNextPageError && (
          <div className="border-t border-border px-5 py-4 text-center">
            <p className="mb-2 text-sm text-danger" role="alert">
              {feed.error?.message ?? 'Could not load more activity.'}
            </p>
            <Button variant="secondary" onClick={() => void fetchNextPage()}>
              Try again
            </Button>
          </div>
        )}

        {/* Sentinel for infinite scroll, plus a button for keyboard and no-observer cases. */}
        {hasNextPage && !isFetchingNextPage && !feed.isFetchNextPageError && (
          <div ref={sentinelRef} className="border-t border-border px-5 py-4 text-center">
            <Button variant="ghost" onClick={() => void fetchNextPage()}>
              Load more
            </Button>
          </div>
        )}

        {!hasNextPage && (
          <p className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground">
            You have reached the end · {total.toLocaleString()} {total === 1 ? 'activity' : 'activities'}
          </p>
        )}
      </>
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
          onChange={setSearch}
          placeholder="Search activity"
          label="Search activity"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterDropdown
            visibleLabel
            label="Project"
            allLabel="All projects"
            value={projectId}
            onChange={setProjectId}
            options={projectOptions}
          />
          <FilterDropdown
            visibleLabel
            label="Activity type"
            allLabel="All types"
            value={action}
            onChange={setAction}
            options={ACTION_OPTIONS}
          />
          <FilterDropdown
            visibleLabel
            label="Person"
            allLabel="Everyone"
            value={scope}
            onChange={setScope}
            options={SCOPE_OPTIONS}
          />
          <TextField
            label="From"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
          <TextField
            label="To"
            type="date"
            value={to}
            min={from || undefined}
            error={rangeError}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      {/* Fixed-height box: the list scrolls inside it while the page and filters stay put. */}
      <div
        ref={scrollRef}
        role="region"
        aria-label="Activity list"
        tabIndex={0}
        className="h-[65vh] min-h-80 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface"
      >
        {body}
      </div>
    </div>
  );
}
