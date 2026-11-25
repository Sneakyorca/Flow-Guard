import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/env";

// Workspace pages that need a signed-in user. /, /scan and /replay/[token] stay public.
const PROTECTED = ["/monitors", "/flows", "/alerts", "/settings"];
const AUTH_PAGES = ["/login", "/signup"];

/**
 * Runs before every page request (Next.js 16 "proxy", formerly middleware):
 * refreshes the Supabase session cookie and sends signed-out visitors to /login.
 * In demo mode (no Supabase env vars) it does nothing, so the sample dashboard stays open.
 */
export async function proxy(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.next();

  // If /auth/callback isn't in Supabase's Redirect URLs, confirmation links fall back to the
  // Site URL ("/?code=..."). Finish the sign-in anyway instead of dropping the code.
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const under = (list: string[]) => list.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && under(PROTECTED)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (user && under(AUTH_PAGES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/monitors";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|webm|ico|woff2?)$).*)"],
};
