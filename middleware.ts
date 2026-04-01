import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'

const PROTECTED = ['/admin/dashboard', '/admin/settings']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!await getSessionFromRequest(request)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/admin/settings/:path*'],
}
