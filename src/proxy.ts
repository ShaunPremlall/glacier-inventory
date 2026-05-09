import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')

  if (!user && !isAuthPage) {
    // Redirect unauthenticated users to sign-in
    const url = request.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
     // Redirect authenticated users away from auth pages
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    if (profile?.role === 'Admin') {
      url.pathname = '/admin/dashboard'
    } else {
      url.pathname = '/technician/dashboard'
    }
    return NextResponse.redirect(url)
  }

  if (user && !isAuthPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.status === 'inactive') {
      // Allow them to see a pending approval page or sign-in?
      // Redirecting them to a specific unapproved page might be better,
      // but for now let's just restrict access to protected areas.
      if (request.nextUrl.pathname !== '/auth/pending') {
          const url = request.nextUrl.clone()
          url.pathname = '/auth/pending'
          return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
    const isTechnicianRoute = request.nextUrl.pathname.startsWith('/technician')

    if (isAdminRoute && profile.role !== 'Admin') {
      // Redirect technician trying to access admin routes
      const url = request.nextUrl.clone()
      url.pathname = '/technician/dashboard'
      // Ideally we should pass a toast message in URL params or use a cookie
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }

    if (isTechnicianRoute && profile.role !== 'Technician' && profile.role !== 'Admin') {
      // Fallback
       const url = request.nextUrl.clone()
       url.pathname = '/'
       return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
