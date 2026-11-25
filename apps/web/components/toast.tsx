"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "./ui";

export type ToastTone = "ok" | "bad" | "info";
type Notify = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<Notify>(() => {});
const ICON: Record<ToastTone, string> = { ok: "check-circle", bad: "x-circle", info: "info" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const notify = useCallback<Notify>((message, tone = "ok") => {
    setToast({ message, tone });
    window.clearTimeout(timer.current);
    // Longer messages (and failures) stay up longer.
    timer.current = window.setTimeout(() => setToast(null), tone === "bad" || message.length > 90 ? 8000 : 4500);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div role="status" aria-live="polite" className="toast-region">
        {toast && (
          <div className={`toast ${toast.tone}`}>
            <Icon name={ICON[toast.tone]} size={16} />
            <span>{toast.message}</span>
            <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
