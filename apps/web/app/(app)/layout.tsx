import { AppShell } from "@/components/shell";
import { getLiveData } from "@/lib/live";

// Signed in (Supabase connected): the shell gets the user's real workspace, flows and runs.
// Demo mode: `live` is null and every page shows the sample workspace.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const live = await getLiveData();
  return <AppShell live={live}>{children}</AppShell>;
}
