import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "./shell";

/** Plain page around the login/sign-up card: wordmark, the card, one line of reassurance. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <header className="landing-top">
        <Link href="/" aria-label="FlowGuard home"><Wordmark beta={false} /></Link>
        <Link className="btn ghost" href="/">Free site scan</Link>
      </header>
      <main className="auth-main">
        {children}
        <p className="auth-aside">FlowGuard opens your signup, login and checkout in a real browser every hour, and sends you the recording when one breaks.</p>
      </main>
    </div>
  );
}
