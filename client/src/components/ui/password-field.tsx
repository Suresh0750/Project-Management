'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TextField, type TextFieldProps } from '@/components/ui/text-field';

export function PasswordField(props: Omit<TextFieldProps, 'type' | 'endAdornment'>) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      }
    />
  );
}
