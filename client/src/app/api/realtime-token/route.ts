import { NextResponse, type NextRequest } from 'next/server';

/**
 * Live updates (Socket.IO) connect straight to the API, because a websocket cannot go through a
 * route handler. The socket cannot use the HttpOnly cookie across sites, so this endpoint hands
 * the page the current access token to put in the connection request. The token is kept in
 * memory only, for that one connection; it is never written to localStorage.
 */
export function GET(request: NextRequest): NextResponse {
  const token = request.cookies.get('access_token')?.value;
  const headers = { 'Cache-Control': 'no-store' };

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Authentication required', errors: [] },
      { status: 401, headers },
    );
  }
  return NextResponse.json({ success: true, data: { token } }, { headers });
}
