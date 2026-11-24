import type { Metadata } from "next";
import { Preferences } from "@/components/preferences";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <Preferences view="settings" />;
}
