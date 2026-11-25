"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { LiveData } from "@/lib/live";

/** Real workspace data for the signed-in user; null in demo mode. */
const LiveContext = createContext<LiveData | null>(null);

export function LiveDataProvider({ value, children }: { value: LiveData | null; children: ReactNode }) {
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveData | null {
  return useContext(LiveContext);
}
