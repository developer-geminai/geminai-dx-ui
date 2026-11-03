"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "system" | "light" | "dark";
const ORDER: Theme[] = ["system", "light", "dark"];
const KEY = "gdx-cc-theme";

/** Same behaviour as geminaidx.com: follow the OS by default; an explicit choice sets data-theme on <html>. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Theme | null;
      if (saved && ORDER.includes(saved)) setTheme(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!;
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      title={`Theme: ${theme}`}
      onClick={() => {
        setTheme(next);
        applyTheme(next);
        try {
          localStorage.setItem(KEY, next);
        } catch {
          /* ignore */
        }
      }}
    >
      <Icon aria-hidden />
    </Button>
  );
}

/** Inline, pre-paint script so the stored theme applies before hydration (no flash). */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
