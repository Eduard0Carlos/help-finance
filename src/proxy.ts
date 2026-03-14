import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TOKEN_COOKIE } from "@/lib/jwt";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/cadastro"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const isLoggedIn = token ? !!verifyToken(token) : false;

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
