import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth";
import { ensureStarterCatalog } from "@/lib/starter-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Landing point for every link Supabase emails (sign-up confirmation and
// password reset). Exchanges the one-time token for a session cookie, then
// sends the user on to `next`.
//
// Two link formats are accepted:
// - ?token_hash=…&type=… — from email templates edited to point here (see
//   README). Works even if the link is opened on another device.
// - ?code=… — from Supabase's default templates (PKCE). Only works in the
//   browser the request was made from.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const next = safeNextPath(params.get("next"));

  const supabase = await createSupabaseServerClient();

  let userId: string | undefined;
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) userId = data.user?.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id;
  }

  if (!userId) redirect("/logga-in?fel=lank");

  await ensureStarterCatalog(userId);
  redirect(next);
}
