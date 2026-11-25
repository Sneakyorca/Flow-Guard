import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFlowDetail } from "@/lib/flow-detail-server";
import { FlowView } from "./flow-view";


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await getFlowDetail(id);
  return { title: detail && detail !== "demo" ? detail.name : "Flow", robots: { index: false } };
}

// Live: the flow and its runs come from Supabase (RLS-scoped). Demo: the client builds the
// view from the sample workspace, which can include flows added in this browser session.
export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getFlowDetail(id);
  if (!detail) notFound();
  return <FlowView id={id} live={detail === "demo" ? null : detail} />;
}
