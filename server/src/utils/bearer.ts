import type { Request } from 'express';

/**
 * Cookies stay the primary way to sign in. Browsers that cannot keep them (private windows,
 * blocked third-party cookies, an app and API on different sites) opt in to bearer tokens by
 * sending this header; only then are the tokens also returned in the response body, so clients
 * that can use HttpOnly cookies never get tokens they could leak.
 */
export const AUTH_TRANSPORT_HEADER = 'x-auth-transport';

export function wantsBearerTokens(req: Request): boolean {
  return req.header(AUTH_TRANSPORT_HEADER) === 'bearer';
}

/** The token from `Authorization: Bearer <token>`, or undefined when absent or malformed. */
export function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  const token = header.slice(7).trim();
  return token === '' ? undefined : token;
}

/** The pair a bearer client stores. Never put this in a response unless they asked for it. */
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export function tokensIfRequested(req: Request, tokens: IssuedTokens): { tokens?: IssuedTokens } {
  return wantsBearerTokens(req) ? { tokens } : {};
}
