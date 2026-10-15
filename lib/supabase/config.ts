import type { CookieOptions } from "@supabase/ssr";

// Kept server-only (no NEXT_PUBLIC_ prefix): every auth call runs in Server
// Actions, Route Handlers or the proxy, so the browser never needs these.
export function supabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set (see .env.example)");
  }
  return { url, key };
}

// No browser-side Supabase client exists, so the auth cookies can be
// httpOnly — JavaScript on the page (including any injected script) can't
// read the session tokens.
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
