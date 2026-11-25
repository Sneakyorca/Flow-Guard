"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";
import { Icon } from "./ui";

type Mode = "login" | "signup";

const COPY: Record<Mode, { title: string; lead: string; button: string; busy: string }> = {
  login: { title: "Log in", lead: "Your flows, runs and replays are where you left them.", button: "Log in", busy: "Logging in…" },
  signup: { title: "Create your workspace", lead: "Free while we’re in beta. No card. Add your first flow in about two minutes.", button: "Create account", busy: "Creating account…" },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") === "link" ? "That sign-in link has expired or was already used. Log in with your password instead." : "");
  const [sent, setSent] = useState(false);
  const supabase = getSupabaseBrowser();
  const c = COPY[mode];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setBusy(false);
        return setError(error.message === "Invalid login credentials" ? "That email and password don’t match an account." : error.message);
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      if (!data.session) {
        // Email confirmation is on (Supabase's default): nothing to do until they click the link.
        setBusy(false);
        return setSent(true);
      }
    }
    router.replace(next);
    router.refresh();
  }

  if (sent) {
    return (
      <div className="auth-card">
        <h1>Check your email</h1>
        <p className="lead">We sent a confirmation link to <b>{email}</b>. Open it on this device and you’ll land in your new workspace.</p>
        <p className="muted small">Nothing after a few minutes? Check spam, or <button className="link" onClick={() => setSent(false)}>try a different address</button>.</p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>{c.title}</h1>
      <p className="lead">{c.lead}</p>
      {!supabase && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <Icon name="info" />
          <span>Accounts aren’t switched on in this copy of Oluso (Supabase isn’t connected). You can still <Link className="link" href="/monitors">look around the sample workspace</Link>.</span>
        </div>
      )}
      <form onSubmit={onSubmit}>
        <label className="field">Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!supabase} />
        </label>
        <label className="field">Password
          {mode === "signup" && <span className="hint">At least 8 characters.</span>}
          <input type="password" required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} disabled={!supabase} />
        </label>
        {error && <p className="auth-error" role="alert"><Icon name="x-circle" size={14} /> {error}</p>}
        {mode === "signup" && (
          <p className="muted small" style={{ marginBottom: 12 }}>By creating an account you agree to the <Link className="link" href="/terms">Terms of Service</Link> and confirm you’ve read the <Link className="link" href="/privacy">Privacy Policy</Link>. Only add websites you own or are allowed to test.</p>
        )}
        <button type="submit" className="btn primary block" disabled={!supabase || busy}>{busy ? c.busy : c.button}</button>
      </form>
      <p className="muted small" style={{ marginTop: 16 }}>
        {mode === "login"
          ? <>New here? <Link className="link" href={`/signup${next !== "/monitors" ? `?next=${encodeURIComponent(next)}` : ""}`}>Create a free account</Link></>
          : <>Already have an account? <Link className="link" href="/login">Log in</Link></>}
      </p>
    </div>
  );
}
