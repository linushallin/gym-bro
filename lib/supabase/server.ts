import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AUTH_COOKIE_OPTIONS, supabaseEnv } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't set cookies. Safe to ignore: proxy.ts
          // refreshes the session on every request before rendering starts.
        }
      },
    },
  });
}

// Cookie-less client for checking a password without touching the caller's
// own session (re-authentication before sensitive account changes).
export function createSupabaseStatelessClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Privileged client for admin-only operations (deleting an account). Never
// import this anywhere that could run with user-controlled input unchecked.
export function createSupabaseAdminClient() {
  const { url } = supabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY must be set to delete accounts");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
