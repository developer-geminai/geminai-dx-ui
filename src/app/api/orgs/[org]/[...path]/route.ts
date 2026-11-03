import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/server/session";
import { BackendError, backendFetch, describeError } from "@/lib/server/console-api";
import { buildBackendPath } from "@/lib/api-paths";

export const dynamic = "force-dynamic";

/**
 * Same-origin, GET-only read endpoint used by interactive client panels (question context, audit).
 * DEMO BUILD: served from the bundled synthetic snapshot. Requires a signed demo session;
 * only allow-listed reads are answered; mutations return 405.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ org: string; path: string[] }> }) {
  const { org, path } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const organization = session.organizations.find((o) => o.id === decodeURIComponent(org));
  if (!organization) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const segments = path.map((p) => decodeURIComponent(p));
  const query = {
    agent: req.nextUrl.searchParams.get("agent") ?? undefined,
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    status: req.nextUrl.searchParams.get("status") ?? undefined,
  };
  if (!buildBackendPath(segments, query)) return NextResponse.json({ error: "Unknown read endpoint" }, { status: 400 });

  try {
    const res = backendFetch(organization, segments, query);
    return new NextResponse(res.body, {
      status: res.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const e = describeError(err);
    return NextResponse.json({ error: e.detail }, { status: err instanceof BackendError ? err.status : e.status });
  }
}

function methodNotAllowed() {
  return NextResponse.json({ error: "Read-only Control Center: no mutations" }, { status: 405, headers: { Allow: "GET" } });
}
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
