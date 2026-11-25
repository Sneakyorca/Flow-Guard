import { ImageResponse } from "next/og";
import { BRAND, markDataUri } from "@/lib/brand";

const SIZES = [192, 512];
export const dynamicParams = false;
export function generateStaticParams() {
  return SIZES.map((s) => ({ size: String(s) }));
}

/** PNG icons for the web manifest (installable on Android/Chrome). Maskable: the mark sits inside the safe zone. */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  const inner = Math.round(n * 0.72);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.ink }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri(inner)} width={inner} height={inner} alt="" />
      </div>
    ),
    { width: n, height: n },
  );
}
