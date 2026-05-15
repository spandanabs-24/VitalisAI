import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/authToken";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname === "/signup") return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (/\.(ico|png|jpg|jpeg|svg|gif|webp|woff2?)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const safeNext =
    pathname.startsWith("/") && !pathname.startsWith("//")
      ? pathname
      : "/";

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", safeNext);
    return NextResponse.redirect(login);
  }

  try {
    await verifySessionToken(token);
    return NextResponse.next();
  } catch {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", safeNext);
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
