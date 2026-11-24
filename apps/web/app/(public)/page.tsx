import Link from "next/link";
import { Scanner } from "@/components/scanner";
import { Icon } from "@/components/ui";

// Public landing page: the free scanner, without the workspace sidebar.
export default function LandingPage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-icon"><Icon name="shield" size={23} /></span>FlowGuard</Link>
        <Link className="btn" href="/monitors">Open dashboard <Icon name="arrow" size={15} /></Link>
      </header>
      <main className="main-content">
        <Scanner />
      </main>
    </div>
  );
}
