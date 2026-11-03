import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Every colour resolves to a CSS custom property defined in src/app/globals.css.
 * Palette = GeminAI Dx brand (CRM + contract portal): ink #010D13, green #139279, forest #001C17,
 * amber (signal) reserved for "requires attention".
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        paper: { DEFAULT: token("paper"), alt: token("paper-alt") },
        surface: token("surface"),
        ink: { DEFAULT: token("ink"), 2: token("ink-2") },
        muted: token("muted"),
        faint: token("faint"),
        line: token("line"),
        forest: { DEFAULT: token("forest"), 2: token("forest-2") },
        brand: {
          DEFAULT: token("brand"),
          strong: token("brand-strong"),
          soft: token("brand-soft"),
          line: token("brand-line"),
          ink: token("brand-ink"),
          on: token("on-brand"),
        },
        signal: { DEFAULT: token("signal"), soft: token("signal-soft"), line: token("signal-line"), ink: token("signal-ink") },
        danger: { DEFAULT: token("danger"), soft: token("danger-soft") },
        band: {
          DEFAULT: token("band-bg"),
          2: token("band-bg-2"),
          fg: token("band-fg"),
          muted: token("band-muted"),
          line: token("band-line"),
          brand: token("band-brand"),
          signal: token("band-signal"),
        },
        ring: token("brand"),
      },
      fontFamily: {
        display: ["var(--font-display)", "Iowan Old Style", "Georgia", "serif"],
        sans: ["var(--font-body)", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        // Contract portal: 6px buttons, 9px controls, 14px cards.
        sm: "6px",
        md: "9px",
        lg: "14px",
        xl: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgb(1 13 19 / 0.04), 0 8px 28px rgb(1 13 19 / 0.06)",
        pop: "0 14px 30px -10px rgb(0 0 0 / 0.45)",
        focus: "0 0 0 3px rgb(var(--brand-soft))",
      },
      letterSpacing: { eyebrow: ".14em" },
      transitionTimingFunction: { brand: "cubic-bezier(.16,1,.3,1)" },
      backgroundImage: {
        band: "radial-gradient(130% 150% at 12% 0%, rgb(var(--band-bg-2)) 0%, rgb(var(--band-bg)) 55%)",
      },
    },
  },
  plugins: [animate],
};

export default config;
