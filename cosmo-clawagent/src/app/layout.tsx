import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/navigation";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CosmoClawAgent — Autonomous DeFi Intelligence",
  description:
    "The first multi-tier autonomous agent system for DeFi. Swaps, rebalancing, and $COSMO governance — all powered by AI.",
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
        <Providers>
          <Navigation />
          <main className="pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
