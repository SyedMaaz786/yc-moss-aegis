import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SystemStatusBanner } from "@/components/SystemStatusBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "Aegis — Trust Layer for AI Agents";
const DESCRIPTION =
  "Real-time guardrails, grounding checks, latency tracing, and an evaluation harness for AI agents, built on Moss. YC Fall 2026 x Moss Zero Latency Builder Sprint.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Aegis",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface-0 text-text-primary">
        <header className="border-b border-border bg-surface-1/80 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-series-1 text-white text-xs font-bold">
                A
              </span>
              <span>Aegis</span>
              <span className="hidden sm:inline text-text-muted font-normal text-sm">
                / real-time trust layer for AI agents
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                Live Console
              </Link>
              <Link
                href="/eval"
                className="px-3 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                Evaluation
              </Link>
              <a
                href="https://github.com/SyedMaaz786/yc-moss-aegis"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <SystemStatusBanner />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-4 text-center text-xs text-text-muted">
          Built on <span className="text-text-secondary">Moss</span> for the YC Fall 2026 × Moss Zero Latency Builder
          Sprint — Agent Reliability, Security &amp; Evaluation track.
        </footer>
      </body>
    </html>
  );
}
