import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_OPTIONS, supabaseEnv } from "@/lib/supabase/config";

// Reachable without an account.
const PUBLIC_PATHS = ["/logga-in", "/registrera", "/glomt-losenord", "/integritet", "/auth/"];
// Pointless once logged in — bounce to the overview instead.
const GUEST_ONLY_PATHS = ["/logga-in", "/registrera", "/glomt-losenord"];

const matches = (path: string, list: string[]) =>
  list.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p));

// Two jobs, both cheap (no DB access):
// 1. Refresh the Supabase session cookie before it expires, so Server
//    Components (which can't write cookies) always see a valid token.
// 2. Optimistically redirect anonymous visitors to the login page. The real
//    authorization check is requireUser() in lib/auth.ts, run by every page
//    and Server Action — this just gives a nicer redirect.
export async function proxy(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Must run before anything else touches the response — it may rotate the
  // session cookies via setAll above.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!isLoggedIn && !matches(path, PUBLIC_PATHS)) {
    const loginUrl = new URL("/logga-in", request.url);
    if (path !== "/") loginUrl.searchParams.set("next", path + request.nextUrl.search);
    return redirectKeepingCookies(loginUrl, response);
  }

  if (isLoggedIn && matches(path, GUEST_ONLY_PATHS)) {
    return redirectKeepingCookies(new URL("/", request.url), response);
  }

  return response;
}

function redirectKeepingCookies(to: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(to);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Skip static assets and the PWA metadata routes, which must load
  // without a session (the browser fetches them without cookies).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)"],
};
