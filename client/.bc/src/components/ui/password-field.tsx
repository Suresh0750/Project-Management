'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TextField, type TextFieldProps } from '@/components/ui/text-field';

interface PasswordFieldProps extends Omit<TextFieldProps, 'type' | 'endAdornment'> {
  /** Optional controlled visibility (e.g. to reveal a generated password). */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
}

export function PasswordField({ visible, onVisibleChange, ...props }: PasswordFieldProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const isVisible = visible ?? internalVisible;
  const Icon = isVisible ? EyeOff : Eye;

  const toggle = () => {
    const next = !isVisible;
    setInternalVisible(next);
    onVisibleChange?.(next);
  };

  return (
    <TextField
      {...props}
      type={isVisible ? 'text' : 'password'}
      endAdornment={
        <button
          type="button"
          onClick={toggle}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      }
    />
  );
}
