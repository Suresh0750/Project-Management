'use client';

import { useEffect, useState } from 'react';
import { useCountdown } from '@/hooks/use-countdown';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast-provider';
import {
  useCancelEmailChange,
  useConfirmEmailChange,
  useResendEmailChangeCode,
} from '@/features/users/hooks';

interface EmailChangePanelProps {
  userId: string;
  currentEmail: string;
  pendingEmail: string;
  /** Seconds the server says are left before another code may be requested. */
  resendAfterSeconds?: number;
}

/**
 * Shown while an email change waits for its code. The new address only replaces the old one
 * once the code that was sent to it is entered here.
 */
export function EmailChangePanel({
  userId,
  currentEmail,
  pendingEmail,
  resendAfterSeconds = 0,
}: EmailChangePanelProps) {
  const toast = useToast();
  const confirm = useConfirmEmailChange(userId);
  const resend = useResendEmailChangeCode(userId);
  const cancel = useCancelEmailChange(userId);

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  // The deadline is saved per user, so a refresh carries on from the real time left. The server's
  // figure (from when the code was actually sent) keeps it right on other devices too.
  const { remaining: cooldown, start: startCooldown } = useCountdown(`emailchange:${userId}`);
  useEffect(() => {
    if (resendAfterSeconds > 0) startCooldown(resendAfterSeconds);
  }, [resendAfterSeconds, startCooldown]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code');
      return;
    }
    setError(null);
    confirm.mutate(code, {
      onSuccess: () => toast.success('Email address updated'),
      onError: (err) => setError(err.fieldErrors.otp ?? err.message),
    });
  };

  const sendAgain = () => {
    setError(null);
    resend.mutate(undefined, {
      onSuccess: (result) => {
        startCooldown(result.resendAfterSeconds);
        toast.success(`A new code was sent to ${result.newEmail}`);
      },
      onError: (err) => setError(err.message),
    });
  };

  const cancelChange = () => {
    cancel.mutate(undefined, {
      onSuccess: () => toast.success('Email change cancelled'),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mb-6 space-y-3 rounded-lg border border-info-border bg-info-soft/40 p-4"
    >
      <div>
        <p className="text-sm font-semibold">Email change waiting for a code</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a 6-digit code to <strong className="text-foreground">{pendingEmail}</strong>. The
          email stays <strong className="text-foreground">{currentEmail}</strong> until the code is
          entered below.
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <TextField
        label="Verification code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        value={otp}
        onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={confirm.isPending}>
          Verify and change email
        </Button>
        <Button
          variant="secondary"
          onClick={sendAgain}
          loading={resend.isPending}
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </Button>
        <Button variant="ghost" onClick={cancelChange} loading={cancel.isPending}>
          Cancel change
        </Button>
      </div>
    </form>
  );
}
