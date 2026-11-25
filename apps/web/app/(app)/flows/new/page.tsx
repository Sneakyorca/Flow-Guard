import type { Metadata } from "next";
import { Builder } from "./builder";

export const metadata: Metadata = { title: "New flow" };

export default function NewFlowPage() {
  return <Builder />;
}
