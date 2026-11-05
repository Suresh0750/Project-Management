'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardPaste, MailCheck } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast-provider';
import { useResendOtp, useVerifyEmail } from '@/features/auth/hooks';
import { useCountdown } from '@/hooks/use-countdown';
import { verifyEmailSchema, type VerifyEmailValues } from '@/schemas/auth';
import { ROLE_HOME } from '@/utils/role-routes';
import { asApiError } from '@/lib/api/errors';

export function VerifyEmailForm() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const initialEmail = params.get('email') ?? '';
  // "sent" means a code was just emailed, so the resend button starts on cooldown.
  const justSent = params.get('sent') === '1';

  const verify = useVerifyEmail();
  const resend = useResendOtp();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    getValues,
    setValue,
    trigger,
    control,
    formState: { errors },
  } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    mode: 'onTouched',
    defaultValues: { email: initialEmail, otp: '' },
  });

  // The saved deadline belongs to the email, so a refresh (or another tab) carries on from the
  // real time left, and a different address has its own timer.
  const typedEmail = useWatch({ control, name: 'email' });
  const { remaining, start } = useCountdown(`verify:${(typedEmail ?? '').trim().toLowerCase()}`);

  // Keep the address from the link in the form (also if the page is reused for another link).
  useEffect(() => {
    if (initialEmail) setValue('email', initialEmail);
  }, [initialEmail, setValue]);

  // Discard the typed code when the page goes away. The address from the link is kept: resetting
  // it to blank (which also runs once in development, when React tests the cleanup) emptied it.
  useEffect(() => () => reset({ email: initialEmail, otp: '' }), [reset, initialEmail]);

  const submit = handleSubmit((values) => {
    setFormError(null);
    verify.mutate(values, {
      onSuccess: (user) => {
        toast.success('Email verified. Welcome aboard!');
        router.replace(ROLE_HOME[user.role]);
      },
      onError: (raw) => {
        const error = asApiError(raw);
        // Verified elsewhere in the meantime (another browser or device): nothing left to do here.
        if (error.fieldErrors.code === 'EMAIL_ALREADY_VERIFIED') {
          router.replace('/login?reason=verified');
          return;
        }
        const otpMessage = error.fieldErrors.otp;
        if (otpMessage) {
          setError('otp', { message: otpMessage });
          return;
        }
        setFormError(error.message);
      },
    });
  });

  // Pull the 6-digit code out of whatever was copied, e.g. the email subject
  // "123456 is your ProjectFlow verification code" or "123 456".
  const pasteCode = async () => {
    try {
      const copied = await navigator.clipboard.readText();
      const code = /\d{6}/.exec(copied.replace(/[\s-]/g, ''))?.[0];
      if (!code) {
        toast.error('No 6-digit code found on the clipboard.');
        return;
      }
      setValue('otp', code, { shouldValidate: true, shouldDirty: true });
      setFormError(null);
    } catch {
      toast.error('Could not read the clipboard. Paste the code into the box instead.');
    }
  };

  const resendCode = async () => {
    // Reuse the form's email validation instead of sending a malformed request.
    if (!(await trigger('email'))) return;
    setFormError(null);
    resend.mutate(getValues('email'), {
      onSuccess: ({ resendAfterSeconds }) => {
        toast.success('If that address needs verification, a new code is on its way.');
        start(resendAfterSeconds);
      },
      onError: (error) => setFormError(error.message),
    });
  };

  return (
    <form onSubmit={submit} onChange={() => setFormError(null)} noValidate className="space-y-4">
      {justSent && !formError && (
        <Alert tone="success">
          <span className="inline-flex items-center gap-1.5">
            <MailCheck className="size-4" aria-hidden="true" />
            We emailed a 6-digit code. It expires in 10 minutes.
          </span>
        </Alert>
      )}
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <TextField
        label="Verification code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        endAdornment={
          <button
            type="button"
            onClick={() => void pasteCode()}
            aria-label="Paste code from clipboard"
            title="Paste code"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <ClipboardPaste className="size-4" aria-hidden="true" />
          </button>
        }
        className="text-center text-xl font-semibold tracking-[0.5em]"
        error={errors.otp?.message}
        {...register('otp', {
          // Keep digits only, so pasted codes with spaces or dashes still work.
          onChange: (event: { target: HTMLInputElement }) => {
            event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
          },
        })}
      />

      <Button type="submit" fullWidth loading={verify.isPending}>
        {verify.isPending ? 'Verifying…' : 'Verify email'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Did not get a code?</span>
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => void resendCode()}
          loading={resend.isPending}
          disabled={remaining > 0}
        >
          {remaining > 0 ? `Resend in ${remaining}s` : 'Resend code'}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Wrong address?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Start over
        </Link>
      </p>
    </form>
  );
}
