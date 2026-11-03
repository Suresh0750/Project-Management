'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function readSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Per-viewer sidebar preference; defaults to expanded on the server render. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, readSnapshot, () => false);

  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, readSnapshot() ? '0' : '1');
    } catch {
      // storage unavailable: preference just won't persist
    }
    listeners.forEach((listener) => listener());
  }, []);

  return [collapsed, toggle];
}
