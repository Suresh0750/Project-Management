import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SelectOption } from '@/components/ui/select-field';

interface FilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  allLabel: string;
  /** Hide the "all" entry when a value is always required. */
  hideAll?: boolean;
  /** Show the label above the control (use when neighbouring fields have visible labels). */
  visibleLabel?: boolean;
}

/** Compact native select for list filters; the empty value means "no filter". */
export function FilterDropdown({
  label,
  value,
  onChange,
  options,
  allLabel,
  hideAll = false,
  visibleLabel = false,
}: FilterDropdownProps) {
  const id = useId();

  return (
    <div className={visibleLabel ? 'space-y-1.5' : undefined}>
      {visibleLabel && (
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...(visibleLabel ? {} : { 'aria-label': label })}
          className="h-10 w-full appearance-none rounded-lg border border-border-strong bg-surface pl-3 pr-9 text-sm"
        >
          {!hideAll && <option value="">{allLabel}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
