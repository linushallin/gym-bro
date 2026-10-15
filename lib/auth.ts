import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  // How this session was established ("password", "recovery", "otp", …).
  // Used to allow setting a new password without the old one only right
  // after following a reset link.
  authMethods: string[];
};

// getClaims() verifies the access token's signature (locally against the
// project's JWKS when asymmetric signing keys are enabled, otherwise via the
// Auth server), so the result can be trusted for authorization — unlike
// getSession(), which just decodes the cookie.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    authMethods: Array.isArray(claims.amr)
      ? claims.amr.flatMap((entry: unknown) =>
          entry && typeof entry === "object" && "method" in entry && typeof entry.method === "string" ? [entry.method] : [],
        )
      : [],
  };
});

// The one gate every page and Server Action goes through before touching
// user data. proxy.ts also redirects anonymous visitors, but that's only an
// optimistic check — this is the one that counts.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  return user;
}

// Only same-origin paths, so ?next= can't be abused as an open redirect
// ("//evil.com" and "/\evil.com" are protocol-relative in browsers).
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
