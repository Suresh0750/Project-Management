export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

const KEY = 'pf.auth.tokens';

// Falls back to memory when storage is unavailable (private mode, blocked site data).
let memory: StoredTokens | null = null;

export function getTokens(): StoredTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredTokens>;
      if (typeof parsed.accessToken === 'string' && typeof parsed.refreshToken === 'string') {
        return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
      }
    }
  } catch {
    // unreadable storage: use memory
  }
  return memory;
}

export function setTokens(tokens: StoredTokens): void {
  memory = tokens;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(tokens));
  } catch {
    // memory copy still works for this page
  }
}

export function clearTokens(): void {
  memory = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

export const TOKEN_STORAGE_KEY = KEY;
