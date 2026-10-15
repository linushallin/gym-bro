import { PrismaClient } from "@prisma/client";

// Supabase's pooled connection (PgBouncer, transaction mode) doesn't support
// prepared statements — without `pgbouncer=true`, concurrent queries randomly
// fail with "prepared statement ... already exists / does not exist".
// Enforced here so a misconfigured DATABASE_URL in any environment can't
// silently break the app.
//
// connection_limit>1 lets Promise.all'd queries within one request (see
// lib/queries.ts) actually run concurrently instead of queuing behind each
// other on a single connection. Kept small on purpose: every serverless
// instance gets its own pool, and the transaction pooler (port 6543)
// multiplexes all of them onto Supabase's limited real connections — that's
// what lets many concurrent users share one database.
function withPgBouncerDefaults(raw: string): string {
  const url = new URL(raw);
  if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
  return url.toString();
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(
    process.env.DATABASE_URL
      ? { datasources: { db: { url: withPgBouncerDefaults(process.env.DATABASE_URL) } } }
      : undefined,
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
