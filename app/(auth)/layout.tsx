import Link from "next/link";
import { Dumbbell } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16 [padding-top:max(2.5rem,env(safe-area-inset-top))]">
      <Link href="/" className="mb-8 flex items-center gap-2.5 font-semibold tracking-tight">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-[0_0_24px_-4px_var(--accent)]">
          <Dumbbell size={20} strokeWidth={2.25} />
        </span>
        <span className="text-lg">Träningsdagbok</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <footer className="mt-auto pt-10 text-xs text-subtle">
        <Link href="/integritet" className="hover:text-foreground">
          Integritetspolicy
        </Link>
      </footer>
    </main>
  );
}
