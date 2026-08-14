import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Navigation from "@/components/navigation";
// Providers (WalletProvider) intentionally NOT wrapped for the demo-only build:
// it transitively imports nftGate.ts, which inlines NEXT_PUBLIC_TRADEPORT_* into
// the shared client bundle. Home + /demo do not consume the wallet. Re-wrap to
// reactivate /launch. See D2a.

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE = "COSMO — The Institutional Layer for Autonomous Economies";
const SITE_DESCRIPTION =
  "COSMO is the institutional layer for autonomous economies, built on Supra: delegated authority, signed mandates, pinned policies and verifiable receipts around paid agent work — funding, delivery, verification and payout settle as transactions on Supra Mainnet.";

export const metadata: Metadata = {
  metadataBase: new URL("https://heros.cloud"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "COSMO",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

const FOOTER: { heading: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    heading: "Market",
    links: [
      { href: "/market/", label: "Live job board" },
      { href: "/market/post/", label: "Post a job" },
      { href: "/market/work/", label: "Take on work" },
      { href: "/market/providers/", label: "Pilot providers" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { href: "/assurance/", label: "Assurance" },
      { href: "/institutional/", label: "Institutional layer" },
      { href: "/evidence/execution-case-001/", label: "Evidence — execution-case-001", external: true },
      { href: "/evidence/pilot-001/", label: "Evidence — pilot-001", external: true },
      { href: "/evidence/mcp-probe-002/", label: "Evidence — mcp-probe-002", external: true },
    ],
  },
  {
    heading: "Network",
    links: [
      { href: "/compute/", label: "Compute rail" },
      { href: "/compute/bond/", label: "Provider deposit" },
      { href: "/vault/", label: "Vault" },
    ],
  },
  {
    heading: "Protocol",
    links: [
      { href: "/cosmo/", label: "$COSMO" },
      { href: "/wcosmo/", label: "wCOSMO guide" },
      { href: "/protocol/", label: "Protocol archive" },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      {/* `font-sans` must sit on the same element that defines --font-sans.
          It was previously applied to <html> only, where the variable is not
          in scope — so every non-mono string on the site rendered in the
          browser's default serif. */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-surface-0 font-sans text-ink-1 antialiased`}
      >
        <a
          href="#main"
          className="sr-only rounded-lg border border-line-strong bg-surface-2 px-4 py-2 font-mono text-sm text-ink-0 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]"
        >
          Skip to content
        </a>
        <Navigation />
        <main id="main" className="pt-16">
          {children}
        </main>
        <footer className="border-t border-line-base bg-surface-0">
          <div className="mx-auto max-w-7xl px-5 py-14 md:px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {FOOTER.map((col) => (
                <div key={col.heading}>
                  <h2 className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
                    {col.heading}
                  </h2>
                  <ul className="space-y-2.5">
                    {col.links.map((l) => (
                      <li key={l.href}>
                        {l.external ? (
                          <a
                            href={l.href}
                            className="text-sm text-ink-1 transition-colors hover:text-ink-0"
                          >
                            {l.label}
                          </a>
                        ) : (
                          <Link
                            href={l.href}
                            className="text-sm text-ink-1 transition-colors hover:text-ink-0"
                          >
                            {l.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-col gap-3 border-t border-line-subtle pt-6 md:flex-row md:items-center md:justify-between">
              <p className="font-mono text-[11px] text-ink-2">
                © 2026 COSMO — execution and settlement for agent work
              </p>
              <p className="font-mono text-[11px] text-ink-2">
                Pilot phase · curated providers · settles on Supra Mainnet
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
