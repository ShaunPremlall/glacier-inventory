import { NextResponse, type NextRequest } from 'next/server'
// In middleware, we cannot use firebase-admin easily because it relies on Node.js native modules.
// We will do a basic check on the presence of the 'session' cookie.
// Real robust role checks happen in server actions or layouts.

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')

  if (!sessionCookie && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    return NextResponse.redirect(url)
  }

  // We can't strictly enforce Technician vs Admin here without parsing the JWT claims,
  // which requires a lightweight JWT decoding library since we don't have firebase-admin here.
  // Instead of complex parsing in middleware, we redirect authenticated users away from auth pages,
  // and we'll enforce the actual role protection inside the app directory (layouts/page components).
  if (sessionCookie && isAuthPage) {
    // We don't know their role, so we default to a safe page.
    // The dashboard page or a layout can redirect them appropriately.
    const url = request.nextUrl.clone()
    url.pathname = '/technician/dashboard' // Or a loading/router page
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
