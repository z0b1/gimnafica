import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Without this, pg silently falls back to localhost:5432 and the error in
  // production logs ("Can't reach database server at 127.0.0.1") hides the cause.
  // Thrown on import, so a deploy with a missing URL fails at build time.
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL nije postavljen ili je prazan. Lokalno ga upišite u .env, a na Vercelu u Settings → Environment Variables.",
    );
  }
  // DATABASE_SCHEMA (optional) runs the app against a non-public schema, e.g. a
  // throwaway preview. Raw SQL then also needs `options=-c search_path=<schema>`
  // in DATABASE_URL.
  const adapter = new PrismaPg(
    { connectionString: process.env.DATABASE_URL! },
    { schema: process.env.DATABASE_SCHEMA || undefined },
  );
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in dev.
export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
