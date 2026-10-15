import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Integritetspolicy · Träningsdagbok" };

// Plain-language summary of how personal data is handled (GDPR art. 13).
export default function PrivacyPage() {
  return (
    <article className="space-y-5 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-muted sm:p-7">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Integritetspolicy</h1>

      <section className="space-y-1.5">
        <h2 className="font-semibold text-foreground">Vilka uppgifter vi sparar</h2>
        <p>
          Din e-postadress och ett krypterat (hashat) lösenord, samt den träningsdata du själv loggar: pass, övningar,
          vikter och repetitioner. Vi sparar inga betaluppgifter och använder inga spårnings- eller reklamcookies.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="font-semibold text-foreground">Varför</h2>
        <p>
          Uppgifterna behövs för att du ska kunna logga in och se din egen träningshistorik (avtal, GDPR art. 6.1 b).
          Vi säljer eller delar aldrig dina uppgifter med tredje part för marknadsföring.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="font-semibold text-foreground">Var de lagras</h2>
        <p>
          Hos våra underbiträden Supabase (databas och inloggning, servrar i Frankfurt, EU) och Vercel (drift av
          webbplatsen). Inloggningen använder en nödvändig sessionscookie, som inte kräver samtycke.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="font-semibold text-foreground">Dina rättigheter</h2>
        <p>
          Du kan när som helst radera ditt konto och all tillhörande data under{" "}
          <Link href="/konto" className="text-foreground underline">
            Konto
          </Link>
          . Du har även rätt att begära ut eller rätta dina uppgifter och att klaga hos Integritetsskyddsmyndigheten
          (IMY).
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="font-semibold text-foreground">Kontakt</h2>
        <p>
          Appen drivs privat av Linus, som är personuppgiftsansvarig. Kontakta mig direkt om du har frågor om dina
          uppgifter.
        </p>
      </section>
    </article>
  );
}
