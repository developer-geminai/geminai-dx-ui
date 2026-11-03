import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap edge gate: no session cookie → login. The cookie's signature and expiry are verified in
 * the Node runtime on every page (lib/server/session.ts). /transparency/* is public on purpose:
 * monitored employees have no account and open it from the tracker app.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("gdx_portal_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|transparency|_next/static|_next/image|brand/|icon.png|favicon.ico).*)"],
};
