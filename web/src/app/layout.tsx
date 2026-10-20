import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { useFixtures } from "@/lib/config";
import { Providers } from "@/lib/wallet";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "TrueUp: bets between friends, settled on BOT Chain", template: "%s · TrueUp" },
  description:
    "A two-outcome prediction pool for your group chat. Everyone stakes the same BOT, the creator calls the result, and the winners split the pot on-chain.",
};

export const viewport: Viewport = { themeColor: "#2b2216", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap" />
      </head>
      <body>
        {useFixtures && <p className="fixture-notice">Fixture data for layout checks. Nothing here is on-chain.</p>}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
