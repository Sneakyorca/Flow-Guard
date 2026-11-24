import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReplay } from "@/lib/replay";
import { ReplayView } from "./replay-view";

export const metadata: Metadata = { title: "Failure replay", robots: { index: false } };

// `runId` is the run's public share token (or "482" for the sample incident).
export default async function ReplayPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const data = await getReplay(runId);
  if (!data) notFound();
  return <ReplayView data={data} shareId={runId} />;
}
