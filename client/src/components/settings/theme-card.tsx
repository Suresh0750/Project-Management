'use client';

import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTheme, type ThemePreference } from '@/hooks/use-theme';
import { cn } from '@/utils/cn';

const OPTIONS: Array<{ value: ThemePreference; label: string; description: string; icon: LucideIcon }> = [
  { value: 'system', label: 'System', description: 'Match your device', icon: Monitor },
  { value: 'light', label: 'Light', description: 'Always light', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Always dark', icon: Moon },
];

export function ThemeCard() {
  const [preference, setPreference] = useTheme();

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-base font-semibold">Appearance</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how ProjectFlow looks. This is saved on this device only.
      </p>

      <fieldset className="mt-4">
        <legend className="sr-only">Theme</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {OPTIONS.map(({ value, label, description, icon: Icon }) => {
            const selected = preference === value;
            return (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                  selected ? 'border-primary bg-info-soft' : 'border-border hover:bg-surface-muted',
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={selected}
                  onChange={() => setPreference(value)}
                  className="sr-only"
                />
                <Icon
                  className={cn('size-5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')}
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
