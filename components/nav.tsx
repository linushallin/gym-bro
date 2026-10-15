"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, Dumbbell, LayoutGrid, LineChart, Plus, Scale, type LucideIcon } from "lucide-react";

type NavLink = { href: string; label: string; icon: LucideIcon; matches?: string[] };

const LINKS: NavLink[] = [
  { href: "/", label: "Översikt", icon: LayoutGrid, matches: ["/muskel", "/ovning"] },
  { href: "/trender", label: "Trender", icon: LineChart },
  { href: "/vikt", label: "Vikt", icon: Scale },
  { href: "/konto", label: "Konto", icon: CircleUser },
];
// Starting or continuing a workout counts as being in the "Logga" tab.
const LOG_MATCHES = ["/logga", "/pass"];

function isActive(pathname: string, href: string, matches: string[] = []) {
  if (href === "/" ? pathname === "/" : pathname.startsWith(href)) return true;
  return matches.some((m) => pathname.startsWith(m));
}

export function Nav() {
  const pathname = usePathname();
  const logActive = LOG_MATCHES.some((m) => pathname.startsWith(m));

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-md [padding-top:env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:h-auto sm:px-6 sm:py-2.5">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-[0_0_20px_-4px_var(--accent)] sm:h-9 sm:w-9">
              <Dumbbell size={17} strokeWidth={2.25} />
            </span>
            <span>Träningsdagbok</span>
          </Link>

          {/* Desktop/tablet: inline links. Phones use the tab bar below. */}
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href, link.matches);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                    active ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/logga"
              className="ml-1 flex h-9 items-center gap-1.5 rounded-lg bg-good px-3.5 text-sm font-semibold text-accent-foreground shadow-[0_0_20px_-6px_var(--accent)] transition-colors hover:brightness-105"
            >
              <Plus size={16} strokeWidth={2.5} />
              Logga
            </Link>
          </nav>
        </div>
      </header>

      {/* Phone tab bar: thumb-reachable, labelled, with the primary action in the middle. */}
      <nav
        aria-label="Huvudmeny"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 backdrop-blur-md [padding-bottom:env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-1">
          {LINKS.slice(0, 2).map((link) => (
            <TabLink key={link.href} link={link} active={isActive(pathname, link.href, link.matches)} />
          ))}
          <Link
            href="/logga"
            aria-current={logActive ? "page" : undefined}
            className="flex flex-col items-center gap-1 text-[11px] font-medium text-good"
          >
            <span className="flex h-10 w-12 items-center justify-center rounded-2xl bg-good text-accent-foreground shadow-[0_0_20px_-6px_var(--good)] transition-transform active:scale-95">
              <Plus size={22} strokeWidth={2.5} />
            </span>
            <span className="sr-only">Logga pass</span>
          </Link>
          {LINKS.slice(2).map((link) => (
            <TabLink key={link.href} link={link} active={isActive(pathname, link.href, link.matches)} />
          ))}
        </div>
      </nav>
    </>
  );
}

function TabLink({ link, active }: { link: NavLink; active: boolean }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:opacity-70 ${
        active ? "text-accent" : "text-subtle"
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.25 : 2} />
      {link.label}
    </Link>
  );
}
