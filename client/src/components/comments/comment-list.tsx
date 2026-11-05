'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquare } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InfiniteScrollBox } from '@/components/ui/infinite-scroll-box';
import { Skeleton } from '@/components/ui/skeleton';
import { TextareaField } from '@/components/ui/textarea-field';
import { useToast } from '@/components/ui/toast-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { flattenFeed, useAddComment, useTaskComments } from '@/features/tasks/hooks';
import { commentSchema, type CommentValues } from '@/schemas/task';
import { formatDateTime } from '@/utils/format';

function CommentForm({ taskId, onPosted }: { taskId: string; onPosted: () => void }) {
  const toast = useToast();
  const addComment = useAddComment(taskId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  });

  // Discard an unsent draft when leaving the page.
  useEffect(() => () => reset(), [reset]);

  const submit = handleSubmit((values) => {
    addComment.mutate(values.content, {
      onSuccess: () => {
        toast.success('Comment added');
        reset();
        onPosted();
      },
    });
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {addComment.isError && <Alert tone="error">{addComment.error.message}</Alert>}
      <TextareaField
        label="Add a comment"
        rows={3}
        placeholder="Write a comment…"
        error={errors.content?.message}
        {...register('content')}
      />
      <div className="flex justify-end">
        <Button type="submit" loading={addComment.isPending}>
          Post comment
        </Button>
      </div>
    </form>
  );
}

export function CommentList({ taskId, canComment }: { taskId: string; canComment: boolean }) {
  const comments = useTaskComments(taskId);
  const items = useMemo(() => flattenFeed(comments.data?.pages), [comments.data]);
  const total = comments.data?.pages[0]?.meta.total ?? 0;
  const boxRef = useRef<HTMLDivElement>(null);

  let body;
  if (comments.isPending) {
    body = (
      <div className="space-y-3" aria-busy="true" aria-label="Loading comments">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  } else if (comments.isError && !comments.data) {
    body = (
      <ErrorState
        message={comments.error.message}
        onRetry={() => comments.refetch()}
        retrying={comments.isFetching}
      />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon={MessageSquare}
        title="No comments yet"
        description={canComment ? 'Start the conversation below.' : undefined}
      />
    );
  } else {
    body = (
      <InfiniteScrollBox
        label="Comments"
        scrollRef={boxRef}
        itemCount={items.length}
        hasNextPage={comments.hasNextPage}
        isFetchingNextPage={comments.isFetchingNextPage}
        isFetchNextPageError={comments.isFetchNextPageError}
        errorMessage={comments.error?.message}
        fetchNextPage={comments.fetchNextPage}
      >
        <ul className="space-y-4">
          {items.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <UserAvatar name={comment.author.name} className="size-8" />
              <div className="min-w-0 flex-1 rounded-lg bg-surface-muted px-3 py-2">
                <p className="text-sm">
                  <span className="font-medium">{comment.author.name}</span>{' '}
                  <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
                    {formatDateTime(comment.createdAt)}
                  </time>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.content}</p>
              </div>
            </li>
          ))}
        </ul>
      </InfiniteScrollBox>
    );
  }

  return (
    <section aria-labelledby="comments-heading" className="rounded-xl border border-border bg-surface p-6">
      <h2 id="comments-heading" className="mb-4 text-base font-semibold">
        Comments {comments.data ? `(${total})` : ''}
      </h2>
      {body}
      <div className="mt-5 border-t border-border pt-5">
        {canComment ? (
          <CommentForm
            taskId={taskId}
            // Newest comments are at the top: show the one just posted.
            onPosted={() => boxRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Comments are closed because this project is archived.
          </p>
        )}
      </div>
    </section>
  );
}
