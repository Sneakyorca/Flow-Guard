import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND, markDataUri } from "./brand";

export const OG_SIZE = { width: 1200, height: 630 };

/** IBM Plex, self-hosted (OFL). Read from apps/web/assets/fonts. */
export async function ogFonts() {
  const dir = join(process.cwd(), "assets/fonts");
  const [regular, semibold, mono] = await Promise.all([
    readFile(join(dir, "ibm-plex-sans-latin-400-normal.woff")),
    readFile(join(dir, "ibm-plex-sans-latin-600-normal.woff")),
    readFile(join(dir, "ibm-plex-mono-latin-500-normal.woff")),
  ]);
  return [
    { name: "Plex", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Plex", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "PlexMono", data: mono, weight: 500 as const, style: "normal" as const },
  ];
}

/** Frame every share card uses: paper background, wordmark top-left, footer line. */
export function OgFrame({ children, footer }: { children: React.ReactNode; footer: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BRAND.paper, color: BRAND.ink, fontFamily: "Plex", padding: "64px 72px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri(56)} width={56} height={56} alt="" />
        <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>{BRAND.name}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${BRAND.line}`, paddingTop: 22, fontSize: 24, color: BRAND.muted }}>
        <span>{footer}</span>
        <span style={{ display: "flex", width: 72, height: 8, borderRadius: 4, background: BRAND.accent }} />
      </div>
    </div>
  );
}
