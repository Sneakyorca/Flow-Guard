import type { Metadata, Viewport } from "next";
// Self-hosted fonts: no request to Google, works on slow or offline connections.
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { BRAND, siteUrl } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  applicationName: "Oluso",
  title: { default: "Oluso: is your checkout working right now?", template: "%s · Oluso" },
  description: BRAND.description,
  openGraph: { siteName: "Oluso", type: "website", locale: "en_GB", title: "Oluso: is your checkout working right now?", description: BRAND.description },
  twitter: { card: "summary_large_image", title: "Oluso: is your checkout working right now?", description: BRAND.description },
  appleWebApp: { title: "Oluso", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#141310" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
