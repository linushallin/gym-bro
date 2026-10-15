import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Glömt lösenord · Träningsdagbok" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Glömt lösenordet?"
      description="Ange din e-post så skickar vi en länk där du kan välja ett nytt."
      footer={
        <Link href="/logga-in" className="font-medium text-foreground hover:underline">
          Tillbaka till inloggning
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
