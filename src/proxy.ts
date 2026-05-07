import { NextResponse, type NextRequest } from 'next/server'

const protectedPaths = ['/dashboard', '/canteen', '/repair', '/profile', '/admin']
const authCookieName = 'pingtan_token'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
  const hasSession = Boolean(request.cookies.get(authCookieName)?.value)

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (pathname === '/login' && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
