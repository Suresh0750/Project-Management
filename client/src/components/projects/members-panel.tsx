'use client';

import { useState } from 'react';
import { UserMinus, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAddMember, useMemberCandidates, useRemoveMember } from '@/features/projects/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { ProjectDetail, ProjectMember } from '@/types/project';
import { formatDate } from '@/utils/format';

function AddMemberCard({ project }: { project: ProjectDetail }) {
  const toast = useToast();
  const addMember = useAddMember(project.id);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim());
  const candidates = useMemberCandidates(project.id, debounced, true);

  const add = (userId: string, name: string) => {
    addMember.mutate(userId, {
      onSuccess: () => toast.success(`${name} was added to the project`),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold">Add members</h3>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">
        Only active users with the Member role can be added.
      </p>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email"
        label="Search members to add"
      />

      <ul className="mt-3 divide-y divide-border" aria-busy={candidates.isFetching}>
        {candidates.isPending &&
          Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="py-3">
              <Skeleton className="h-8 w-full" />
            </li>
          ))}

        {candidates.isError && (
          <li className="py-3 text-sm text-danger" role="alert">
            {candidates.error.message}
          </li>
        )}

        {candidates.data?.length === 0 && (
          <li className="py-4 text-center text-sm text-muted-foreground">
            {debounced ? 'No members match your search.' : 'No more members available to add.'}
          </li>
        )}

        {candidates.data?.map((person) => (
          <li key={person.id} className="flex items-center gap-3 py-2.5">
            <UserAvatar name={person.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{person.name}</p>
              <p className="truncate text-xs text-muted-foreground">{person.email}</p>
            </div>
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              loading={addMember.isPending && addMember.variables === person.id}
              disabled={addMember.isPending}
              onClick={() => add(person.id, person.name)}
            >
              <UserPlus className="size-3.5" aria-hidden="true" />
              Add
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MembersPanel({ project }: { project: ProjectDetail }) {
  const toast = useToast();
  const removeMember = useRemoveMember(project.id);
  const [pendingRemoval, setPendingRemoval] = useState<ProjectMember | null>(null);
  const editable = project.canManage && !project.archivedAt;

  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    removeMember.mutate(pendingRemoval.id, {
      onSuccess: () => toast.success(`${pendingRemoval.name} was removed`),
      onError: (error) => toast.error(error.message),
      onSettled: () => setPendingRemoval(null),
    });
  };

  return (
    <div className={editable ? 'grid gap-6 lg:grid-cols-[1fr_360px]' : undefined}>
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Members ({project.members.length})</h3>
        </div>

        {project.members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description={
              editable
                ? 'Add members from the panel to start assigning work.'
                : 'Members will appear here once they are added.'
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {project.members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-5 py-3">
                <UserAvatar name={member.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email} · joined {formatDate(member.joinedAt)}
                  </p>
                </div>
                {editable && (
                  <Button
                    variant="ghost"
                    className="h-8 px-3 text-xs text-danger"
                    onClick={() => setPendingRemoval(member)}
                    aria-label={`Remove ${member.name}`}
                  >
                    <UserMinus className="size-3.5" aria-hidden="true" />
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editable && <AddMemberCard project={project} />}

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Remove member?"
        description={`${pendingRemoval?.name ?? 'This member'} will lose access to the project and be unassigned from its tasks.`}
        confirmLabel="Remove"
        tone="danger"
        loading={removeMember.isPending}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={confirmRemoval}
      />
    </div>
  );
}
