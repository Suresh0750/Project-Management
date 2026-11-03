import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TextFieldProps extends ComponentProps<'input'> {
  label: string;
  error?: string | undefined;
  hint?: string;
  endAdornment?: ReactNode;
}

export function TextField({
  label,
  error,
  hint,
  endAdornment,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60',
            error ? 'border-danger' : 'border-border-strong',
            endAdornment ? 'pr-10' : null,
            className,
          )}
          {...props}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">{endAdornment}</div>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
