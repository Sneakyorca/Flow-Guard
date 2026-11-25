import type { Metadata, Viewport } from "next";
// Self-hosted fonts: no request to Google, works on slow or offline connections.
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { BRAND, siteUrl } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  applicationName: "FlowGuard",
  title: { default: "FlowGuard: is your checkout working right now?", template: "%s · FlowGuard" },
  description: BRAND.description,
  openGraph: { siteName: "FlowGuard", type: "website", locale: "en_GB", title: "FlowGuard: is your checkout working right now?", description: BRAND.description },
  twitter: { card: "summary_large_image", title: "FlowGuard: is your checkout working right now?", description: BRAND.description },
  appleWebApp: { title: "FlowGuard", statusBarStyle: "default" },
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
