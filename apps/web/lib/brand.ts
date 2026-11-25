/** Brand constants shared by icons, the web manifest and Open Graph images. */
export const BRAND = {
  name: "FlowGuard",
  tagline: "Is your checkout working right now?",
  description: "FlowGuard runs your signup, login and checkout in a real browser every hour and sends you the recording when something breaks.",
  paper: "#f6f5f1",
  ink: "#17160f",
  muted: "#6b685e",
  line: "#e3e0d6",
  accent: "#e4572e",
  ok: "#1f7a4d",
  bad: "#c8262f",
  warn: "#9a6700",
  darkBg: "#141310",
};

/** The app icon as an SVG string (same drawing as app/icon.svg), for generated PNGs. */
export function markSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${BRAND.ink}"/><path d="M8.5 21.5 15 11l7.5 7" fill="none" stroke="${BRAND.paper}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="21.5" r="2.6" fill="${BRAND.paper}"/><circle cx="15" cy="11" r="2.6" fill="${BRAND.paper}"/><circle cx="22.5" cy="18" r="4" fill="${BRAND.accent}" stroke="${BRAND.ink}" stroke-width="1.5"/></svg>`;
}

export const markDataUri = (size: number) => `data:image/svg+xml;base64,${Buffer.from(markSvg(size)).toString("base64")}`;

/** Absolute site URL for metadata and share cards. */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:3000");
}
