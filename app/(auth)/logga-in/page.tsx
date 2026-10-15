import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { LogInForm } from "@/components/auth-forms";
import { safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Logga in · Träningsdagbok" };

const NOTICES: Record<string, { tone: "error" | "info"; text: string }> = {
  lank: { tone: "error", text: "Länken är ogiltig eller har gått ut. Försök igen." },
  raderat: { tone: "info", text: "Ditt konto och all din data har raderats." },
};

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fel?: string; raderat?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ? safeNextPath(params.next) : undefined;
  const notice = params.fel === "lank" ? NOTICES.lank : params.raderat ? NOTICES.raderat : null;

  return (
    <>
      <AuthCard
        title="Logga in"
        description="Välkommen tillbaka. Dags att lyfta."
        footer={
          <>
            Inget konto?{" "}
            <Link href="/registrera" className="font-medium text-foreground hover:underline">
              Skapa ett gratis
            </Link>
          </>
        }
      >
        {notice && (
          <p
            className={`mb-4 rounded-lg border p-3 text-sm ${
              notice.tone === "error" ? "border-critical/30 bg-critical/10 text-critical" : "border-border bg-background text-muted"
            }`}
          >
            {notice.text}
          </p>
        )}
        <LogInForm next={next} />
      </AuthCard>

      {/* iOS gives home-screen web apps their own storage, separate from Safari,
          so a login made in the browser doesn't carry over. */}
      <div className="mt-6 flex gap-3 rounded-xl border border-border bg-surface/60 p-4 text-xs leading-relaxed text-muted">
        <Smartphone size={16} className="mt-0.5 shrink-0 text-subtle" aria-hidden />
        <div className="space-y-2">
          <p>
            <span className="font-medium text-foreground">Tips: lägg till appen på hemskärmen.</span> Då öppnas den i
            helskärm som en vanlig app, direkt från en ikon.
          </p>
          <ul className="space-y-1">
            <li>
              <span className="text-foreground">iPhone:</span> öppna sidan i Safari, tryck på Dela-knappen och välj
              ”Lägg till på hemskärmen”.
            </li>
            <li>
              <span className="text-foreground">Android:</span> öppna sidan i Chrome, tryck på menyn (⋮) och välj
              ”Installera app” eller ”Lägg till på startskärmen”.
            </li>
          </ul>
          <p>
            Du förblir inloggad tills du loggar ut. Första gången du öppnar appen från hemskärmen kan du behöva logga in
            en gång till, eftersom den sparar inloggningen separat från webbläsaren.
          </p>
        </div>
      </div>
    </>
  );
}
