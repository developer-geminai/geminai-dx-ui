import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/components/layout/theme-toggle";
import { getLang } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";
import "./globals.css";

// Same families as the CRM and the contract portal, self-hosted at build time by next/font.
const display = Newsreader({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-display", display: "swap" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Portal del cliente · GeminAI Dx", template: "%s · GeminAI Dx" },
  description: "Portal del cliente de GeminAI Dx: onboarding, diagnóstico y agentes en un solo sitio.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F7F4" },
    { media: "(prefers-color-scheme: dark)", color: "#06100E" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
