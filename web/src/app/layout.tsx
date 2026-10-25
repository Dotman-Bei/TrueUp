import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { useFixtures } from "@/lib/config";
import { Providers } from "@/lib/wallet";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const description =
  "TrueUp is a two-outcome prediction pool for your group chat. Everyone stakes the same BOT, the creator calls the result, and the winners split the pot on BOT Chain.";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  applicationName: "TrueUp",
  title: { default: "TrueUp · Bets between friends on BOT Chain", template: "%s · TrueUp" },
  description,
  openGraph: { type: "website", siteName: "TrueUp", title: "TrueUp", description, url: site },
  twitter: { card: "summary", title: "TrueUp", description },
};

/** Structured data so crawlers and checkers read the product's name and what it is. */
const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "TrueUp",
  url: site,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description,
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      </head>
      <body>
        {useFixtures && <p className="fixture-notice">Fixture data for layout checks. Nothing here is on-chain.</p>}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
