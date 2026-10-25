import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Display family for UI/headings; mono family for numerals (scores).
// Mirrors the mobile app's Space Grotesk + IBM Plex Mono pairing.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const DESCRIPTION =
  "A free, fan-made companion for Riftbound: keep score at the table, then keep every match — the format, each game's score, how the points came in, and the deck you played.";

export const metadata: Metadata = {
  metadataBase: new URL("https://riftlog.net"),
  title: {
    default: "Riftlog — Your Riftbound match companion",
    template: "%s — Riftlog",
  },
  description: DESCRIPTION,
  applicationName: "Riftlog",
  openGraph: {
    type: "website",
    siteName: "Riftlog",
    url: "/",
    locale: "en_US",
    title: "Riftlog — Your Riftbound match companion",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Riftlog — Your Riftbound match companion",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1b2a", // token: background
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full`}
    >
      <head>
        {/* Without JS the scroll reveals never run, so show everything. */}
        <noscript>
          <style>{`[data-reveal],[data-reveal-child]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-full flex-col bg-background text-ink-primary">
        {children}
        {/* Cookieless page-view counts (see /privacy). */}
        <Analytics />
      </body>
    </html>
  );
}
