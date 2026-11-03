import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "./index";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}
