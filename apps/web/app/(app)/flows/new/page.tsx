import type { Metadata } from "next";
import { Builder } from "./builder";

export const metadata: Metadata = { title: "Create critical flow" };

export default function NewFlowPage() {
  return <Builder />;
}
