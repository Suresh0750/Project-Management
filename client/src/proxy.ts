import { NextResponse, type NextRequest } from 'next/server';

/**
 * Runs on the server before a page is rendered (Next.js 16's replacement for middleware).
 *
 *  - Pages for visitors (login, register, forgot password, verify email, reset password):
 *    someone who is already signed in goes to their own dashboard instead.
 *  - Pages for members of the team (/admin, /manager, /member): someone with no session goes to
 *    the login page, and someone in the wrong area goes to their own.
 *
 * This is a convenience that avoids showing the wrong page at all. It is not what protects the
 * data: the API checks the real session on every request. For that reason the role is read from
 * the access token WITHOUT verifying its signature, only to decide where to send the person.
 *
 * Kept self-contained on purpose (Next.js advises proxy files not to share modules).
 */

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'MEMBER';

const HOME: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  PROJECT_MANAGER: '/manager/dashboard',
  MEMBER: '/member/dashboard',
};

const AREAS: Array<[prefix: string, role: Role]> = [
  ['/admin', 'ADMIN'],
  ['/manager', 'PROJECT_MANAGER'],
  ['/member', 'MEMBER'],
];

const VISITOR_PAGES = ['/login', '/register', '/forgot-password', '/verify-email', '/reset-password'];

/** The role claim of an access token, or null. Not verified: used only for routing. */
function roleFromToken(token: string | undefined): Role | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const role = (JSON.parse(json) as { role?: unknown }).role;
    return role === 'ADMIN' || role === 'PROJECT_MANAGER' || role === 'MEMBER' ? role : null;
  } catch {
    return null;
  }
}

function redirectTo(request: NextRequest, pathname: string, search = ''): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search, searchParams } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const hasSession = Boolean(accessToken ?? request.cookies.get(REFRESH_TOKEN_COOKIE)?.value);
  const role = roleFromToken(accessToken);

  if (VISITOR_PAGES.includes(pathname)) {
    // `reason` means the app has just ended the session on purpose (expired, deactivated, role
    // changed). Never bounce those people back, whatever cookies are still around.
    if (searchParams.has('reason')) return NextResponse.next();

    // Signed in: go to the dashboard. With only a refresh cookie the role is unknown here; the
    // page itself checks the session and redirects.
    if (role) return redirectTo(request, HOME[role]);
    return NextResponse.next();
  }

  const area = AREAS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!area) return NextResponse.next();

  // No session at all: sign in first, and come back here afterwards.
  if (!hasSession) {
    return redirectTo(request, '/login', `?next=${encodeURIComponent(`${pathname}${search}`)}`);
  }

  // Signed in, but this is another role's area: go to your own.
  if (role && role !== area[1]) return redirectTo(request, HOME[role]);

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/register',
    '/forgot-password',
    '/verify-email',
    '/reset-password',
    '/admin/:path*',
    '/manager/:path*',
    '/member/:path*',
  ],
};
