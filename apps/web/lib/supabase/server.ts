import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

/** Cookie-aware server client for the signed-in user, or null in demo mode. */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there; the proxy refreshes them.
        }
      },
    },
  });
}

/** True when a user is signed in (false in demo mode or when signed out). */
export async function isSignedIn(): Promise<boolean> {
  const supabase = await getSupabaseServer();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user);
}

/** Service-role client for server-only tasks (signing replay URLs). Null if not configured. */
export function getSupabaseAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseConfigured || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
