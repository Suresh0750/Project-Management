
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const TOKEN_STORAGE_KEY = 'pf.auth.tokens';

// Used only when localStorage itself is unavailable (some locked-down private modes throw).
let fallback: StoredTokens | null = null;
let storageBroken = false;

function storage(): Storage | null {
  if (typeof window === 'undefined' || storageBroken) return null;
  try {
    return window.localStorage;
  } catch {
    storageBroken = true;
    return null;
  }
}

function isTokens(value: unknown): value is StoredTokens {
  if (typeof value !== 'object' || value === null) return false;
  const { accessToken, refreshToken } = value as Record<string, unknown>;
  return typeof accessToken === 'string' && typeof refreshToken === 'string';
}

/** Always reads the current value: another tab may have refreshed it since we last looked. */
export function getTokens(): StoredTokens | null {
  const store = storage();
  if (!store) return fallback;

  try {
    const raw = store.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isTokens(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setTokens(tokens: StoredTokens): void {
  const store = storage();
  if (!store) {
    fallback = tokens;
    return;
  }
  try {
    store.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    storageBroken = true;
    fallback = tokens;
  }
}

/** Erases the tokens everywhere this tab can reach. Other tabs are told through `storage`. */
export function clearTokens(): void {
  fallback = null;
  try {
    storage()?.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // nothing left to do
  }
}
