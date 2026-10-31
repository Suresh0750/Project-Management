'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast-provider';
import { useUpdateProfile } from '@/features/auth/hooks';
import type { UpdateProfilePayload } from '@/features/auth/api';
import { profileSchema, type ProfileValues } from '@/schemas/auth';
import type { AuthUser } from '@/types/auth';

const FIELDS = ['name', 'email', 'currentPassword'] as const;

export function ProfileForm({ user }: { user: AuthUser }) {
  const toast = useToast();
  const updateProfile = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);

  const initial: ProfileValues = { name: user.name, email: user.email, currentPassword: '' };

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema(user.email)) as Resolver<ProfileValues>,
    mode: 'onTouched',
    defaultValues: initial,
  });

  const email = useWatch({ control, name: 'email' });
  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase();

  useEffect(
    () => () => {
      reset();
      setFormError(null);
    },
    [reset],
  );

  const submit = handleSubmit((values) => {
    setFormError(null);

    const payload: UpdateProfilePayload = {};
    if (values.name !== user.name) payload.name = values.name;
    if (values.email.toLowerCase() !== user.email.toLowerCase()) {
      payload.email = values.email;
      payload.currentPassword = values.currentPassword;
    }

    updateProfile.mutate(payload, {
      onSuccess: (updated) => {
        toast.success('Profile updated');
        reset({ name: updated.name, email: updated.email, currentPassword: '' });
      },
      onError: (error) => {
        let mapped = false;
        for (const field of FIELDS) {
          const message = error.fieldErrors[field];
          if (message) {
            setError(field, { message });
            mapped = true;
          }
        }
        if (error.status === 409) {
          setError('email', { message: error.message });
          mapped = true;
        }
        if (!mapped) setFormError(error.message);
      },
    });
  });

  return (
    <form onSubmit={submit} onChange={() => setFormError(null)} noValidate className="space-y-5">
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField
        label="Full name"
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      {emailChanged && (
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          hint="Required to confirm a change of email address."
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={updateProfile.isPending} disabled={!isDirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
