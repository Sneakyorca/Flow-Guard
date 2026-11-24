import type { Metadata } from "next";
import { Preferences } from "@/components/preferences";

export const metadata: Metadata = { title: "Alerts & integrations" };

export default function AlertsPage() {
  return <Preferences view="alerts" />;
}
