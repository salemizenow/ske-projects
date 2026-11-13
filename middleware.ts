import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/login', '/register'];

// Fast check only: no cookie means sign in first. Pages and actions still verify the session in the database.
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (!req.cookies.get('ske_session')) {
    const url = new URL('/login', req.url);
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|brand|icon.svg|favicon.ico).*)'] };
