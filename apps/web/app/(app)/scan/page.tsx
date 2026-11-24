import type { Metadata } from "next";
import { Scanner } from "@/components/scanner";

export const metadata: Metadata = { title: "Public scans" };

export default function ScanPage() {
  return <Scanner inApp />;
}
