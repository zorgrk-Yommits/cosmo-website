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

export const metadata: Metadata = {
  title: "COSMO — Autonomous DeFi Intelligence",
  description:
    "COSMO is the on-chain settlement layer for the SupraOS agent economy. An eight-agent swarm is the plan; the settlement layer is live on Supra Mainnet today.",
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
