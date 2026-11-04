'use client';

import { useSyncExternalStore } from 'react';
import { todayInputValue } from '@/utils/format';

const subscribe = () => () => undefined;

/**
 * Today's date as an <input type="date"> value, read in the browser only. It is '' while the
 * page is prerendered (the current time must not be baked into the build), then the real date
 * once the page is on screen.
 */
export function useToday(): string {
  return useSyncExternalStore(subscribe, todayInputValue, () => '');
}
