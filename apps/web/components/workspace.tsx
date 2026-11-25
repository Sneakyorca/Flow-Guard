"use client";
import { useEffect, useState } from "react";
import { DEFAULT_WORKSPACE as DEFAULT } from "@/lib/demo-data";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useLive } from "./live-data";

const KEY = "fg.workspaceName";
const EVENT = "fg:workspace";
let saveTimer: number | undefined;

/**
 * Workspace display name shared by the sidebar, top bar and settings.
 * Signed in: starts from the database and saves back to `workspaces.name`.
 * Demo: kept per-browser in localStorage.
 */
export function useWorkspaceName(): [string, (name: string) => void] {
  const live = useLive();
  const [name, setName] = useState(live?.workspace.name ?? DEFAULT);
  useEffect(() => {
    if (!live) {
      try {
        const stored = window.localStorage.getItem(KEY);
        if (stored) setName(stored);
      } catch {}
    }
    const onChange = (e: Event) => setName((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [live]);
  const update = (next: string) => {
    setName(next);
    if (live?.workspace.id) {
      // The settings field calls this on every keystroke; save once typing pauses.
      const id = live.workspace.id;
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        if (next.trim()) void getSupabaseBrowser()?.from("workspaces").update({ name: next.trim() }).eq("id", id);
      }, 600);
    } else {
      try { window.localStorage.setItem(KEY, next); } catch {}
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  };
  return [name, update];
}
