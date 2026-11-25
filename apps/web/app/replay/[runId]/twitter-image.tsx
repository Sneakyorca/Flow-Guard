import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";
import { getReplay } from "@/lib/replay";

export const alt = "Oluso run replay";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Share card for /replay/[token]: what failed, where, and the step timeline. */
export default async function Image({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const data = await getReplay(runId);
  const fonts = await ogFonts();
  if (!data) {
    return new ImageResponse(<OgFrame footer="Run replay"><div style={{ fontSize: 60, fontWeight: 600 }}>This replay link doesn’t work</div></OgFrame>, { ...size, fonts });
  }
  const failed = data.status === "FAILED";
  const tone = failed ? BRAND.bad : BRAND.ok;
  const title = data.summaryTitle.length > 90 ? `${data.summaryTitle.slice(0, 87)}…` : data.summaryTitle;
  return new ImageResponse(
    (
      <OgFrame footer={`Run replay · ${data.domain}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: tone, fontWeight: 600 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: tone }} />
          {failed ? "Failed" : "Passed"}
          <span style={{ color: BRAND.muted, fontWeight: 400, fontFamily: "PlexMono", fontSize: 24, marginLeft: 8 }}>{data.domain}</span>
        </div>
        <div style={{ marginTop: 18, fontSize: 58, fontWeight: 600, lineHeight: 1.1, letterSpacing: -1.2, maxWidth: 1040 }}>{data.flowName}</div>
        <div style={{ marginTop: 16, fontSize: 30, color: BRAND.ink, opacity: 0.8, lineHeight: 1.3, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 34 }}>
          {data.steps.slice(0, 12).map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: 23, fontSize: 22, fontWeight: 600, color: s.status === "skipped" ? BRAND.muted : "#fff", background: s.status === "failed" ? BRAND.bad : s.status === "passed" ? BRAND.ok : BRAND.line }}>
              {i + 1}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", marginLeft: 10, fontSize: 24, color: BRAND.muted }}>{data.steps.length} steps · video, console and network log</div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
