import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In cross-domain deployments (Vercel + Railway), httpOnly cookies are set on
// the API domain and cannot be read by the edge middleware on the frontend domain.
// Route protection is handled client-side in DashboardLayout and AuthContext.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
