import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { NewPasswordForm } from "@/components/auth-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Nytt lösenord · Träningsdagbok" };

// Reached from the password-reset email via /auth/confirm, which signs the
// user in with a one-time recovery session first.
export default async function NewPasswordPage() {
  const user = await requireUser();

  return (
    <AuthCard title="Välj nytt lösenord" description={`För ${user.email}`}>
      <NewPasswordForm />
    </AuthCard>
  );
}
