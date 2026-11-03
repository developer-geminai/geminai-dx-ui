import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/components/layout/theme-toggle";
import "./globals.css";

// Same families as geminaidx.com, self-hosted at build time by next/font.
const display = Newsreader({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Agent Control Center · GeminAI Dx", template: "%s · GeminAI Dx Control Center" },
  description: "Understand what your GeminAI Dx agents received, checked, decided and achieved.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101211" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
