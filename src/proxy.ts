import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/admin", "/dashboard", "/painel"];

export function proxy(request: NextRequest) {
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();
  const hasLocalSession = request.cookies.get("local-admin-session")?.value === "authenticated";
  if (!hasLocalSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/dashboard/:path*", "/painel/:path*"] };
