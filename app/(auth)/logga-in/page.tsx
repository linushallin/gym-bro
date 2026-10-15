import type { Metadata } from "next";
import Link from "next/link";
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
  );
}
