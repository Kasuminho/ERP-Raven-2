import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  if (!isDashboard) {
    return NextResponse.next();
  }

  const startedAt = Date.now();
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('X-Guild-Web-Cache', 'no-store');

  console.log(
    JSON.stringify({
      scope: 'guild-web',
      event: 'dashboard_request',
      path: request.nextUrl.pathname,
      method: request.method,
      durationMs: Date.now() - startedAt,
    }),
  );

  // The API owns the HttpOnly session cookie. AuthGuard verifies it through /auth/me.
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
