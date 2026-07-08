import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Träningsdagbok",
  description: "Din personliga träningsdagbok — logga pass, följ trender och personbästa.",
  appleWebApp: {
    capable: true,
    title: "Träning",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07080c",
  viewportFit: "cover",
};

// Every page reads live data straight from the DB and changes on every log
// action — never prerender statically (that would need DB access at build
// time and would bake in stale data).
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-10 sm:px-6 sm:py-8 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          {children}
        </main>
      </body>
    </html>
  );
}
