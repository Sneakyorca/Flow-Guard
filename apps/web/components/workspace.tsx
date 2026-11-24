"use client";
import { useEffect, useState } from "react";

const KEY = "fg.workspaceName";
const EVENT = "fg:workspace";
const DEFAULT = "Acme Workspace";

/** Workspace display name shared by the sidebar, top bar and settings (demo: per-browser). */
export function useWorkspaceName(): [string, (name: string) => void] {
  const [name, setName] = useState(DEFAULT);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored) setName(stored);
    } catch {}
    const onChange = (e: Event) => setName((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  const update = (next: string) => {
    setName(next);
    try { window.localStorage.setItem(KEY, next); } catch {}
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  };
  return [name, update];
}
