import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { ChangePasswordForm, DeleteAccountForm } from "@/components/auth-forms";
import { logOut } from "@/lib/auth-actions";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Konto · Träningsdagbok" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Konto</h1>
        <p className="mt-1 text-sm text-muted">Inloggad som {user.email}</p>
      </div>

      <form action={logOut}>
        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold transition-colors hover:bg-surface-hover"
        >
          <LogOut size={16} />
          Logga ut
        </button>
      </form>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold tracking-tight">Byt lösenord</h2>
        <ChangePasswordForm />
      </section>

      <section className="rounded-xl border border-critical/25 bg-surface p-5">
        <h2 className="font-semibold tracking-tight text-critical">Radera konto</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Tar bort ditt konto och alla loggade pass, övningar och set. Det går inte att ångra.
        </p>
        <DeleteAccountForm />
      </section>

      <p className="text-center text-xs text-subtle">
        <Link href="/integritet" className="hover:text-foreground">
          Integritetspolicy
        </Link>
      </p>
    </div>
  );
}
