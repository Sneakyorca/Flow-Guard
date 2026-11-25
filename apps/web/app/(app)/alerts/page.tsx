import type { Metadata } from "next";
import { Preferences } from "@/components/preferences";
import { getAlertSettings } from "@/lib/alert-settings-server";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  return <Preferences view="alerts" settings={await getAlertSettings()} />;
}
