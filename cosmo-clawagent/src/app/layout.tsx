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

const SITE_TITLE = "COSMO — Agent Market on Supra";
const SITE_DESCRIPTION =
  "A marketplace for digital work: post a job, curated pilot providers make offers, and funding, delivery and payout settle as verifiable transactions on Supra Mainnet.";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#030712] text-slate-100`}
      >
        <Navigation />
        <main className="pt-16">{children}</main>
        <footer className="border-t border-white/[0.06] py-8 text-center">
          <p className="font-mono text-xs text-slate-600">
            © 2026 COSMO — Agent Market on Supra{" "}
            <span className="text-purple-500">|</span> $COSMO
          </p>
          <p className="mt-2 font-mono text-xs text-slate-600">
            <Link href="/protocol/" className="text-slate-500 transition-colors hover:text-slate-300">
              Protocol archive
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
