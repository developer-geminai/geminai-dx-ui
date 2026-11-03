import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import {
  loadConfig,
  organizationsForOperator,
  type ControlCenterConfig,
  type OperatorConfig,
  type OrganizationConfig,
} from "./config";

export const SESSION_COOKIE = "gdx_cc_session";

interface SessionPayload {
  op: string;
  exp: number; // epoch seconds
}

export interface Session {
  operator: OperatorConfig;
  organizations: OrganizationConfig[];
  expiresAt: number;
}

/**
 * DEMO BUILD: the cookie is still HMAC-signed, but the secret falls back to a public constant
 * when GDX_CC_SESSION_SECRET is not set. That is acceptable only because the demo serves
 * fictional data and accepts any access key anyway.
 */
function sessionSecret(): Buffer {
  const value = process.env.GDX_CC_SESSION_SECRET;
  return Buffer.from(value && value.length >= 32 ? value : "geminai-dx-public-demo-session-secret-not-confidential", "utf8");
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function signSession(payload: SessionPayload, secret: Buffer): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${mac}`;
}

export function verifySession(token: string | undefined, secret: Buffer, nowSeconds = Date.now() / 1000): SessionPayload | null {
  if (!token || token.length > 1024) return null;
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(mac, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.op !== "string" || typeof payload.exp !== "number" || payload.exp <= nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}

export function issueSessionCookie(cfg: ControlCenterConfig, operator: OperatorConfig): { value: string; maxAge: number } {
  const maxAge = cfg.sessionTtlMinutes * 60;
  const value = signSession({ op: operator.id, exp: Math.floor(Date.now() / 1000) + maxAge }, sessionSecret());
  return { value, maxAge };
}

/** Resolve the current operator from the signed cookie, or null. */
export async function getSession(): Promise<Session | null> {
  const cfg = loadConfig();
  const jar = await cookies();
  const payload = verifySession(jar.get(SESSION_COOKIE)?.value, sessionSecret());
  if (!payload) return null;
  const operator = cfg.operators.find((o) => o.id === payload.op);
  if (!operator) return null;
  return { operator, organizations: organizationsForOperator(cfg, operator), expiresAt: payload.exp };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Unknown organizations return 404. */
export async function requireOrganization(orgId: string): Promise<{ session: Session; organization: OrganizationConfig }> {
  const session = await requireSession();
  const organization = session.organizations.find((o) => o.id === orgId);
  if (!organization) notFound();
  return { session, organization };
}
