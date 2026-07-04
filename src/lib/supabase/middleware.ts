import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wyaaakqcrcktbhcwhgya.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_5SPpj6gV57gGoGj8-bH4Aw_Dam-5p6p'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip auth check if Supabase is not configured
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured - skipping auth middleware')
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/auth/callback']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (!user && !isPublicRoute && request.nextUrl.pathname !== '/') {
    // No user and trying to access protected route, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    // User is logged in but trying to access login/signup, redirect to dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
