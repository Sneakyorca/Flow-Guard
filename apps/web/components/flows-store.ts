"use client";
import { useSyncExternalStore } from "react";
import { demoFlows, type DemoFlow } from "@/lib/demo-data";

/**
 * Demo-mode flow list shared across routes (Monitors, Create flow, sidebar).
 * Session-only, like the Figma prototype. Replace with Supabase queries once connected.
 */
const KEY = "fg.demoFlows";
let flows: DemoFlow[] = demoFlows;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) flows = JSON.parse(raw);
  } catch {}
}

function emit() {
  try { window.sessionStorage.setItem(KEY, JSON.stringify(flows)); } catch {}
  listeners.forEach((l) => l());
}

export function useFlows(): DemoFlow[] {
  return useSyncExternalStore(
    (l) => { load(); listeners.add(l); return () => listeners.delete(l); },
    () => { load(); return flows; },
    () => demoFlows,
  );
}

export function addFlow(flow: DemoFlow) {
  flows = [...flows, flow];
  emit();
}

export function touchFlow(id: string, time = "Just now") {
  flows = flows.map((f) => (f.id === id ? { ...f, time } : f));
  emit();
}
