'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ROLE_BASE_PATH, ROLE_LABEL } from '@/lib/auth/navigation';
import type { AuthUser } from '@/types/auth';

interface ProfileMenuProps {
  user: AuthUser;
  onLogout: () => void;
  loggingOut: boolean;
}

const itemClass =
  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted';

export function ProfileMenu({ user, onLogout, loggingOut }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const base = ROLE_BASE_PATH[user.role];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
        className="flex size-10 items-center justify-center rounded-lg hover:bg-surface-muted"
      >
        <UserAvatar name={user.name} className="size-8" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-border bg-surface p-2 shadow-xl">
          <div className="border-b border-border px-3 pb-2 pt-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
          </div>
          <nav aria-label="Account" className="mt-2 space-y-0.5">
            <Link href={`${base}/profile`} onClick={() => setOpen(false)} className={itemClass}>
              <UserRound className="size-4" aria-hidden="true" />
              Profile
            </Link>
            <Link href={`${base}/settings`} onClick={() => setOpen(false)} className={itemClass}>
              <Settings className="size-4" aria-hidden="true" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              disabled={loggingOut}
              className={`${itemClass} text-danger disabled:opacity-60`}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
