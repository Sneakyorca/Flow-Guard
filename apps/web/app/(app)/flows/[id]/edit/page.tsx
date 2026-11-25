import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFlowDetail } from "@/lib/flow-detail-server";
import { EditFlow } from "./edit-flow";

export const metadata: Metadata = { title: "Edit flow", robots: { index: false } };

export default async function EditFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getFlowDetail(id);
  if (!detail) notFound();
  return <EditFlow id={id} live={detail === "demo" ? null : detail} />;
}
