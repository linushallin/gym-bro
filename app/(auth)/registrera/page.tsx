import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { SignUpForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Skapa konto · Träningsdagbok" };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Skapa konto"
      description="Logga dina pass, följ din utveckling och slå personbästa."
      footer={
        <>
          Har du redan ett konto?{" "}
          <Link href="/logga-in" className="font-medium text-foreground hover:underline">
            Logga in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
