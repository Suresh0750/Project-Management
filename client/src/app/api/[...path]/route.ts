import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'access_token';
const TIMEOUT_MS = 20_000;

// Only these request headers are passed on; everything else the browser sent stays here.
const FORWARDED_REQUEST_HEADERS = [
  'content-type',
  'accept',
  'accept-language',
  'user-agent',
  'origin',
  'referer',
  'x-request-id',
];
// Only these response headers are passed back (Set-Cookie is handled separately).
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'x-request-id', 'retry-after', 'cache-control'];
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

function failure(status: number, message: string): NextResponse {
  // Same shape as the API's own errors, so the client handles it like any other failure.
  return NextResponse.json({ success: false, message, errors: [] }, { status });
}

async function forward(request: NextRequest): Promise<Response> {
  const apiOrigin = process.env.API_URL;
  if (!apiOrigin) {
    console.error('API_URL is not set: the API gateway cannot reach the API');
    return failure(503, 'The service is temporarily unavailable. Please try again in a moment.');
  }

  const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, apiOrigin);

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // The refresh token cookie is read by the API itself, so the cookies go along.
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  // Every request carries the access token as a Bearer header, taken from the HttpOnly cookie.
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  // The API's rate limiter and logs should see the visitor, not this server.
  const visitor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (visitor) headers.set('x-forwarded-for', visitor);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: METHODS_WITHOUT_BODY.has(request.method) ? null : await request.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    console.error(`API gateway: ${request.method} ${target.pathname} failed`, error);
    return timedOut
      ? failure(504, 'The server took too long to respond. Please try again.')
      : failure(502, 'The service is temporarily unavailable. Please try again in a moment.');
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  // Login, refresh and logout set or clear cookies: hand them to the browser for this site.
  for (const setCookie of upstream.headers.getSetCookie()) {
    responseHeaders.append('set-cookie', setCookie);
  }

  const noBody = upstream.status === 204 || upstream.status === 304 || request.method === 'HEAD';
  return new NextResponse(noBody ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
  forward as HEAD,
};
