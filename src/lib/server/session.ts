import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { FeatureKey, Organization, Role, Viewer } from "@/lib/api/types";
import { getLang } from "@/lib/i18n/server";
import type { Lang } from "@/lib/i18n";
import { sectionAccess, sectionByKey, type Access, type SectionKey } from "@/lib/features";

export const SESSION_COOKIE = "gdx_portal_session";
const TTL_SECONDS = 8 * 3600;

interface SessionPayload {
  uid: string;
  exp: number;
}

/**
 * DEMO BUILD: any credentials sign in (see app/actions.ts). The cookie is still HMAC-signed; the
 * secret falls back to a public constant when GDX_SESSION_SECRET is unset — acceptable only for
 * the demo with fictional data. Real auth (own / Supabase / Clerk, with room for SSO) replaces this.
 */
function secret(): Buffer {
  const v = process.env.GDX_SESSION_SECRET;
  return Buffer.from(v && v.length >= 32 ? v : "geminai-dx-portal-demo-secret-not-confidential", "utf8");
}

export function signSession(payload: SessionPayload, key = secret()): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const mac = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifySession(token: string | undefined, key = secret(), now = Date.now() / 1000): SessionPayload | null {
  if (!token || token.length > 1024) return null;
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = createHmac("sha256", key).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    return typeof p.uid === "string" && typeof p.exp === "number" && p.exp > now ? p : null;
  } catch {
    return null;
  }
}

export function issueSession(uid: string) {
  return { value: signSession({ uid, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }), maxAge: TTL_SECONDS };
}

export async function getViewer(): Promise<Viewer | null> {
  const p = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!p) return null;
  return api().getViewer(p.uid);
}

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/login");
  return v;
}

export interface OrgContext {
  viewer: Viewer;
  org: Organization;
  flags: Record<FeatureKey, boolean>;
  /** Role in this org (staff → admin). */
  role: Role | null;
  staff: boolean;
  lang: Lang;
  actor: string;
  access: (section: SectionKey) => Access;
}

/** Resolve viewer + organization + flags for a page under /o/{org}. Unknown or forbidden org → 404. */
export async function requireOrg(orgId: string): Promise<OrgContext> {
  const viewer = await requireViewer();
  if (!viewer.organizations.some((o) => o.id === orgId)) notFound();
  const [org, flags, lang] = await Promise.all([api().getOrganization(orgId), api().getFeatureFlags(orgId), getLang()]);
  if (!org) notFound();
  const staff = viewer.user.geminaiStaff;
  const role = staff ? "admin" : (viewer.user.memberships.find((m) => m.orgId === orgId)?.role ?? null);
  return {
    viewer,
    org,
    flags: flags.flags,
    role,
    staff,
    lang,
    actor: viewer.user.id,
    access: (section) => sectionAccess(sectionByKey(section), { phase: org.phase, flags: flags.flags, role, staff }),
  };
}
