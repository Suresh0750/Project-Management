'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SidebarContent } from '@/components/layout/sidebar-content';
import type { AuthUser } from '@/types/auth';

interface MobileSidebarProps {
  user: AuthUser;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

export function MobileSidebar({ user, open, onClose, onLogout, loggingOut }: MobileSidebarProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-border bg-surface shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-3 top-4 z-10 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <SidebarContent
          user={user}
          onNavigate={onClose}
          onLogout={onLogout}
          loggingOut={loggingOut}
        />
      </div>
    </div>
  );
}
