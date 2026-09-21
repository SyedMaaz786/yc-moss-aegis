import type { Metadata } from 'next';
import Link from 'next/link';
import { SystemStatusBanner } from '@/components/SystemStatusBanner';
import './globals.css';
export const metadata: Metadata = {
  title: 'Aegis | Evidence before trust',
  description: 'A live trust layer for AI agents. Challenge the input, verify the context, and inspect the evidence. Built with Moss by SyedMaaz786.',
  metadataBase: new URL('https://yc-moss-aegis.vercel.app'),
  icons: { icon: '/submission/mark.svg' },
  openGraph: { title: 'Aegis — Evidence before trust', description: 'Runtime guardrails, source integrity and honest evaluations, powered by Moss.', type: 'website', images: ['/submission/social.png'] },
  twitter: { card: 'summary_large_image', images: ['/submission/social.png'] },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="min-h-screen flex flex-col">
    <a href="#main" className="sr-only focus:not-sr-only focus:p-4">Skip to content</a>
    <header className="border-b border-border bg-surface-0/95 sticky top-0 z-30 backdrop-blur">
      <div className="shell flex items-center justify-between gap-3 h-[70px]">
        <Link href="/" aria-label="Aegis home" className="flex items-center gap-3">
          <svg width="29" height="34" viewBox="0 0 29 34" fill="none" aria-hidden="true"><path d="M14.5 2 27 7v10c0 8-12.5 15-12.5 15S2 25 2 17V7Z" stroke="#7de3c2" strokeWidth="1.6"/><path d="m8 17 4 4 9-10" stroke="#7de3c2" strokeWidth="1.8"/></svg>
          <span className="text-xl tracking-[-0.06em] font-bold">aegis<span className="text-series-1">.</span></span>
          <span className="tag hidden sm:inline-flex ml-2">TRUST INFRASTRUCTURE</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center">
          <Link className="nav-link" href="/">Console</Link>
          <Link className="nav-link" href="/eval">Evaluation</Link>
          <Link className="nav-link" href="/evidence">Evidence</Link>
          <a className="nav-link hidden sm:block" href="https://github.com/SyedMaaz786/yc-moss-aegis" target="_blank" rel="noreferrer">GitHub ↗</a>
        </nav>
      </div>
    </header>
    <SystemStatusBanner />
    <main id="main" className="flex-1">{children}</main>
    <footer className="shell border-t border-border mt-12 py-6 flex flex-wrap gap-3 items-center justify-between text-xs text-text-muted">
      <span>Built by <a className="text-text-secondary underline underline-offset-4" href="https://github.com/SyedMaaz786">SyedMaaz786</a> · Powered by Moss</span>
      <span>YC × Moss Builder Sprint · Track 04</span>
      <span>Fictional bank. Real guardrails.</span>
    </footer>
  </body></html>;
}
