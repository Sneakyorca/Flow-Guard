import { LandingFooter, Scanner } from "@/components/scanner";
import { PublicHeader } from "@/components/public-header";
import { ToastProvider } from "@/components/toast";

// Public landing page: the free scanner, without the workspace sidebar.
export default function LandingPage() {
  return (
    <ToastProvider>
      <PublicHeader />
      <main style={{ padding: "0 24px" }}>
        <Scanner />
      </main>
      <LandingFooter />
    </ToastProvider>
  );
}
