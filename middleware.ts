import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Early return for static assets and Next.js internals
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Add cache-busting headers for non-API GET requests to prevent stale client bundles
  if (method === "GET" && !pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
