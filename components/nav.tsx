"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, LayoutGrid, LineChart, Plus } from "lucide-react";

const LINKS = [
  { href: "/", label: "Översikt", icon: LayoutGrid },
  { href: "/trender", label: "Trender", icon: LineChart },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-md [padding-top:env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-[0_0_20px_-4px_var(--accent)]">
            <Dumbbell size={18} strokeWidth={2.25} />
          </span>
          <span className="hidden sm:inline">Träningsdagbok</span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors sm:h-9 ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
          <Link
            href="/logga"
            className="ml-1 flex h-11 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-foreground shadow-[0_0_20px_-6px_var(--accent)] transition-colors hover:bg-accent-hover sm:h-9"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Logga</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
