/**
 * Minimal i18n. Each module keeps its own dictionary next to it:
 *
 *   const messages = { es: { title: "Agentes" }, en: { title: "Agents" } } satisfies Bilingual<…>;
 *   const m = messages[lang];
 *
 * Server components get `lang` from getLang() (src/lib/i18n/server.ts); client components from
 * useLang() (src/lib/i18n/client.tsx). Spanish is the default; the Spanish dictionary is the
 * reference shape, so a missing English key is a type error.
 */
export type Lang = "es" | "en";
export const LANGS: Lang[] = ["es", "en"];
export const DEFAULT_LANG: Lang = "es";
export const LANG_COOKIE = "gdx_lang";

/** Define a bilingual dictionary whose EN side must match the ES shape. */
export function defineMessages<T extends Record<string, unknown>>(m: { es: T; en: NoInfer<T> }): Record<Lang, T> {
  return m;
}

/** Inline bilingual string for one-off labels. */
export type L10n = { es: string; en: string };
export const tr = (s: L10n, lang: Lang) => s[lang];

export function isLang(v: unknown): v is Lang {
  return v === "es" || v === "en";
}
