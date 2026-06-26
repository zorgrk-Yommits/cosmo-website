import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

const SITE_TITLE = "COSMO — Execution & Accountability Layer for the Agent Economy";
const SITE_DESCRIPTION =
  "COSMO is the execution and accountability layer for the emerging Agent Economy on Supra. Built on Supra and complementary to SupraOS (agent coordination) and SupraFX (market and liquidity rails) — not a competitor — COSMO turns autonomous intent into accountable, atomic on-chain execution. Mainnet proof of accountable execution via an RFQ-based round-trip; not permissionless yet.";

export const metadata: Metadata = {
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
      </body>
    </html>
  );
}
