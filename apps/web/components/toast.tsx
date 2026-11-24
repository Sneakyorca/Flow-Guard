"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "./ui";

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 4000);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div role="status" className="toast">
          <Icon name="check" size={18} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast("")}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
