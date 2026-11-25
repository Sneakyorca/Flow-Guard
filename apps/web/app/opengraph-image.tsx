import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "Oluso: is your checkout working right now?";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Default share card (landing page and any page without its own). */
export default async function Image() {
  // A month of sample results: one bad day near the end. Shows what the product does at a glance.
  const days = Array.from({ length: 30 }, (_, i) => (i === 24 ? "bad" : i === 11 ? "warn" : "ok"));
  return new ImageResponse(
    (
      <OgFrame footer="Free to start · runs every hour in a real browser">
        <div style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 960 }}>{BRAND.tagline}</div>
        <div style={{ marginTop: 22, fontSize: 30, color: BRAND.muted, lineHeight: 1.35, maxWidth: 940 }}>
          Plain-English checks for your signup, login and checkout. When one breaks, you get the video.
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 40, height: 40 }}>
          {days.map((d, i) => (
            <div key={i} style={{ width: 22, height: d === "bad" ? 40 : 34, marginTop: d === "bad" ? 0 : 6, borderRadius: 3, background: d === "bad" ? BRAND.bad : d === "warn" ? BRAND.warn : "#7bb196" }} />
          ))}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
