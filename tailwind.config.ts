import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Every colour resolves to a CSS custom property defined in src/app/globals.css.
 * Token names and values mirror https://www.geminaidx.com/ (--paper, --ink, --brand, --signal…),
 * plus a few dashboard-only semantic tokens (danger, chart series) derived from the same palette.
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
        ink: token("ink"),
        muted: token("muted"),
        line: token("line"),
        brand: {
          DEFAULT: token("brand"),
          strong: token("brand-strong"),
          soft: token("brand-soft"),
          on: token("on-brand"),
        },
        signal: { DEFAULT: token("signal"), soft: token("signal-soft") },
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
        // Site uses 6px buttons, 9–10px controls, 14–16px cards.
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "16px",
      },
      boxShadow: {
        card: "0 1px 0 rgb(0 0 0 / 0.02), 0 18px 48px rgb(0 0 0 / 0.08)",
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
