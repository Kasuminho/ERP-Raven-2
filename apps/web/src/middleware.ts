import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  if (!isDashboard) {
    return NextResponse.next();
  }

  // Dashboard protection happens in AuthGuard after the persisted client session
  // hydrates. Redirecting here can race the persisted token and force relogins.
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
