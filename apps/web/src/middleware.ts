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
      search: request.nextUrl.search,
      method: request.method,
      durationMs: Date.now() - startedAt,
    }),
  );

  // Dashboard protection happens in AuthGuard after the persisted client session
  // hydrates. Redirecting here can race the persisted token and force relogins.
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
