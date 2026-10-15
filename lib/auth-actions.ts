"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, safeNextPath } from "@/lib/auth";
import { ensureStarterCatalog } from "@/lib/starter-catalog";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  createSupabaseStatelessClient,
} from "@/lib/supabase/server";
import {
  type AuthFormState,
  ChangePasswordSchema,
  DeleteAccountSchema,
  ForgotPasswordSchema,
  LogInSchema,
  NewPasswordSchema,
  SignUpSchema,
} from "@/lib/auth-schemas";

function fieldErrors(error: z.ZodError): AuthFormState {
  return { fieldErrors: z.flattenError(error).fieldErrors };
}

// Supabase's own messages are English and sometimes too revealing; map the
// codes we expect and fall back to something generic for the rest.
function friendlyAuthError(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Fel e-post eller lösenord.";
    case "email_not_confirmed":
      return "Du behöver bekräfta din e-postadress först. Kolla inkorgen (och skräpposten).";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "För många försök. Vänta en stund och försök igen.";
    case "weak_password":
      return "Lösenordet är för svagt eller har förekommit i en dataläcka. Välj ett annat.";
    case "same_password":
      return "Det nya lösenordet måste skilja sig från det gamla.";
    case "signup_disabled":
      return "Registrering är tillfälligt avstängd.";
    default:
      console.error("Supabase auth error", error.code, error.message);
      return "Något gick fel. Försök igen om en stund.";
  }
}

// Where email links should point back to. Next.js already rejects Server
// Action POSTs whose Origin doesn't match the host, so this is the app's own
// origin; Supabase additionally only redirects to its configured allow-list.
async function appOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${h.get("host")}`;
}

// Re-authentication before sensitive account changes. Uses a cookie-less
// client so the caller's own session is untouched, and revokes the extra
// session the check creates. Returns a form error, or null if the password
// is correct.
async function verifyCurrentPassword(email: string, password: string): Promise<AuthFormState | null> {
  const client = createSupabaseStatelessClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return error.code === "invalid_credentials"
      ? { fieldErrors: { currentPassword: ["Fel lösenord."] } }
      : { error: friendlyAuthError(error) };
  }
  await client.auth.signOut({ scope: "local" });
  return null;
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = SignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...fieldErrors(parsed.error), email: String(formData.get("email") ?? "") };
  const { email, password } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await appOrigin()}/auth/confirm` },
  });
  if (error) return { error: friendlyAuthError(error), email };

  // Only happens if "Confirm email" is turned off in Supabase.
  if (data.session && data.user) {
    await ensureStarterCatalog(data.user.id);
    redirect("/");
  }

  // Same response whether or not the address was already registered —
  // Supabase deliberately doesn't tell us, so accounts can't be enumerated.
  return {
    success: `Vi har skickat en bekräftelselänk till ${email}. Klicka på den för att aktivera kontot.`,
    email,
  };
}

export async function logIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = LogInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...fieldErrors(parsed.error), email: String(formData.get("email") ?? "") };
  const { email, password } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendlyAuthError(error), email };

  redirect(safeNextPath(formData.get("next")));
}

export async function logOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/logga-in");
}

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = ForgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...fieldErrors(parsed.error), email: String(formData.get("email") ?? "") };
  const { email } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await appOrigin()}/auth/confirm?next=/nytt-losenord`,
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { error: friendlyAuthError(error), email };
  }
  if (error) console.error("Password reset failed", error.code, error.message);

  // Never reveal whether the address has an account.
  return {
    success: `Om det finns ett konto för ${email} har vi skickat en länk för att välja nytt lösenord.`,
    email,
  };
}

// Final step of "forgot password": the user arrives here signed in via the
// emailed recovery link and picks a new password without knowing the old one.
export async function setNewPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await requireUser();
  // A normal password session must use changePassword (which asks for the
  // current password) — otherwise a stolen session cookie could take over
  // the account by resetting the password.
  if (!user.authMethods.some((m) => m === "recovery" || m === "otp")) {
    return { error: "Länken har gått ut. Begär en ny under ”Glömt lösenord”." };
  }

  const parsed = NewPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: friendlyAuthError(error) };

  await supabase.auth.signOut({ scope: "others" });
  redirect("/");
}

export async function changePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await requireUser();
  const parsed = ChangePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  const wrongPassword = await verifyCurrentPassword(user.email, parsed.data.currentPassword);
  if (wrongPassword) return wrongPassword;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: friendlyAuthError(error) };

  // Log out every other device — the usual reason to change a password.
  await supabase.auth.signOut({ scope: "others" });
  return { success: "Lösenordet är uppdaterat. Andra enheter har loggats ut." };
}

// GDPR right to erasure: removes all workout data and the auth account itself.
export async function deleteAccount(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await requireUser();

  const parsed = DeleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  const wrongPassword = await verifyCurrentPassword(user.email, parsed.data.currentPassword);
  if (wrongPassword) return wrongPassword;

  // Sessions cascade to entries and sets; exercises cascade to any entries left.
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.exercise.deleteMany({ where: { userId: user.id } }),
  ]);

  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Account deletion failed", error.code, error.message);
    return { error: "Din träningsdata är raderad, men kontot kunde inte tas bort. Försök igen." };
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/logga-in?raderat=1");
}
