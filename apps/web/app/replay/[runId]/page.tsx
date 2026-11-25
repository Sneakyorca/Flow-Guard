import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AppShell, Wordmark } from "@/components/shell";
import { ToastProvider } from "@/components/toast";
import { LandingFooter } from "@/components/scanner";
import { getLiveData } from "@/lib/live";
import { getReplay } from "@/lib/replay";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ReplayView } from "./replay-view";

const replay = cache(getReplay);

export async function generateMetadata({ params }: { params: Promise<{ runId: string }> }): Promise<Metadata> {
  const { runId } = await params;
  const data = await replay(runId);
  if (!data) return { title: "Replay not found", robots: { index: false } };
  const verb = data.status === "FAILED" ? "failed" : "passed";
  const title = `${data.flowName} ${verb} on ${data.domain}`;
  const description = data.status === "FAILED" ? `${data.summaryTitle}. Watch the recording, the failing step and the errors.` : data.summaryBody;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** The flow id when the signed-in user owns this run (RLS hides other people's runs). */
async function ownedFlowId(token: string): Promise<string | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.from("flow_runs").select("flow_id").eq("public_share_token", token).maybeSingle();
  return (data?.flow_id as string | undefined) ?? null;
}

// `runId` is the run's public share token (or "482" for the sample incident).
// Owner → full workspace shell. Anyone else with the link → a minimal public page.
// Demo mode (no Supabase) → the sample workspace shell, so the walkthrough stays in one place.
export default async function ReplayPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const data = await replay(runId);
  if (!data) notFound();

  const live = await getLiveData();
  const configured = (await getSupabaseServer()) !== null;
  if (!configured) {
    return <AppShell live={null}><ReplayView data={data} shareId={runId} mode="demo" /></AppShell>;
  }
  const flowId = live && data.source === "live" ? await ownedFlowId(runId) : null;
  if (live && flowId) {
    return <AppShell live={live}><ReplayView data={data} shareId={runId} mode="owner" flowId={flowId} /></AppShell>;
  }

  return (
    <ToastProvider>
      <header className="landing-top">
        <Link href="/" aria-label="FlowGuard home"><Wordmark beta={false} /></Link>
        <nav style={{ display: "flex", gap: 8 }}>
          {live ? <Link className="btn" href="/monitors">Your monitors</Link> : <Link className="btn ghost" href="/login">Log in</Link>}
        </nav>
      </header>
      <main className="public-replay">
        <p className="public-note">
          {data.source === "demo" ? "A sample failure, so you can see what a FlowGuard replay looks like." : "Someone shared this FlowGuard run with you. You can see this one run and nothing else from their account."}
        </p>
        <ReplayView data={data} shareId={runId} mode="public" />
        <section className="cta-band" aria-labelledby="cta-h">
          <div>
            <h2 id="cta-h">Get a recording like this when your own site breaks</h2>
            <p>FlowGuard opens your signup, login or checkout in a real browser every hour. Free while in beta, no card.</p>
          </div>
          <Link className="btn accent lg" href={live ? "/flows/new" : "/signup"}>Monitor your own site free</Link>
        </section>
      </main>
      <LandingFooter />
    </ToastProvider>
  );
}
