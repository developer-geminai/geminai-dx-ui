import type { Access, SectionKey } from "@/lib/features";

export interface NavItem {
  key: SectionKey;
  href: string;
  label: string;
  access: Exclude<Access, "hidden" | "forbidden">;
  badge?: number;
  /** One-line unlock hint for locked items. */
  hint?: string;
}

/** Order of the main menu (spec "Mapa de navegación"): eight entries. */
export const MAIN_SECTIONS: SectionKey[] = ["home", "questions", "agents", "diagnostic", "devices", "contracts", "billing", "settings"];
/** Below the separator. */
export const EXTRA_SECTIONS: SectionKey[] = ["roadmap", "internal"];
/** Mobile bottom bar: Home, Agents, Questions + "More". */
export const MOBILE_SECTIONS: SectionKey[] = ["home", "agents", "questions"];
