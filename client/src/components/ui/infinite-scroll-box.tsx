'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface InfiniteScrollBoxProps {
  children: ReactNode;
  /** Items currently rendered. Changing it re-arms the observer after each page. */
  itemCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  errorMessage?: string | undefined;
  fetchNextPage: () => unknown;
  /** Accessible name of the scroll area, also used in the loader text ("Loading more …"). */
  label: string;
  /** Pass a ref to scroll the box from outside (e.g. back to the top after posting). */
  scrollRef?: RefObject<HTMLDivElement | null>;
  className?: string;
}

/**
 * A fixed-height box that loads the next page when the reader scrolls near its bottom. The
 * scrollbar is hidden (wheel, touch and keyboard still scroll), a spinner shows while a page is
 * on its way, and a "Load more" button covers keyboard use and browsers without
 * IntersectionObserver.
 */
export function InfiniteScrollBox({
  children,
  itemCount,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  errorMessage,
  fetchNextPage,
  label,
  scrollRef,
  className,
}: InfiniteScrollBoxProps) {
  const ownRef = useRef<HTMLDivElement>(null);
  const boxRef = scrollRef ?? ownRef;
  const sentinelRef = useRef<HTMLDivElement>(null);

  // The observer is recreated after every page, so a sentinel that is still visible (short
  // pages in a tall box) keeps loading until the box is full.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
      },
      { root: boxRef.current, rootMargin: '60px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage, itemCount, boxRef]);

  return (
    <div
      ref={boxRef}
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn('scrollbar-hidden max-h-96 overflow-y-auto overscroll-contain', className)}
    >
      {children}

      {isFetchingNextPage && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
        >
          <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
          Loading more…
        </div>
      )}

      {isFetchNextPageError && (
        <div className="py-3 text-center">
          <p role="alert" className="mb-2 text-sm text-danger">
            {errorMessage ?? 'Could not load more.'}
          </p>
          <Button variant="secondary" onClick={() => void fetchNextPage()}>
            Try again
          </Button>
        </div>
      )}

      {hasNextPage && !isFetchingNextPage && !isFetchNextPageError && (
        <div ref={sentinelRef} className="py-2 text-center">
          <Button variant="ghost" onClick={() => void fetchNextPage()}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
