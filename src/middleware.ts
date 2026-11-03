import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap edge gate: no session cookie → login page. The cookie's signature, expiry and the
 * operator's organization grants are verified in the Node runtime on every page and API read
 * (lib/server/session.ts), so a forged cookie gets no further than this redirect target.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("gdx_cc_session")) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|brand/|icon.png|favicon.ico).*)"],
};
