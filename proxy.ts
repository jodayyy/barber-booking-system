import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'

const PROTECTED = ['/dashboard', '/settings']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await getSessionFromRequest(request)

  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/settings', '/login'],
}
