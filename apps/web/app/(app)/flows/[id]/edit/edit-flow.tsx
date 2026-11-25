"use client";
import Link from "next/link";
import type { FlowDetail } from "@/lib/flow-detail";
import { demoDetail } from "@/lib/demo-data";
import { useFlows } from "@/components/flows-store";
import { Builder } from "../../new/builder";

export function EditFlow({ id, live }: { id: string; live: FlowDetail | null }) {
  const flows = useFlows();
  const demo = live ? null : flows.find((f) => f.id === id);
  const d = live ?? (demo ? demoDetail(demo) : null);
  if (!d) {
    return <section className="panel empty-start"><h2>That flow isn’t in this workspace</h2><p><Link className="link" href="/monitors">Back to Monitors</Link></p></section>;
  }
  return <Builder initial={{ id: d.id, name: d.name, url: d.startUrl, viewport: d.viewport, scheduleCron: d.scheduleCron, steps: d.steps, source: d.source }} />;
}
