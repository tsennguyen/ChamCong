import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Force password change
    if (token?.must_change_password && path !== '/change-password') {
      return NextResponse.redirect(new URL('/change-password', req.url));
    }

    // Admin routes protection
    if (path.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/teacher', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/teacher/:path*', '/admin/:path*', '/checkin/:path*', '/change-password'],
};
