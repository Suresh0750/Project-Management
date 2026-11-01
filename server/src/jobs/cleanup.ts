import { prisma } from '../../prisma/client.js';

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Removes verification codes that have passed their expiry. An expired code is already rejected
 * when used; this only stops rows from piling up for people who never came back.
 */
export async function deleteExpiredOtps(now: Date = new Date()): Promise<number> {
  const result = await prisma.emailVerification.deleteMany({ where: { expiresAt: { lt: now } } });
  return result.count;
}

async function runCleanup(): Promise<void> {
  try {
    const removed = await deleteExpiredOtps();
    if (removed > 0) console.info(`[cleanup] removed ${removed} expired verification code(s)`);
  } catch (error) {
    // A failed sweep must never take the API down; the next one will retry.
    console.error('[cleanup] failed to remove expired verification codes', error);
  }
}

/** Sweeps once at start-up and then every 30 minutes. Returns a function that stops it. */
export function startCleanupJobs(): () => void {
  void runCleanup();
  const timer = setInterval(() => void runCleanup(), CLEANUP_INTERVAL_MS);
  // Never keep the process alive just for housekeeping.
  timer.unref();
  return () => clearInterval(timer);
}
