import type { Metadata } from "next";
import { getTrendsData } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { DEFAULT_WEEKS, PERIODS, TrendsView } from "@/components/trends-view";

export const metadata: Metadata = { title: "Trender · Träningsdagbok" };

export default async function TrenderPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await requireUser();
  const { period: periodParam } = await searchParams;
  const period = PERIODS.find((p) => String(p.weeks) === periodParam) ?? PERIODS.find((p) => p.weeks === DEFAULT_WEEKS)!;

  const data = await getTrendsData(user.id, period.weeks);
  return <TrendsView period={period} data={data} />;
}
