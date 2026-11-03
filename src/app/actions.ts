"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_OPERATOR_ID, loadConfig } from "@/lib/server/config";
import { SESSION_COOKIE, issueSessionCookie } from "@/lib/server/session";

export interface LoginState {
  error?: string;
}

/** DEMO BUILD: any non-empty access key signs in as the demo operator. */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const key = String(formData.get("accessKey") ?? "");
  if (!key.trim()) return { error: "Enter any access key to open the demo." };
  const cfg = loadConfig();
  const operator = cfg.operators.find((o) => o.id === DEMO_OPERATOR_ID);
  if (!operator) return { error: "Demo operator is not configured." };
  const { value, maxAge } = issueSessionCookie(cfg, operator);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.VERCEL === "1",
    path: "/",
    maxAge,
  });
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
