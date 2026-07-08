import { PrismaClient } from "@prisma/client";

// Supabase's pooled connection (PgBouncer, transaction mode) doesn't support
// prepared statements — without these params, concurrent queries randomly
// fail with "prepared statement ... already exists / does not exist".
// Enforced here so a misconfigured DATABASE_URL in any environment can't
// silently break the app.
function withPgBouncerDefaults(raw: string): string {
  const url = new URL(raw);
  if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
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
