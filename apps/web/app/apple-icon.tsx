import { ImageResponse } from "next/og";
import { BRAND, markDataUri } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon: the mark on a full-bleed ink square (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.ink }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri(180)} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
