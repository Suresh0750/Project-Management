'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * A resend cooldown that survives a page refresh. The deadline (not the seconds left) is saved
 * under a key, so reloading the page, or opening it in another tab, carries on from the real
 * time left instead of starting over.
 *
 *   const { remaining, start } = useCountdown(`verify:${email}`);
 *   start(60);                  // a code was just sent
 *   startCountdown(key, 60);    // same, from outside a component (e.g. before navigating)
 */

const PREFIX = 'pf.cooldown.';
const listeners = new Set<() => void>();
// Used when storage is unavailable (private mode, blocked site data): lasts until the tab closes.
const memory = new Map<string, number>();

function readEnd(key: string): number {
  try {
    const stored = Number(window.localStorage.getItem(PREFIX + key));
    if (Number.isFinite(stored) && stored > 0) return stored;
  } catch {
    // fall through to memory
  }
  return memory.get(key) ?? 0;
}

function secondsLeft(key: string): number {
  return Math.max(0, Math.ceil((readEnd(key) - Date.now()) / 1000));
}

function notify() {
  listeners.forEach((listener) => listener());
}

/** Starts (or restarts) the cooldown for `key`. */
export function startCountdown(key: string, seconds: number): void {
  const end = Date.now() + seconds * 1000;
  memory.set(key, end);
  try {
    window.localStorage.setItem(PREFIX + key, String(end));
  } catch {
    // memory copy still works for this tab
  }
  notify();
}

/** Starts the cooldown only if none is running, so reopening a page never extends it. */
export function startCountdownIfIdle(key: string, seconds: number): void {
  if (typeof window !== 'undefined' && secondsLeft(key) === 0) startCountdown(key, seconds);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const timer = window.setInterval(listener, 500);
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(PREFIX)) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.clearInterval(timer);
    window.removeEventListener('storage', onStorage);
  };
}

/** Whole seconds left for `key`, ticking while it runs. Always 0 until the page is in the browser. */
export function useCountdown(key: string) {
  const remaining = useSyncExternalStore(
    subscribe,
    () => (key ? secondsLeft(key) : 0),
    () => 0,
  );
  const start = useCallback((seconds: number) => startCountdown(key, seconds), [key]);
  return { remaining, start };
}
